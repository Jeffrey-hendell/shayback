const User = require('../models/User');
const bcrypt = require('bcryptjs');
const ExcelGenerator = require('../utils/excelGenerator');
const pool = require('../config/database');

class AdminController {
  async createSeller(req, res) {
    try {
      const { 
        email, 
        password, 
        name, 
        phone, 
        nif, 
        passport_number, 
        profile_picture, 
        emergency_contact_name, 
        emergency_contact_phone, 
        address 
      } = req.body;

      // Validation des champs obligatoires
      if (!email || !password || !name) {
        return res.status(400).json({ error: 'L\'email, le mot de passe et le nom sont obligatoires' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
      }

      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: 'Cet email est déjà utilisé' });
      }

      // Hasher le mot de passe
      const hashedPassword = await bcrypt.hash(password, 10);

      const userData = {
        email,
        password: hashedPassword,
        name,
        role: 'seller',
        created_by: req.user.id,
        phone: phone || null,
        nif: nif || null,
        passport_number: passport_number || null,
        profile_picture: profile_picture || null,
        emergency_contact_name: emergency_contact_name || null,
        emergency_contact_phone: emergency_contact_phone || null,
        address: address || null
      };

      const user = await User.create(userData);
      
      // Retirer le mot de passe de la réponse
      const { password: _, ...userWithoutPassword } = user;
      
      res.status(201).json({
        message: 'Vendeur créé avec succès',
        user: userWithoutPassword
      });
    } catch (error) {
      console.error('Erreur création vendeur:', error);
      
      // Gestion des erreurs de contrainte unique
      if (error.code === '23505') {
        if (error.constraint === 'users_email_key') {
          return res.status(400).json({ error: 'Cet email est déjà utilisé' });
        }
        if (error.constraint === 'users_nif_key') {
          return res.status(400).json({ error: 'Ce NIF est déjà utilisé' });
        }
        if (error.constraint === 'users_passport_number_key') {
          return res.status(400).json({ error: 'Ce numéro de passeport est déjà utilisé' });
        }
      }
      
      res.status(500).json({ error: 'Erreur lors de la création du vendeur' });
    }
  }

    async updateSeller(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Vérifier que l'utilisateur existe et est un vendeur
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ error: 'Utttilisateur non trouvé' });
      }

      if (user.role !== 'seller') {
        return res.status(400).json({ error: 'Cet utilisateur n\'est pas un vendeur' });
      }

      // Si le mot de passe est fourni, le hasher
      if (updates.password) {
        updates.password = await bcrypt.hash(updates.password, 10);
      }

      const updatedUser = await User.update(id, updates);
      
      res.json({
        message: 'Vendeur modifié avec succès',
        user: updatedUser
      });
    } catch (error) {
      console.error('Erreur modification vendeur:', error);
      res.status(500).json({ error: 'Erreur lors de la modification du vendeur' });
    }
  }

  async toggleSellerStatus(req, res) {
    try {
      const { id } = req.params;
      const { is_active } = req.body;

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }

      if (user.role !== 'seller') {
        return res.status(400).json({ error: 'Cet utilisateur n\'est pas un vendeur' });
      }

      const updatedUser = await User.updateStatus(id, is_active);
      
      // Retirer le mot de passe de la réponse
      const { password: _, ...userWithoutPassword } = updatedUser;

      res.json({
        message: `Vendeur ${is_active ? 'activé' : 'désactivé'} avec succès`,
        user: userWithoutPassword
      });
    } catch (error) {
      console.error('Erreur mise à jour statut vendeur:', error);
      res.status(500).json({ error: 'Erreur lors de la mise à jour du vendeur' });
    }
  }

  async getAllSellers(req, res) {
    try {
      const sellers = await User.getAllSellers();
      res.json({ 
        message: `${sellers.length} vendeur(s) trouvé(s)`,
        sellers 
      });
    } catch (error) {
      console.error('Erreur récupération vendeurs:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération des vendeurs' });
    }
  }

  async getSellerDetails(req, res) {
    try {
      const { id } = req.params;
      const user = await User.findById(id);
      
      if (!user || user.role !== 'seller') {
        return res.status(404).json({ error: 'Vendeur non trouvé' });
      }

      // Retirer le mot de passe de la réponse
      const { password, ...sellerData } = user;
      
      res.json({ 
        message: 'Détails du vendeur récupérés',
        seller: sellerData 
      });
    } catch (error) {
      console.error('Erreur détails vendeur:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération des détails du vendeur' });
    }
  }

    async exportDashboardExcel(req, res) {
    try {
      // Récupérer toutes les données pour le dashboard
      const [salesStats, sellerPerformance] = await Promise.all([
        this.getSalesStats('month'), // Période par défaut
        this.getSellerPerformance()
      ]);

      const dashboardData = {
        ...salesStats,
        ...sellerPerformance
      };

      await ExcelGenerator.generateDashboardReport(dashboardData, res);
    } catch (error) {
      console.error('Erreur export dashboard:', error);
      res.status(500).json({ error: 'Erreur lors de l\'export du dashboard' });
    }
  }

    async exportSalesToExcel(req, res) {
    try {
      const sales = await Sale.findAll();
      await ExcelGenerator.generateSalesReport(sales, res);
    } catch (error) {
      console.error('Erreur export ventes:', error);
      res.status(500).json({ error: 'Erreur lors de l\'export des ventes' });
    }
  }
}

module.exports = new AdminController();