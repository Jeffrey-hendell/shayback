const PDFDocument = require('pdfkit');
const pool = require('../config/database');

class PDFGenerator {
  async generateSalesReport(period = 'month') {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });

        // En-tête du document
        this.addHeader(doc, 'RAPPORT DES VENTES');

        // Informations de base
        doc.fontSize(12)
           .text(`Date de génération: ${new Date().toLocaleDateString('fr-FR')}`, 50, 120)
           .text(`Période: ${this.getPeriodLabel(period)}`, 50, 140);

        // Statistiques principales
        const stats = await this.getSalesStats(period);
        doc.fontSize(16)
           .text('STATISTIQUES PRINCIPALES', 50, 180)
           .moveDown(0.5);

        doc.fontSize(10)
           .text(`Chiffre d'affaires total: ${stats.total_revenue} GDS`, 50)
           .text(`Nombre total de ventes: ${stats.total_sales}`, 50)
           .text(`Vente moyenne: ${stats.average_sale} GDS`, 50)
           .text(`Vendeurs actifs: ${stats.active_sellers}`, 50)
           .text(`Produits vendus: ${stats.total_products_sold}`, 50)
           .moveDown(1);

        // Détails des ventes récentes
        doc.addPage()
           .fontSize(16)
           .text('VENTES RÉCENTES', 50, 50)
           .moveDown(0.5);

        const sales = await this.getRecentSales(10);
        let yPosition = 120;

        sales.forEach((sale, index) => {
          if (yPosition > 700) {
            doc.addPage();
            yPosition = 50;
          }

          doc.fontSize(10)
             .text(`Facture: ${sale.invoice_number}`, 50, yPosition)
             .text(`Client: ${sale.customer_name}`, 200, yPosition)
             .text(`Montant: ${sale.total_amount} GDS`, 400, yPosition)
             .text(`Date: ${new Date(sale.created_at).toLocaleDateString('fr-FR')}`, 50, yPosition + 15)
             .text(`Vendeur: ${sale.seller_name}`, 200, yPosition + 15)
             .text(`Paiement: ${sale.payment_method}`, 400, yPosition + 15);

          yPosition += 40;
        });

        // Pied de page
        this.addFooter(doc);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  async generateProductsReport() {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });

        this.addHeader(doc, 'RAPPORT DES PRODUITS');

        // Statistiques produits
        const stats = await this.getProductStats();
        doc.fontSize(12)
           .text(`Date de génération: ${new Date().toLocaleDateString('fr-FR')}`, 50, 120)
           .moveDown(1)
           .fontSize(16)
           .text('STATISTIQUES PRODUITS', 50)
           .moveDown(0.5)
           .fontSize(10)
           .text(`Total produits: ${stats.total_products}`, 50)
           .text(`Produits en stock: ${stats.in_stock_products}`, 50)
           .text(`Produits en rupture: ${stats.out_of_stock_products}`, 50)
           .text(`Valeur stock total: ${stats.total_stock_value} GDS`, 50)
           .text(`Prix moyen: ${stats.average_price} GDS`, 50)
           .moveDown(1);

        // Liste des produits
        doc.addPage()
           .fontSize(16)
           .text('INVENTAIRE DES PRODUITS', 50, 50)
           .moveDown(0.5);

        const products = await this.getProductsData();
        let yPosition = 120;

        // En-têtes du tableau
        doc.fontSize(10)
           .text('Nom', 50, yPosition)
           .text('Catégorie', 200, yPosition)
           .text('Prix Vente', 300, yPosition)
           .text('Stock', 400, yPosition)
           .text('Statut', 450, yPosition);

        yPosition += 20;
        doc.moveTo(50, yPosition).lineTo(550, yPosition).stroke();

        yPosition += 10;

        products.forEach((product) => {
          if (yPosition > 700) {
            doc.addPage();
            yPosition = 50;
            // Répéter les en-têtes
            doc.fontSize(10)
               .text('Nom', 50, yPosition)
               .text('Catégorie', 200, yPosition)
               .text('Prix Vente', 300, yPosition)
               .text('Stock', 400, yPosition)
               .text('Statut', 450, yPosition);
            yPosition += 30;
          }

          doc.text(product.name, 50, yPosition)
             .text(product.category, 200, yPosition)
             .text(`${product.selling_price} GDS`, 300, yPosition)
             .text(product.stock.toString(), 400, yPosition)
             .text(product.stock > 0 ? 'En stock' : 'Rupture', 450, yPosition);

          yPosition += 20;
        });

        this.addFooter(doc);
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  async generateSellersReport() {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });

        this.addHeader(doc, 'RAPPORT DES VENDEURS');

        // Statistiques vendeurs
        const stats = await this.getSellerStats();
        doc.fontSize(12)
           .text(`Date de génération: ${new Date().toLocaleDateString('fr-FR')}`, 50, 120)
           .moveDown(1)
           .fontSize(16)
           .text('STATISTIQUES VENDEURS', 50)
           .moveDown(0.5)
           .fontSize(10)
           .text(`Total vendeurs: ${stats.total_sellers}`, 50)
           .text(`Vendeurs actifs: ${stats.active_sellers}`, 50)
           .text(`Vendeurs inactifs: ${stats.inactive_sellers}`, 50)
           .moveDown(1);

        // Performance des vendeurs
        doc.addPage()
           .fontSize(16)
           .text('PERFORMANCE DES VENDEURS', 50, 50)
           .moveDown(0.5);

        const performance = await this.getSellerPerformance();
        let yPosition = 120;

        performance.forEach((seller) => {
          if (yPosition > 700) {
            doc.addPage();
            yPosition = 50;
          }

          doc.fontSize(10)
             .text(seller.name, 50, yPosition)
             .text(`Ventes: ${seller.total_sales}`, 200, yPosition)
             .text(`CA: ${seller.total_revenue} GDS`, 300, yPosition)
             .text(`Moyenne: ${seller.average_sale} GDS`, 400, yPosition)
             .text(`Statut: ${seller.is_active ? 'Actif' : 'Inactif'}`, 500, yPosition);

          yPosition += 25;
        });

        this.addFooter(doc);
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  addHeader(doc, title) {
    // Logo ou titre
    doc.fontSize(20)
       .text('E-COMMERCE SYSTEM', 50, 50)
       .fontSize(16)
       .text(title, 50, 80)
       .moveTo(50, 110)
       .lineTo(550, 110)
       .stroke();
  }

  addFooter(doc) {
    const pageHeight = doc.page.height;
    doc.fontSize(8)
       .text('Rapport généré automatiquement par le système E-Commerce', 
             50, pageHeight - 50, { align: 'center' });
  }

  getPeriodLabel(period) {
    const labels = {
      day: 'Aujourd\'hui',
      week: '7 derniers jours',
      month: 'Ce mois',
      year: 'Cette année'
    };
    return labels[period] || 'Toutes périodes';
  }

  // Méthodes de récupération des données (similaires à ExcelGenerator)
  async getSalesStats(period) {
    let dateFilter = '';
    switch(period) {
      case 'day': dateFilter = "WHERE created_at >= CURRENT_DATE"; break;
      case 'week': dateFilter = "WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'"; break;
      case 'month': dateFilter = "WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)"; break;
      case 'year': dateFilter = "WHERE created_at >= DATE_TRUNC('year', CURRENT_DATE)"; break;
    }

    const query = `
      SELECT 
        COUNT(*) as total_sales,
        COALESCE(SUM(total_amount), 0) as total_revenue,
        AVG(total_amount) as average_sale,
        COUNT(DISTINCT seller_id) as active_sellers,
        (SELECT SUM((item->>'quantity')::int) 
         FROM sales, LATERAL jsonb_array_elements(items) AS item 
         ${dateFilter}) as total_products_sold
      FROM sales 
      ${dateFilter}
    `;

    const result = await pool.query(query);
    return result.rows[0];
  }

  async getRecentSales(limit = 10) {
    const query = `
      SELECT 
        s.*,
        u.name as seller_name
      FROM sales s
      LEFT JOIN users u ON s.seller_id = u.id
      ORDER BY s.created_at DESC
      LIMIT $1
    `;
    const result = await pool.query(query, [limit]);
    return result.rows;
  }

  async getProductStats() {
    const query = `
      SELECT 
        COUNT(*) as total_products,
        COUNT(CASE WHEN stock > 0 THEN 1 END) as in_stock_products,
        COUNT(CASE WHEN stock = 0 THEN 1 END) as out_of_stock_products,
        SUM(stock * purchase_price) as total_stock_value,
        AVG(selling_price) as average_price
      FROM products
      WHERE is_active = true
    `;
    const result = await pool.query(query);
    return result.rows[0];
  }

  async getProductsData() {
    const query = `
      SELECT * FROM products 
      WHERE is_active = true 
      ORDER BY name
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  async getSellerStats() {
    const query = `
      SELECT 
        COUNT(*) as total_sellers,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_sellers,
        COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_sellers
      FROM users 
      WHERE role = 'seller'
    `;
    const result = await pool.query(query);
    return result.rows[0];
  }

  async getSellerPerformance() {
    const query = `
      SELECT 
        u.id,
        u.name,
        u.is_active,
        COUNT(s.id) as total_sales,
        COALESCE(SUM(s.total_amount), 0) as total_revenue,
        COALESCE(AVG(s.total_amount), 0) as average_sale
      FROM users u
      LEFT JOIN sales s ON u.id = s.seller_id
      WHERE u.role = 'seller'
      GROUP BY u.id, u.name, u.is_active
      ORDER BY total_revenue DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  }
}

module.exports = new PDFGenerator();