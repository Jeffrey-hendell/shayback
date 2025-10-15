const express = require('express');
const router = express.Router();
const emailService = require('../utils/emailService');

// Route de test pour les emails
router.get('/test-email', async (req, res) => {
  try {
    console.log('🧪 Début du test email...');
    
    // Test de configuration
    const configOk = await emailService.testEmailConfiguration();
    
    if (!configOk) {
      return res.status(500).json({
        success: false,
        message: 'Configuration email invalide'
      });
    }

    // Test d'envoi d'email
    const testSaleData = {
      invoice_number: 'TEST-123',
      customer_name: 'Client Test',
      customer_email: 'test@client.com',
      customer_phone: '+123456789',
      total_amount: 99.99,
      items: [
        {
          name: 'Produit Test',
          quantity: 1,
          unit_price: 99.99,
          subtotal: 99.99
        }
      ],
      seller_name: 'Vendeur Test',
      seller_email: 'vendeur@test.com',
      payment_method: 'cash'
    };

    await emailService.sendSaleNotification(testSaleData);
    
    res.json({
      success: true,
      message: 'Test email réussi - Vérifiez votre boîte de réception'
    });
    
  } catch (error) {
    console.error('❌ Erreur test email:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du test email',
      error: error.message
    });
  }
});

module.exports = router;