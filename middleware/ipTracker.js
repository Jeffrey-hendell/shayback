const getClientIp = (req) => {
  // Plusieurs headers à vérifier pour obtenir l'IP réelle
  return req.headers['x-forwarded-for'] || 
         req.headers['x-real-ip'] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         '0.0.0.0';
};

const ipTracker = (req, res, next) => {
  req.clientIp = getClientIp(req);
  next();
};

module.exports = ipTracker;