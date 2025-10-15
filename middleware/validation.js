const { body, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const validateProduct = [
  body('name').notEmpty().withMessage('Le nom est requis'),
  body('category').notEmpty().withMessage('La catégorie est requise'),
  body('purchase_price').isFloat({ min: 0 }).withMessage('Le prix d\'achat doit être un nombre positif'),
  body('selling_price').isFloat({ min: 0 }).withMessage('Le prix de vente doit être un nombre positif'),
  body('stock').isInt({ min: 0 }).withMessage('Le stock doit être un entier positif'),
  body('discount').isFloat({ min: 0, max: 100 }).withMessage('La remise doit être entre 0 et 100'),
  body('image_urls').isArray().withMessage('Les URLs des images doivent être un tableau'),
  handleValidationErrors
];

const validateSale = [
  body('customer_name').notEmpty().withMessage('Le nom du client est requis'),
  body('items').isArray({ min: 1 }).withMessage('Au moins un article est requis'),
  body('payment_method').notEmpty().withMessage('La méthode de paiement est requise'),
  handleValidationErrors
];

const validateUser = [
  body('email').isEmail().withMessage('Email invalide'),
  body('password').isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères'),
  body('name').notEmpty().withMessage('Le nom est requis'),
  body('role').isIn(['admin', 'seller']).withMessage('Rôle invalide'),
  body('phone').optional().isLength({ min: 10 }).withMessage('Numéro de téléphone invalide'),
  body('nif').optional().isLength({ min: 9 }).withMessage('NIF invalide'),
  body('passport_number').optional().isLength({ min: 6 }).withMessage('Numéro de passeport invalide'),
  body('emergency_contact_phone').optional().isLength({ min: 10 }).withMessage('Téléphone d\'urgence invalide'),
  handleValidationErrors
];

module.exports = {
  validateProduct,
  validateSale,
  validateUser,
  handleValidationErrors
};