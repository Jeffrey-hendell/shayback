const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const reportController = require('../controllers/reportController');
const { auth, adminAuth } = require('../middleware/auth');
const { validateUser } = require('../middleware/validation');
const statsController = require('../controllers/statsController');
const saleController = require('../controllers/saleController');
const exportRoutes = require('./export');
 
// Toutes les routes admin nécessitent une authentification admin
router.use(auth, adminAuth);

// Gestion des vendeurs
router.post('/sellers', validateUser, adminController.createSeller);
router.get('/sellers', adminController.getAllSellers);
router.get('/sellers/:id', adminController.getSellerDetails);
router.put('/sellers/:id', adminController.updateSeller);
router.patch('/sellers/:id/status', adminController.toggleSellerStatus);


router.get('/stats/sellers/performance', statsController.getSellerStats); // NOUVELLE ROUTE

// Gestion des ventes (admin)
router.get('/sales/:id', saleController.getSaleDetails); // NOUVELLE ROUTE
router.put('/sales/:id', saleController.updateSale); // NOUVELLE ROUTE
router.delete('/sales/:id', saleController.deleteSale); // NOUVELLE ROUTE
router.use('/export', exportRoutes);


// Statistiques
router.get('/stats/:period', statsController.getSalesStats);
router.get('/stats/sellers/performance', statsController.getSellerStats);
router.get('/stats/categories', statsController.getCategoryStats);

// Statistiques et rapports

router.get('/stats/:period', reportController.getSalesStats);
router.get('/export/excel', reportController.exportSalesToExcel);
router.get('/export/dashboard', adminController.exportDashboardExcel);

module.exports = router;