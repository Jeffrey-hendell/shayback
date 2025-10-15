const LoginHistory = require('../models/LoginHistory');

class SecurityTracker {
  async trackLogin(user, loginInfo, success, suspiciousReasons = []) {
    try {
      await LoginHistory.create({
        user_id: user.id,
        ip_address: loginInfo.ip,
        user_agent: loginInfo.userAgent,
        location: loginInfo.location,
        device_type: this.extractDeviceType(loginInfo.userAgent),
        success: success,
        suspicious_reasons: suspiciousReasons.length > 0 ? suspiciousReasons : null
      });
    } catch (error) {
      console.error('Erreur tracking connexion:', error);
    }
  }

  extractDeviceType(userAgent) {
    if (!userAgent) return 'unknown';
    
    const ua = userAgent.toLowerCase();
    
    if (ua.includes('mobile')) {
      return 'mobile';
    } else if (ua.includes('tablet')) {
      return 'tablet';
    } else if (ua.includes('windows')) {
      return 'windows';
    } else if (ua.includes('mac')) {
      return 'mac';
    } else if (ua.includes('linux')) {
      return 'linux';
    } else {
      return 'desktop';
    }
  }

  async getUserLoginHistory(userId) {
    return await LoginHistory.findByUserId(userId);
  }

  async getSuspiciousActivities(days = 7) {
    return await LoginHistory.getSuspiciousLogins(days);
  }

  async isIpBlacklisted(ip) {
    // Implémentez votre logique de liste noire
    const blacklistedIps = [
      '185.165.190.100', // Exemple d'IP blacklistée
      '192.168.100.50'   // Exemple interne
    ];
    
    return blacklistedIps.includes(ip);
  }
}

module.exports = new SecurityTracker();