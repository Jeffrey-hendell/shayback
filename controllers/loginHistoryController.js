const LoginHistory = require('../models/LoginHistory');

class LoginHistoryController {
  async getUserLoginHistory(req, res) {
    try {
      const { userId } = req.params;
      
      // Vérifier que l'utilisateur demande ses propres données ou est admin
      if (req.user.id !== parseInt(userId) && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Accès non autorisé' });
      }
      const history = await LoginHistory.findByUserId(userId);
      
      res.json({
        message: 'Historique de connexion récupéré',
        history,
        total: history.length
      });
    } catch (error) {
      console.error('Erreur historique connexion:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération de l\'historique' });
    }
  }

  async getAllLoginHistory(req, res) {
    try {
      const { limit = 100 } = req.query;
      const history = await LoginHistory.getAllHistory(parseInt(limit));
      
      res.json({
        message: 'Historique complet des connexions',
        history,
        total: history.length
      });
    } catch (error) {
      console.error('Erreur historique complet:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération de l\'historique complet' });
    }
  }

  async getFailedLogins(req, res) {
    try {
      const { limit = 50 } = req.query;
      const failedLogins = await LoginHistory.getFailedLogins(parseInt(limit));
      
      res.json({
        message: 'Connexions échouées',
        failedLogins,
        total: failedLogins.length
      });
    } catch (error) {
      console.error('Erreur connexions échouées:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération des connexions échouées' });
    }
  }

  async getRecentActivity(req, res) {
    try {
      const { hours = 24 } = req.query;
      const recentLogins = await LoginHistory.getRecentLogins(parseInt(hours));
      
      // Statistiques
      const stats = {
        total: recentLogins.length,
        successful: recentLogins.filter(login => login.success).length,
        failed: recentLogins.filter(login => !login.success).length,
        byDevice: this.groupByDevice(recentLogins),
        byHour: this.groupByHour(recentLogins)
      };
      
      res.json({
        message: `Activité récente (${hours}h)`,
        recentLogins,
        stats
      });
    } catch (error) {
      console.error('Erreur activité récente:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération de l\'activité récente' });
    }
  }

  groupByDevice(logins) {
    return logins.reduce((acc, login) => {
      const device = login.device_type || 'Inconnu';
      acc[device] = (acc[device] || 0) + 1;
      return acc;
    }, {});
  }

  groupByHour(logins) {
    return logins.reduce((acc, login) => {
      const hour = new Date(login.login_at).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {});
  }
}

module.exports = new LoginHistoryController();