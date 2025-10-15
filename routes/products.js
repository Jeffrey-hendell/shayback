const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { auth, adminAuth } = require('../middleware/auth');
const { validateProduct } = require('../middleware/validation');

router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProduct);

// Routes admin seulement
router.post('/', auth, adminAuth, validateProduct, productController.createProduct);
router.put('/:id', auth, adminAuth, validateProduct, productController.updateProduct);
router.patch('/:id/status', auth, adminAuth, productController.toggleProductStatus);
router.delete('/:id', auth, adminAuth, productController.deleteProduct);

module.exports = router;