const express = require('express');
const router = express.Router();
const exportController = require('../controllers/exportController');
const { auth, adminAuth } = require('../middleware/auth');

router.use(auth, adminAuth);

// Export Excel
router.get('/excel/sales', exportController.exportSalesExcel);
router.get('/excel/products', exportController.exportSalesExcel);
router.get('/excel/sellers', exportController.exportSalesExcel);
router.get('/excel/full', exportController.exportFullReport);

// Export PDF
router.get('/pdf/sales', exportController.exportSalesPDF);
router.get('/pdf/products', exportController.exportSalesPDF);
router.get('/pdf/sellers', exportController.exportSalesPDF);

module.exports = router;