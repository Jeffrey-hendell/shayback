const Sale = require('../models/Sale');
const Product = require('../models/Product');
const emailService = require('../utils/emailService');
const pdfGenerator = require('../utils/pdfGenerator');

class SaleController {
  /**
   * Créer une nouvelle vente
   */
  async createSale(req, res) {
    try {
      const { customer_name, customer_email, customer_phone, items, payment_method } = req.body;
      
      // console.log('Données reçues pour la vente:', {
      //   customer_name,
      //   customer_email,
      //   customer_phone,
      //   items,
      //   payment_method
      // });

      // Validation du payment_method
      const allowedMethods = ['cash', 'moncash', 'natcash', 'mastercard', 'visa', 'paypal', 'stripe'];
      if (!allowedMethods.includes(payment_method)) {
        return res.status(400).json({ 
          error: 'Méthode de paiement invalide',
          allowed_methods: allowedMethods 
        });
      }

      // Validation des items
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ 
          error: 'La liste des articles est vide ou invalide' 
        });
      }

      // Vérifier le stock et calculer le total
      let total_amount = 0;
      const saleItems = [];

      for (const item of items) {
        // Validation de l'item
        if (!item.product_id || !item.quantity) {
          return res.status(400).json({ 
            error: 'Chaque article doit avoir un product_id et une quantité' 
          });
        }

        const product = await Product.findById(item.product_id);
        if (!product) {
          return res.status(404).json({ 
            error: `Produit non trouvé avec l'ID: ${item.product_id}` 
          });
        }

        if (product.stock < item.quantity) {
          return res.status(400).json({ 
            error: `Stock insuffisant pour: ${product.name}`,
            available_stock: product.stock,
            requested: item.quantity
          });
        }

        // Calculer le prix avec remise
        const unit_price = parseFloat((product.selling_price * (1 - product.discount / 100)).toFixed(2));
        const subtotal = parseFloat((unit_price * item.quantity).toFixed(2));
        
        saleItems.push({
          product_id: item.product_id,
          name: product.name,
          quantity: parseInt(item.quantity),
          unit_price: unit_price,
          subtotal: subtotal
        });

        total_amount += subtotal;
        
        // Mettre à jour le stock
        const newStock = product.stock - item.quantity;
        await Product.updateStock(item.product_id, newStock);
        
        // console.log(`Stock mis à jour - Produit ${product.name}: ${product.stock} -> ${newStock}`);
      }

      total_amount = parseFloat(total_amount.toFixed(2));

      // Générer numéro de facture
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substr(2, 6).toUpperCase();
      const invoice_number = `JHY-${timestamp}-${randomStr}`;

      const saleData = {
        invoice_number,
        customer_name,
        customer_email: customer_email || null,
        customer_phone: customer_phone || null,
        items: saleItems,
        total_amount,
        payment_method,
        seller_id: req.user.id
      };

      // console.log('Données de vente à enregistrer:', saleData);

      const sale = await Sale.create(saleData);
      
      // Récupérer les infos complètes pour l'email
      const completeSale = await Sale.findById(sale.id);
      
      // Envoyer l'email de notification (ne pas bloquer en cas d'erreur)
      let emailError = null;
      try {
        // console.log('📧 Tentative d\'envoi d\'email...');
        await emailService.sendSaleNotification(completeSale);
        // console.log('✅ Email de notification envoyé avec succès');
      } catch (emailErr) {
        emailError = emailErr;
        // console.error('⚠️ Email non envoyé, mais vente enregistrée:', emailErr.message);
        // Continuer même si l'email échoue
      }

      res.status(201).json({
        message: 'Vente effectuée avec succès',
        sale: completeSale,
        emailSent: !emailError // Indiquer si l'email a été envoyé
      });

    } catch (error) {
      // console.error('Erreur détaillée création vente:', error);
      res.status(500).json({ 
        error: 'Erreur lors de la création de la vente',
        details: error.message 
      });
    }
  }

  /**
   * Récupérer toutes les ventes (Admin seulement)
   */
   async getAllSales(req, res) {
    try {
      const sales = await Sale.findAll();
      res.json({ sales });
    } catch (error) {
      console.error('Erreur récupération ventes:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération des ventes' });
    }
  }

  /**
   * Récupérer les ventes d'un vendeur spécifique
   */
  async getSellerSales(req, res) {
    try {
      const sales = await Sale.findBySeller(req.user.id);
      res.json({ sales });
    } catch (error) {
      console.error('Erreur récupération ventes vendeur:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération des ventes' });
    }
  }

  /**
   * Récupérer une vente spécifique par ID
   */
async getSaleById(req, res) {
  try {
    const { id } = req.params;
    
    // Validation de l'ID
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ error: 'ID de vente invalide' });
    }
    
    const sale = await Sale.findById(id);
    
    if (!sale) {
      return res.status(404).json({ 
        error: 'Vente non trouvée',
        message: `Aucune vente trouvée avec l'ID ${id}`
      });
    }

    // Vérification des permissions étendue
    const isAdmin = req.user.role === 'admin';
    const isOwner = sale.seller_id === req.user.id;
    
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ 
        error: 'Accès non autorisé',
        message: 'Vous ne pouvez accéder qu\'à vos propres ventes'
      });
    }

    // Log de l'accès réussi
    // console.log(`Accès à la vente ${id} par l'utilisateur ${req.user.id}`);

    res.json({ 
      success: true,
      sale 
    });
    
  } catch (error) {
    console.error('Erreur détaillée récupération vente:', error);
    res.status(500).json({ 
      error: 'Erreur serveur',
      message: 'Impossible de récupérer les détails de la vente'
    });
  }
}

static async findByInvoiceNumber(invoiceNumber) {
  const query = `SELECT * FROM sales WHERE invoice_number = $1`;
  const result = await pool.query(query, [invoiceNumber]);
  return result.rows[0];
}

static async findByCustomerEmail(email) {
  const query = `SELECT * FROM sales WHERE customer_email = $1 ORDER BY created_at DESC`;
  const result = await pool.query(query, [email]);
  return result.rows;
}

  /**
   * Générer une facture PDF
   */
  async generateInvoice(req, res) {
    try {
      const { id } = req.params;
      const sale = await Sale.findById(id);
      
      if (!sale) {
        return res.status(404).json({ error: 'Vente non trouvée' });
      }

      // Vérifier les permissions (admin ou vendeur propriétaire)
      if (req.user.role !== 'admin' && sale.seller_id !== req.user.id) {
        return res.status(403).json({ error: 'Accès non autorisé à cette facture' });
      }

      const pdfBuffer = await pdfGenerator.generateInvoice(sale);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=facture-${sale.invoice_number}.pdf`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Erreur génération PDF:', error);
      res.status(500).json({ error: 'Erreur lors de la génération de la facture' });
    }
  }

  /**
   * Obtenir les statistiques de ventes
   */
  async getSalesStats(req, res) {
    try {
      const { period = 'month', seller_id } = req.query;
      const allowedPeriods = ['day', 'week', 'month', 'year'];
      
      if (!allowedPeriods.includes(period)) {
        return res.status(400).json({ 
          error: 'Période invalide',
          allowed_periods: allowedPeriods 
        });
      }

      let dateFilter = '';
      const queryParams = [];
      
      switch(period) {
        case 'day':
          dateFilter = "WHERE created_at >= CURRENT_DATE";
          break;
        case 'week':
          dateFilter = "WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'";
          break;
        case 'month':
          dateFilter = "WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)";
          break;
        case 'year':
          dateFilter = "WHERE created_at >= DATE_TRUNC('year', CURRENT_DATE)";
          break;
      }

      // Filtre par vendeur si spécifié
      if (seller_id) {
        if (req.user.role !== 'admin') {
          return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
        }
        dateFilter += dateFilter ? ' AND' : 'WHERE';
        queryParams.push(seller_id);
        dateFilter += ` seller_id = $${queryParams.length}`;
      } else if (req.user.role === 'seller') {
        // Les vendeurs ne voient que leurs stats
        dateFilter += dateFilter ? ' AND' : 'WHERE';
        queryParams.push(req.user.id);
        dateFilter += ` seller_id = $${queryParams.length}`;
      }

      const query = `
        SELECT 
          COUNT(*) as total_sales,
          COALESCE(SUM(total_amount), 0) as total_revenue,
          AVG(total_amount) as average_sale,
          MIN(total_amount) as min_sale,
          MAX(total_amount) as max_sale
        FROM sales 
        ${dateFilter}
      `;
      
      const result = await pool.query(query, queryParams);
      const stats = result.rows[0];

      // Ventes par méthode de paiement
      const paymentQuery = `
        SELECT 
          payment_method,
          COUNT(*) as count,
          SUM(total_amount) as amount
        FROM sales 
        ${dateFilter}
        GROUP BY payment_method
        ORDER BY amount DESC
      `;
      
      const paymentResult = await pool.query(paymentQuery, queryParams);
      
      // Produits les plus vendus
      const productsQuery = `
        SELECT 
          jsonb_array_elements(items)->>'name' as product_name,
          SUM(CAST(jsonb_array_elements(items)->>'quantity' as INTEGER)) as total_quantity,
          SUM(CAST(jsonb_array_elements(items)->>'subtotal' as DECIMAL)) as total_revenue
        FROM sales 
        ${dateFilter}
        GROUP BY product_name
        ORDER BY total_quantity DESC
        LIMIT 10
      `;
      
      const productsResult = await pool.query(productsQuery, queryParams);

      res.json({
        period,
        stats: {
          ...stats,
          total_revenue: parseFloat(stats.total_revenue),
          average_sale: parseFloat(stats.average_sale || 0),
          min_sale: parseFloat(stats.min_sale || 0),
          max_sale: parseFloat(stats.max_sale || 0)
        },
        payment_methods: paymentResult.rows,
        top_products: productsResult.rows
      });
    } catch (error) {
      console.error('Erreur récupération statistiques:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
    }
  }

  /**
   * Annuler une vente (Admin seulement)
   */
  async cancelSale(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
      }

      // Récupérer la vente
      const sale = await Sale.findById(id);
      if (!sale) {
        return res.status(404).json({ error: 'Vente non trouvée' });
      }

      // Restaurer le stock des produits
      for (const item of sale.items) {
        const product = await Product.findById(item.product_id);
        if (product) {
          const newStock = product.stock + item.quantity;
          await Product.updateStock(item.product_id, newStock);
          // console.log(`Stock restauré - Produit ${product.name}: ${product.stock} -> ${newStock}`);
        }
      }

      // Marquer la vente comme annulée (vous pouvez ajouter un champ cancelled dans la table)
      const cancelQuery = `
        UPDATE sales 
        SET cancelled = true, cancelled_at = CURRENT_TIMESTAMP, cancellation_reason = $1 
        WHERE id = $2 
        RETURNING *
      `;
      
      const result = await pool.query(cancelQuery, [reason, id]);
      const cancelledSale = result.rows[0];

      res.json({
        message: 'Vente annulée avec succès',
        sale: {
          ...cancelledSale,
          items: typeof cancelledSale.items === 'string' ? JSON.parse(cancelledSale.items) : cancelledSale.items
        }
      });
    } catch (error) {
      console.error('Erreur annulation vente:', error);
      res.status(500).json({ error: 'Erreur lors de l\'annulation de la vente' });
    }
  }

  /**
   * Rechercher des ventes
   */
  async searchSales(req, res) {
    try {
      const { query, field = 'customer_name' } = req.query;
      const allowedFields = ['customer_name', 'invoice_number', 'customer_email'];
      
      if (!allowedFields.includes(field)) {
        return res.status(400).json({ 
          error: 'Champ de recherche invalide',
          allowed_fields: allowedFields 
        });
      }

      if (!query || query.length < 2) {
        return res.status(400).json({ 
          error: 'La requête de recherche doit contenir au moins 2 caractères' 
        });
      }

      let searchQuery = `
        SELECT s.*, u.name as seller_name, u.email as seller_email
        FROM sales s 
        LEFT JOIN users u ON s.seller_id = u.id 
        WHERE ${field} ILIKE $1
      `;
      
      const queryParams = [`%${query}%`];

      // Restrictions pour les vendeurs
      if (req.user.role === 'seller') {
        searchQuery += ` AND s.seller_id = $2`;
        queryParams.push(req.user.id);
      }

      searchQuery += ` ORDER BY s.created_at DESC LIMIT 50`;

      const result = await pool.query(searchQuery, queryParams);
      
      const sales = result.rows.map(sale => ({
        ...sale,
        items: typeof sale.items === 'string' ? JSON.parse(sale.items) : sale.items
      }));

      res.json({
        sales,
        search: {
          query,
          field,
          total_results: sales.length
        }
      });
    } catch (error) {
      console.error('Erreur recherche ventes:', error);
      res.status(500).json({ error: 'Erreur lors de la recherche des ventes' });
    }
  }

  
  async getSaleDetails(req, res) {
    try {
      const { id } = req.params;
      
      const query = `
        SELECT 
          s.*,
          u.name as seller_name,
          u.email as seller_email
        FROM sales s
        LEFT JOIN users u ON s.seller_id = u.id
        WHERE s.id = $1
      `;
      
      const result = await pool.query(query, [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Vente non trouvée' });
      }

      const sale = result.rows[0];
      
      // Récupérer les détails des produits
      const productDetails = await Promise.all(
        sale.items.map(async (item) => {
          const product = await Product.findById(item.product_id);
          return {
            ...item,
            product_details: product
          };
        })
      );

      res.json({
        sale: {
          ...sale,
          items: productDetails
        }
      });
    } catch (error) {
      console.error('Erreur détails vente:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération des détails' });
    }
  }

  async updateSale(req, res) {
    try {
      const { id } = req.params;
      const { customer_name, customer_email, customer_phone, items, payment_method } = req.body;

      // Vérifier si la vente existe
      const existingSale = await Sale.findById(id);
      if (!existingSale) {
        return res.status(404).json({ error: 'Vente non trouvée' });
      }

      // Recalculer le total si les items changent
      let total_amount = existingSale.total_amount;
      if (items) {
        total_amount = 0;
        for (const item of items) {
          const product = await Product.findById(item.product_id);
          if (!product) {
            return res.status(404).json({ error: `Produit non trouvé: ${item.product_id}` });
          }
          const unit_price = product.selling_price * (1 - product.discount / 100);
          const subtotal = unit_price * item.quantity;
          total_amount += subtotal;
        }
        total_amount = parseFloat(total_amount.toFixed(2));
      }

      const query = `
        UPDATE sales 
        SET 
          customer_name = COALESCE($1, customer_name),
          customer_email = COALESCE($2, customer_email),
          customer_phone = COALESCE($3, customer_phone),
          items = COALESCE($4, items),
          total_amount = COALESCE($5, total_amount),
          payment_method = COALESCE($6, payment_method),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $7
        RETURNING *
      `;

      const result = await pool.query(query, [
        customer_name, customer_email, customer_phone, 
        items ? JSON.stringify(items) : null, 
        total_amount, payment_method, id
      ]);

      const updatedSale = result.rows[0];

      // Envoyer une notification de modification
      await emailService.sendSaleUpdateNotification({
        ...updatedSale,
        seller_name: req.user.name,
        modified_by: req.user.name
      });

      res.json({
        message: 'Vente modifiée avec succès',
        sale: updatedSale
      });
    } catch (error) {
      console.error('Erreur modification vente:', error);
      res.status(500).json({ error: 'Erreur lors de la modification de la vente' });
    }
  }

  async deleteSale(req, res) {
    try {
      const { id } = req.params;

      // Vérifier si la vente existe
      const existingSale = await Sale.findById(id);
      if (!existingSale) {
        return res.status(404).json({ error: 'Vente non trouvée' });
      }

      // Restaurer le stock des produits
      for (const item of existingSale.items) {
        const product = await Product.findById(item.product_id);
        if (product) {
          await Product.updateStock(item.product_id, product.stock + item.quantity);
        }
      }

      const query = 'DELETE FROM sales WHERE id = $1';
      await pool.query(query, [id]);

      res.json({ message: 'Vente supprimée avec succès' });
    } catch (error) {
      console.error('Erreur suppression vente:', error);
      res.status(500).json({ error: 'Erreur lors de la suppression de la vente' });
    }
  }


}

module.exports = new SaleController();