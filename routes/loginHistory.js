const express = require('express');
const router = express.Router();
const loginHistoryController = require('../controllers/loginHistoryController');
const { auth, adminAuth } = require('../middleware/auth');

// Routes accessibles à tous les utilisateurs authentifiés
router.get('/my-history', auth, (req, res) => {
  // Rediriger vers l'historique de l'utilisateur connecté
  req.params.userId = req.user.id;
  loginHistoryController.getUserLoginHistory(req, res);
});

router.get('/user/:userId', auth, loginHistoryController.getUserLoginHistory);

// Routes admin seulement
router.get('/all', auth, adminAuth, loginHistoryController.getAllLoginHistory);
router.get('/failed', auth, adminAuth, loginHistoryController.getFailedLogins);
router.get('/recent', auth, adminAuth, loginHistoryController.getRecentActivity);

module.exports = router;