const express = require('express');
const router = express.Router();
const saleController = require('../controllers/saleController');
const { auth, sellerAuth, activeSellerAuth, adminAuth } = require('../middleware/auth');
const { validateSale } = require('../middleware/validation');

router.use(auth);

// Routes vendeur
router.post('/', sellerAuth, activeSellerAuth, validateSale, saleController.createSale);
router.get('/my-sales', sellerAuth, activeSellerAuth, saleController.getSellerSales);
router.get('/my-sales/stats', sellerAuth, activeSellerAuth, saleController.getSalesStats);
router.get('/search', sellerAuth, activeSellerAuth, saleController.searchSales);
router.get('/:id', sellerAuth, activeSellerAuth, saleController.getSaleById);
router.get('/sales/:id', saleController.getSaleDetails); // NOUVELLE ROUTE
router.get('/:id/invoice', sellerAuth, activeSellerAuth, saleController.generateInvoice);

// Routes admin seulement
router.get('/', adminAuth, saleController.getAllSales);
router.get('/admin/stats', adminAuth, saleController.getSalesStats);
router.get('/admin/search', adminAuth, saleController.searchSales);
router.delete('/:id/cancel', adminAuth, saleController.cancelSale);

module.exports = router;