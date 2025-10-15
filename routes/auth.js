const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { auth } = require('../middleware/auth');
const { validateUser, handleValidationErrors } = require('../middleware/validation');

router.post('/login', authController.login.bind(authController));

router.post('/register', auth, validateUser, authController.register.bind(authController));
router.get('/profile', auth, authController.getProfile.bind(authController));

module.exports = router;