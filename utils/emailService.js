// utils/emailService.js
const brevo = require('@getbrevo/brevo');
const moment = require('moment');

class EmailService {
  constructor() {
    // Configuration pour la nouvelle version de Brevo
    this.apiKey = process.env.BREVO_API_KEY;
    
    if (!this.apiKey) {
      console.error('❌ BREVO_API_KEY manquante dans les variables d\'environnement');
      return;
    }
    
    // Initialisation correcte pour la nouvelle API Brevo
    this.apiInstance = new brevo.TransactionalEmailsApi();
    
    // Configuration de l'authentification
    this.apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, this.apiKey);
    
    console.log('✅ Service Brevo initialisé');
  }

  /**
   * Envoie une notification de vente
   */
  async sendSaleNotification(saleData) {
    try {

      const { invoice_number, customer_name, customer_email, total_amount, items, seller_name, created_at, payment_method } = saleData;
      
      // Validation des données requises
      if (!process.env.BREVO_SENDER_EMAIL || !process.env.ADMIN_EMAIL) {
        throw new Error('Configuration email manquante');
      }

      const itemsList = items.map(item => 
        `<tr>
          <td style="padding: 12px; border-bottom: 1px solid #e0e0e0;">${item.name}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: center;">${item.quantity}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: right;">${item.unit_price} GDS</td>
          <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: right;">${item.subtotal} GDS</td>
        </tr>`
      ).join('');

      // Création de l'objet email
      const sendSmtpEmail = {
        sender: {
          email: process.env.BREVO_SENDER_EMAIL,
          name: process.env.BREVO_SENDER_NAME || 'JHY Solutions'
        },
        to: [{
          email: process.env.ADMIN_EMAIL,
          name: 'Administrateur'
        }],
        subject: `Nouvelle vente - Facture ${invoice_number}`,
        htmlContent: this.generateEmailTemplate(saleData, itemsList),
        tags: ['vente', 'notification', 'facture']
      };

      
      // Envoi de l'email
      const data = await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      return data;
      
    } catch (error) {
      console.error('❌ Erreur détaillée Brevo:');
      
      if (error.response) {
        console.error('📡 Response error:', {
          status: error.response.status,
          statusText: error.response.statusText,
          body: error.response.body,
          headers: error.response.headers
        });
      } else if (error.message) {
        console.error('💬 Error message:', error.message);
      } else {
        console.error('🔧 Unknown error:', error);
      }
      
      throw new Error(`Erreur envoi email: ${error.message}`);
    }
  }

  /**
   * Génère le template HTML pour l'email de vente
   */
  generateEmailTemplate(saleData, itemsList) {
    const { invoice_number, customer_name, customer_email, total_amount, seller_name, created_at, payment_method } = saleData;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #f8fafc;
            margin: 0;
            padding: 0;
          }
          
          .email-container {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          }
          
          .email-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #ffffff;
            padding: 40px 30px;
            text-align: center;
          }
          
          .email-header h1 {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 8px;
            letter-spacing: -0.5px;
          }
          
          .email-header p {
            font-size: 16px;
            font-weight: 400;
            opacity: 0.9;
          }
          
          .email-body {
            padding: 40px 30px;
          }
          
          .section {
            margin-bottom: 30px;
          }
          
          .section-title {
            font-size: 18px;
            font-weight: 600;
            color: #2d3748;
            margin-bottom: 16px;
            padding-bottom: 8px;
            border-bottom: 2px solid #e2e8f0;
          }
          
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 24px;
          }
          
          .info-card {
            background: #f7fafc;
            padding: 20px;
            border-left: 4px solid #667eea;
          }
          
          .info-card h3 {
            font-size: 14px;
            font-weight: 600;
            color: #4a5568;
            margin-bottom: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .info-item {
            margin-bottom: 8px;
            display: flex;
            justify-content: space-between;
          }
          
          .info-label {
            font-weight: 500;
            color: #718096;
          }
          
          .info-value {
            font-weight: 600;
            color: #2d3748;
          }
          
          .items-table {
            width: 100%;
            border-collapse: collapse;
            background: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }
          
          .items-table th {
            background: #f7fafc;
            padding: 16px 12px;
            text-align: left;
            font-weight: 600;
            color: #4a5568;
            border-bottom: 2px solid #e2e8f0;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .items-table td {
            padding: 16px 12px;
            border-bottom: 1px solid #e2e8f0;
          }
          
          .text-center {
            text-align: center;
          }
          
          .text-right {
            text-align: right;
          }
          
          .total-amount {
            background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
            color: #ffffff;
            padding: 24px;
            border-radius: 8px;
            text-align: center;
            margin: 24px 0;
          }
          
          .total-label {
            font-size: 14px;
            font-weight: 500;
            opacity: 0.9;
            margin-bottom: 4px;
          }
          
          .total-value {
            font-size: 32px;
            font-weight: 700;
            letter-spacing: -0.5px;
          }
          
          .wisdom-section {
            background: #fffaf0;
            border-left: 4px solid #ed8936;
            padding: 20px;
            border-radius: 8px;
            margin: 24px 0;
          }
          
          .wisdom-title {
            font-weight: 600;
            color: #dd6b20;
            margin-bottom: 8px;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .wisdom-content {
            color: #744210;
            font-style: italic;
            line-height: 1.5;
          }
          
          .email-footer {
            background: #2d3748;
            color: #ffffff;
            padding: 30px;
            text-align: center;
            border-radius: 0 0 12px 12px;
          }
          
          .company-name {
            font-size: 20px;
            font-weight: 700;
            margin-bottom: 8px;
          }
          
          .company-tagline {
            font-size: 14px;
            opacity: 0.8;
            margin-bottom: 16px;
          }
          
          .contact-info {
            font-size: 12px;
            opacity: 0.7;
            margin-bottom: 8px;
          }
          
          .auto-notice {
            font-size: 11px;
            opacity: 0.6;
            margin-top: 16px;
          }
          
          @media (max-width: 600px) {
            .email-body {
              padding: 24px 20px;
            }
            
            .info-grid {
              grid-template-columns: 1fr;
              gap: 16px;
            }
            
            .email-header {
              padding: 30px 20px;
            }
            
            .email-header h1 {
              font-size: 24px;
            }
            
            .total-value {
              font-size: 28px;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="email-header">
            <h1>NOUVELLE VENTE EFFECTUÉE</h1>
            <p>Shay Solutions - Système de Gestion Commerciale</p>
          </div>
          
          <div class="email-body">
            <div class="section">
              <h2 class="section-title">Détails de la Transaction</h2>
              
              <div class="info-grid">
                <div class="info-card">
                  <h3>Informations Client</h3>
                  <div class="info-item">
                    <span class="info-label">Nom:</span>
                    <span class="info-value">${customer_name}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Email:</span>
                    <span class="info-value">${customer_email || 'Non fourni'}</span>
                  </div>
                </div>
                
                <div class="info-card">
                  <h3>Informations Vente</h3>
                  <div class="info-item">
                    <span class="info-label">Facture:</span>
                    <span class="info-value">${invoice_number}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Vendeur:</span>
                    <span class="info-value">${seller_name}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Date:</span>
                    <span class="info-value">${moment(created_at).format('DD/MM/YYYY à HH:mm')}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Paiement:</span>
                    <span class="info-value">${(payment_method || 'Non spécifié').toUpperCase()}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="section">
              <h2 class="section-title">Articles Vendus</h2>
              <table class="items-table">
                <thead>
                  <tr>
                    <th>Produit</th>
                    <th class="text-center">Quantité</th>
                    <th class="text-right">Prix Unitaire</th>
                    <th class="text-right">Sous-total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsList}
                </tbody>
              </table>
            </div>
            
            <div class="total-amount">
              <div class="total-label">MONTANT TOTAL</div>
              <div class="total-value">${total_amount} GDS</div>
            </div>

          </div>
          
          <div class="email-footer">
            <div class="company-name">SHAY SOLUTIONS</div>
            <div class="company-tagline">Votre partenaire de confiance pour la gestion commerciale</div>
            <div class="contact-info">
              ${process.env.ADMIN_EMAIL || 'contact@jhysolutions.com'} • www.shaysolutions.com
            </div>
            <div class="auto-notice">
              Cet email a été généré automatiquement par le système de vente JHY Solutions
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Envoie un email de bienvenue au vendeur
   */
  async sendWelcomeSeller(sellerData) {
    try {
      const { email, name, password } = sellerData;
      
      const sendSmtpEmail = {
        sender: {
          email: process.env.BREVO_SENDER_EMAIL,
          name: process.env.BREVO_SENDER_NAME || 'JHY Solutions'
        },
        to: [{
          email: email,
          name: name
        }],
        subject: 'Bienvenue sur notre plateforme de vente',
        htmlContent: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { 
                font-family: 'Inter', Arial, sans-serif; 
                background: #f8fafc; 
                margin: 0; 
                padding: 0; 
              }
              .container { 
                max-width: 600px; 
                margin: 0 auto; 
                background: #ffffff; 
                border-radius: 12px; 
                overflow: hidden; 
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); 
              }
              .header { 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                color: white; 
                padding: 40px; 
                text-align: center; 
              }
              .content { 
                padding: 40px; 
                background: #ffffff; 
              }
              .welcome-title { 
                font-size: 28px; 
                font-weight: 700; 
                color: #2d3748; 
                margin-bottom: 16px; 
              }
              .info-card { 
                background: #f7fafc; 
                padding: 24px; 
                border-radius: 8px; 
                border-left: 4px solid #48bb78; 
                margin: 20px 0; 
              }
              .warning { 
                background: #fed7d7; 
                color: #c53030; 
                padding: 16px; 
                border-radius: 6px; 
                border-left: 4px solid #e53e3e; 
                margin: 20px 0; 
                font-weight: 600; 
              }
              .footer { 
                background: #2d3748; 
                color: #ffffff; 
                padding: 30px; 
                text-align: center; 
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Bienvenue ${name}</h1>
                <p>Plateforme de Gestion Commerciale</p>
              </div>
              <div class="content">
                <div class="welcome-title">Votre compte vendeur a été créé</div>
                <p>Nous sommes ravis de vous accueillir sur notre plateforme de vente.</p>
                
                <div class="info-card">
                  <strong>Email:</strong> ${email}<br>
                  <strong>Mot de passe temporaire:</strong> ${password}
                </div>
                
                <div class="warning">
                  Veuillez changer votre mot de passe après votre première connexion.
                </div>
                
                <p>Vous pouvez maintenant vous connecter à notre système de vente et commencer à gérer vos transactions.</p>
              </div>
              <div class="footer">
                <div style="font-size: 18px; font-weight: 700; margin-bottom: 8px;">JHY SOLUTIONS</div>
                <div style="font-size: 14px; opacity: 0.8;">Votre succès, notre priorité</div>
              </div>
            </div>
          </body>
          </html>
        `,
        tags: ['bienvenue', 'vendeur']
      };

      const response = await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log('✅ Email de bienvenue envoyé au vendeur');
      return response;
      
    } catch (error) {
      console.error('❌ Erreur email de bienvenue:', error);
      throw error;
    }
  }

  /**
   * Envoie une notification de connexion vendeur
   */
  async sendSellerLoginNotification(sellerData, loginInfo) {
    try {
      const { name, email } = sellerData;
      const { ip, userAgent, timestamp } = loginInfo;

      const sendSmtpEmail = {
        sender: {
          email: process.env.BREVO_SENDER_EMAIL,
          name: process.env.BREVO_SENDER_NAME || 'Shay Solutions'
        },
        to: [{
          email: process.env.ADMIN_EMAIL,
          name: 'Administrateur'
        }],
        subject: `Connexion vendeur - ${name}`,
        htmlContent: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #FF6B00; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; background: #f9f9f9; }
              .info-box { background: white; padding: 15px; border-radius: 5px; margin: 10px 0; }
              .alert { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 10px; border-radius: 5px; }
              .footer { text-align: center; margin-top: 20px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>CONNEXION VENDEUR</h1>
              </div>
              <div class="content">
                <div class="info-box">
                  <h3>Informations du vendeur</h3>
                  <p><strong>Nom:</strong> ${name}</p>
                  <p><strong>Email:</strong> ${email}</p>
                </div>
                
                <div class="info-box">
                  <h3>Détails de la connexion</h3>
                  <p><strong>Date et heure:</strong> ${moment(timestamp).format('DD/MM/YYYY à HH:mm:ss')}</p>
                  <p><strong>Adresse IP:</strong> ${ip || 'Non disponible'}</p>
                  <p><strong>Appareil/Navigateur:</strong> ${userAgent || 'Non disponible'}</p>
                </div>
                
                <div class="alert">
                  <strong>⚠️ Notification de sécurité</strong>
                  <p>Si cette connexion vous semble suspecte, veuillez vérifier immédiatement l'activité du compte.</p>
                </div>
                
                <div class="footer">
                  <p>Notification automatique - Système de vente</p>
                  <p>${moment().format('DD/MM/YYYY HH:mm')}</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
        tags: ['connexion', 'vendeur']
      };

      const response = await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log('✅ Notification connexion vendeur envoyée');
      return response;
      
    } catch (error) {
      console.error('❌ Erreur notification connexion:', error);
      throw error;
    }
  }

  /**
   * Envoie une alerte de connexion suspecte
   */
  async sendSuspiciousLoginAlert(sellerData, loginInfo) {
    try {
      const { name, email } = sellerData;
      const { ip, location, device_type, reason } = loginInfo;

      const sendSmtpEmail = {
        sender: {
          email: process.env.BREVO_SENDER_EMAIL,
          name: process.env.BREVO_SENDER_NAME || 'JHY Solutions'
        },
        to: [{
          email: process.env.ADMIN_EMAIL,
          name: 'Administrateur'
        }],
        subject: `🚨 ALERTE - Connexion suspecte - ${name}`,
        htmlContent: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #dc3545; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; background: #f9f9f9; }
              .alert-box { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 15px; border-radius: 5px; margin: 10px 0; }
              .info-box { background: white; padding: 15px; border-radius: 5px; margin: 10px 0; }
              .footer { text-align: center; margin-top: 20px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🚨 ALERTE DE SÉCURITÉ</h1>
              </div>
              <div class="content">
                <div class="alert-box">
                  <h3>🚨 ${reason || 'Connexion suspecte détectée'}</h3>
                  <p>Une connexion inhabituelle a été détectée sur le compte d'un vendeur.</p>
                </div>
                
                <div class="info-box">
                  <h3>Compte concerné</h3>
                  <p><strong>👤 Vendeur:</strong> ${name}</p>
                  <p><strong>📧 Email:</strong> ${email}</p>
                </div>
                
                <div class="info-box">
                  <h3>Informations de connexion</h3>
                  <p><strong>🕐 Date/heure:</strong> ${moment().format('DD/MM/YYYY à HH:mm:ss')}</p>
                  <p><strong>🌐 IP:</strong> ${ip}</p>
                  <p><strong>📍 Raison:</strong> ${reason || 'Comportement inhabituel'}</p>
                  <p><strong>💻 Appareil:</strong> ${device_type || 'Inconnu'}</p>
                </div>
                
                <div class="alert-box">
                  <h3>Actions recommandées</h3>
                  <ul>
                    <li>Vérifier l'activité récente du compte</li>
                    <li>Contacter le vendeur pour confirmation</li>
                    <li>Changer le mot de passe si nécessaire</li>
                    <li>Désactiver temporairement le compte en cas de doute</li>
                  </ul>
                </div>
                
                <div class="footer">
                  <p>Système de sécurité automatique</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
        tags: ['alerte', 'securite']
      };

      const response = await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log('✅ Alerte de connexion suspecte envoyée');
      return response;
      
    } catch (error) {
      console.error('❌ Erreur alerte connexion suspecte:', error);
      throw error;
    }
  }

  /**
   * Envoie une notification de modification de vente
   */
  async sendSaleUpdateNotification(saleData) {
    try {
      const { invoice_number, customer_name, total_amount, items, seller_name, modified_by } = saleData;
      
      const itemsList = items.map(item => 
        `<tr>
          <td>${item.name}</td>
          <td>${item.quantity}</td>
          <td>${item.unit_price}€</td>
          <td>${item.subtotal}€</td>
        </tr>`
      ).join('');

      const sendSmtpEmail = {
        sender: {
          email: process.env.BREVO_SENDER_EMAIL,
          name: process.env.BREVO_SENDER_NAME || 'JHY Solutions'
        },
        to: [{
          email: process.env.ADMIN_EMAIL,
          name: 'Administrateur'
        }],
        subject: `Vente modifiée - Facture ${invoice_number}`,
        htmlContent: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #FF6B00; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; background: #f9f9f9; }
              .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              .table th, .table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
              .table th { background: #FF6B00; color: white; }
              .info-box { background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 10px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>VENTE MODIFIÉE</h1>
              </div>
              <div class="content">
                <div class="info-box">
                  <p><strong>⚠️ Cette vente a été modifiée par:</strong> ${modified_by}</p>
                </div>
                
                <p><strong>Facture:</strong> ${invoice_number}</p>
                <p><strong>Client:</strong> ${customer_name}</p>
                <p><strong>Vendeur original:</strong> ${seller_name}</p>
                <p><strong>Nouveau montant total:</strong> ${total_amount}€</p>
                
                <h3>Articles modifiés:</h3>
                <table class="table">
                  <thead>
                    <tr>
                      <th>Produit</th>
                      <th>Quantité</th>
                      <th>Prix unitaire</th>
                      <th>Sous-total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsList}
                  </tbody>
                </table>
                
                <p><em>Modification effectuée le ${new Date().toLocaleString('fr-FR')}</em></p>
              </div>
            </div>
          </body>
          </html>
        `,
        tags: ['modification', 'vente']
      };

      const response = await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log('✅ Notification de modification envoyée');
      return response;
      
    } catch (error) {
      console.error('❌ Erreur notification modification:', error);
      throw error;
    }
  }

  /**
   * Méthode de test pour vérifier la configuration
   */
  async sendTestEmail() {
    try {
      console.log('🧪 Test du service Brevo...');
      
      const sendSmtpEmail = {
        sender: {
          email: process.env.BREVO_SENDER_EMAIL,
          name: process.env.BREVO_SENDER_NAME || 'Test JHY Solutions'
        },
        to: [{
          email: process.env.ADMIN_EMAIL,
          name: 'Administrateur Test'
        }],
        subject: 'Test Service Brevo - ' + new Date().toLocaleString('fr-FR'),
        htmlContent: `
          <html>
            <body>
              <h1>Test du Service Brevo</h1>
              <p>Si vous recevez cet email, le service Brevo est correctement configuré.</p>
              <p><strong>Date:</strong> ${new Date().toLocaleString('fr-FR')}</p>
              <p><strong>Service:</strong> JHY Solutions</p>
            </body>
          </html>
        `,
        tags: ['test']
      };

      const response = await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log('✅ Email test envoyé avec succès');
      return response;
      
    } catch (error) {
      console.error('❌ Échec de l\'email test:', error);
      throw error;
    }
  }
}

// Export comme instance unique
const emailService = new EmailService();
module.exports = emailService;
