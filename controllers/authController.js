const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const emailService = require('../utils/emailService');
const LoginHistory = require('../models/LoginHistory');

class AuthController {
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // console.log('🔐 Tentative de connexion pour:', email);

      const user = await User.findByEmail(email);
      
      // Préparer les données pour l'historique
      const loginData = {
        user_id: user ? user.id : null,
        ip_address: req.clientIp,
        user_agent: req.get('User-Agent'),
        device_type: this.extractDeviceInfo(req.get('User-Agent')),
        success: false
      };

      if (!user) {
        // console.log('❌ Utilisateur non trouvé:', email);
        loginData.failure_reason = 'Utilisateur non trouvé';
        await LoginHistory.create(loginData);
        return res.status(401).json({ error: 'Identifiants invalides' });
      }

      if (!user.is_active) {
        // console.log('❌ Compte désactivé:', email);
        loginData.failure_reason = 'Compte désactivé';
        await LoginHistory.create(loginData);
        return res.status(401).json({ error: 'Votre compte a été désactivé' });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        // console.log('❌ Mot de passe incorrect pour:', email);
        loginData.user_id = user.id;
        loginData.failure_reason = 'Mot de passe incorrect';
        await LoginHistory.create(loginData);
        return res.status(401).json({ error: 'Identifiants invalides' });
      }

      // Connexion réussie
      // console.log('✅ Connexion réussie pour:', email);
      loginData.success = true;
      loginData.failure_reason = null;
      await LoginHistory.create(loginData);

      // Vérifier que user.id existe
      // console.log('👤 Données utilisateur:', { 
      //   id: user.id, 
      //   email: user.email, 
      //   name: user.name,
      //   role: user.role 
      // });

      if (!user.id) {
        throw new Error('ID utilisateur manquant');
      }

      const token = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );

      // console.log('🎫 Token généré pour user ID:', user.id);

      // Préparer les informations de connexion pour l'email
      const loginInfo = {
        ip: req.clientIp,
        userAgent: req.get('User-Agent'),
        device_type: loginData.device_type,
        timestamp: new Date()
      };
 
      // console.log('🧾 IP détectée:', req.clientIp);

      // Envoyer une notification uniquement pour les vendeurs
      if (user.role === 'seller' || 'asdmin') {
        await emailService.sendSellerLoginNotification(user, loginInfo);
      }

      // Détection de connexion suspecte
      const suspiciousCheck = await this.checkSuspiciousActivity(user, loginInfo);
      if (suspiciousCheck.isSuspicious) {
        await emailService.sendSuspiciousLoginAlert(user, {
          ...loginInfo,
          reason: suspiciousCheck.reason
        });
      }

      res.json({
        message: 'Connexion réussie',
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      });
    } catch (error) {
      console.error('❌ Erreur connexion:', error);
      res.status(500).json({ error: 'Erreur lors de la connexion' });
    }
  }

  // Méthode utilitaire pour extraire les infos de l'appareil
  extractDeviceInfo(userAgent) {
    if (!userAgent) return 'Inconnu';
    
    if (userAgent.includes('Mobile')) {
      return 'Mobile';
    } else if (userAgent.includes('Tablet')) {
      return 'Tablette';
    } else {
      return 'Ordinateur';
    }
  }

  // Méthode pour vérifier les activités suspectes
  async checkSuspiciousActivity(user, loginInfo) {
    try {
      const currentHour = new Date().getHours();
      
      // Connexion entre 22h et 6h considérée comme suspecte
      if (currentHour < 6 || currentHour > 22) {
        return {
          isSuspicious: true,
          reason: 'Connexion à une heure inhabituelle'
        };
      }

      // Vérifier les connexions récentes (dernières 24h)
      const recentLogins = await LoginHistory.findRecentByUserId(user.id, 24);
      
      if (recentLogins.length > 0) {
        const lastLogin = recentLogins[0];
        const differentDevice = lastLogin.device_type !== loginInfo.device_type;
        
        if (differentDevice) {
          return {
            isSuspicious: true,
            reason: 'Connexion depuis un nouvel appareil'
          };
        }
      }

      return { isSuspicious: false, reason: null };
    } catch (error) {
      console.error('Erreur vérification activité suspecte:', error);
      return { isSuspicious: false, reason: null };
    }
  }

  async getProfile(req, res) {
    try {
      res.json({
        user: {
          id: req.user.id,
          email: req.user.email,
          name: req.user.name,
          role: req.user.role,
          profile_picture: req.user.profile_picture
        }
      });
    } catch (error) {
      console.error('Erreur profil:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération du profil' });
    }
  }

  async register(req, res) {
    try {
      const { email, password, name, role } = req.body;
      
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: 'Cet email est déjà utilisé' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      
      const userData = {
        email,
        password: hashedPassword,
        name,
        role,
        created_by: req.user.id
      };

      const user = await User.create(userData);
      
      res.status(201).json({
        message: 'Utilisateur créé avec succès',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Erreur création utilisateur:', error);
      res.status(500).json({ error: 'Erreur lors de la création de l\'utilisateur' });
    }
  }
}

module.exports = new AuthController();