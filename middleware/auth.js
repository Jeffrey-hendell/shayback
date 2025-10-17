const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Token d\'accès manquant' });
    }

    // console.log('🔐 Token reçu:', token);
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // console.log('📄 Token décodé:', decoded);
    
    const user = await User.findById(decoded.userId);
    // console.log('👤 Utilisateur trouvé:', user);
    
    if (!user) {
      // console.log('❌ Utilisateur non trouvé avec ID:', decoded.userId);
      return res.status(401).json({ error: 'Utilisateur non trouvé' });
    }

    // Vérifier si l'utilisateur est actif (sauf pour l'admin)
    if (user.role !== 'admin' && !user.is_active) {
      return res.status(401).json({ error: 'Votre compte a été désactivé. Contactez l\'administrateur.' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('❌ Erreur auth middleware:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token invalide' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expiré' });
    }
    res.status(401).json({ error: 'Erreur d\'authentification' });
  }
};

const adminAuth = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
    }
    next();
  } catch (error) {
    res.status(403).json({ error: 'Accès non autorisé' });
  }
};

const sellerAuth = async (req, res, next) => {
  try {
    if (req.user.role !== 'seller' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Accès réservé aux vendeurs' });
    }
    next();
  } catch (error) {
    res.status(403).json({ error: 'Accès non autorisé' });
  }
};

// Middleware pour vérifier si un vendeur est actif
const activeSellerAuth = async (req, res, next) => {
  try {
    if (req.user.role === 'seller' && !req.user.is_active) {
      return res.status(403).json({ error: 'Votre compte vendeur est désactivé' });
    }
    next();
  } catch (error) {
    res.status(403).json({ error: 'Erreur de vérification du statut vendeur' });
  }
};

module.exports = { auth, adminAuth, sellerAuth, activeSellerAuth };