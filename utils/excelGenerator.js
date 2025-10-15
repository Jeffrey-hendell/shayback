const ExcelJS = require('exceljs');
const pool = require('../config/database');

class ExcelGenerator {
  async generateSalesReport(period = 'month') {
    const workbook = new ExcelJS.Workbook();
    
    // Feuille de style
    const styles = {
      header: {
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF0ea5e9' }
        },
        font: {
          color: { argb: 'FFFFFFFF' },
          bold: true
        },
        border: {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }
      },
      title: {
        font: {
          size: 18,
          bold: true
        }
      },
      data: {
        border: {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }
      }
    };

    // Feuille 1: Résumé des ventes
    const summarySheet = workbook.addWorksheet('Résumé Ventes');
    
    // Titre
    summarySheet.mergeCells('A1:F1');
    summarySheet.getCell('A1').value = 'RAPPORT DES VENTES - SYSTÈME E-COMMERCE';
    summarySheet.getCell('A1').style = styles.title;
    summarySheet.getCell('A1').alignment = { horizontal: 'center' };

    // Date de génération
    summarySheet.getCell('A2').value = `Généré le: ${new Date().toLocaleDateString('fr-FR')}`;
    summarySheet.getCell('A3').value = `Période: ${this.getPeriodLabel(period)}`;

    // En-têtes résumé
    summarySheet.getRow(5).values = ['Statistique', 'Valeur'];
    summarySheet.getRow(5).eachCell((cell) => {
      cell.style = styles.header;
    });

    // Données résumé
    const salesStats = await this.getSalesStats(period);
    const summaryData = [
      ['Chiffre d\'affaires total', `${salesStats.total_revenue} GDS`],
      ['Nombre total de ventes', salesStats.total_sales],
      ['Vente moyenne', `${salesStats.average_sale} GDS`],
      ['Vendeurs actifs', salesStats.active_sellers],
      ['Produits vendus', salesStats.total_products_sold],
      ['Période', this.getPeriodLabel(period)]
    ];

    summaryData.forEach((row, index) => {
      summarySheet.getRow(6 + index).values = row;
      summarySheet.getRow(6 + index).eachCell((cell) => {
        cell.style = styles.data;
      });
    });

    // Feuille 2: Détails des ventes
    const salesSheet = workbook.addWorksheet('Détails Ventes');
    
    // Titre
    salesSheet.mergeCells('A1:H1');
    salesSheet.getCell('A1').value = 'DÉTAILS DES VENTES';
    salesSheet.getCell('A1').style = styles.title;
    salesSheet.getCell('A1').alignment = { horizontal: 'center' };

    // En-têtes
    salesSheet.getRow(3).values = [
      'N° Facture',
      'Date',
      'Client',
      'Vendeur',
      'Montant Total',
      'Méthode Paiement',
      'Articles',
      'Quantité Totale'
    ];
    salesSheet.getRow(3).eachCell((cell) => {
      cell.style = styles.header;
    });

    // Données des ventes
    const salesData = await this.getSalesData(period);
    salesData.forEach((sale, index) => {
      const row = salesSheet.getRow(4 + index);
      row.values = [
        sale.invoice_number,
        new Date(sale.created_at).toLocaleDateString('fr-FR'),
        sale.customer_name,
        sale.seller_name,
        parseFloat(sale.total_amount),
        sale.payment_method,
        sale.items.map(item => item.name).join(', '),
        sale.items.reduce((sum, item) => sum + item.quantity, 0)
      ];
      row.eachCell((cell) => {
        cell.style = styles.data;
      });
    });

    // Ajuster les largeurs de colonnes
    [summarySheet, salesSheet].forEach(sheet => {
      sheet.columns.forEach(column => {
        column.width = 20;
      });
    });

    return workbook;
  }

  async generateProductsReport() {
    const workbook = new ExcelJS.Workbook();
    
    const styles = {
      header: {
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF22c55e' }
        },
        font: {
          color: { argb: 'FFFFFFFF' },
          bold: true
        },
        border: {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }
      },
      title: {
        font: {
          size: 18,
          bold: true
        }
      },
      data: {
        border: {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }
      }
    };

    // Feuille produits
    const productsSheet = workbook.addWorksheet('Inventaire Produits');
    
    // Titre
    productsSheet.mergeCells('A1:G1');
    productsSheet.getCell('A1').value = 'INVENTAIRE DES PRODUITS';
    productsSheet.getCell('A1').style = styles.title;
    productsSheet.getCell('A1').alignment = { horizontal: 'center' };

    // En-têtes
    productsSheet.getRow(3).values = [
      'ID',
      'Nom',
      'Catégorie',
      'Prix d\'achat (GDS)',
      'Prix de vente (GDS)',
      'Stock',
      'Statut'
    ];
    productsSheet.getRow(3).eachCell((cell) => {
      cell.style = styles.header;
    });

    // Données produits
    const products = await this.getProductsData();
    products.forEach((product, index) => {
      const row = productsSheet.getRow(4 + index);
      row.values = [
        product.id,
        product.name,
        product.category,
        parseFloat(product.purchase_price),
        parseFloat(product.selling_price),
        product.stock,
        product.stock > 0 ? 'En stock' : 'Rupture'
      ];
      row.eachCell((cell) => {
        cell.style = styles.data;
      });
    });

    // Statistiques produits
    const statsSheet = workbook.addWorksheet('Statistiques Produits');
    
    statsSheet.mergeCells('A1:C1');
    statsSheet.getCell('A1').value = 'STATISTIQUES PRODUITS';
    statsSheet.getCell('A1').style = styles.title;

    const productStats = await this.getProductStats();
    const statsData = [
      ['Total produits', productStats.total_products],
      ['Produits en stock', productStats.in_stock_products],
      ['Produits en rupture', productStats.out_of_stock_products],
      ['Valeur stock total', `${productStats.total_stock_value} GDS`],
      ['Prix moyen', `${productStats.average_price} GDS`]
    ];

    statsData.forEach((row, index) => {
      statsSheet.getRow(3 + index).values = row;
    });

    // Ajuster les largeurs
    productsSheet.columns.forEach(column => {
      column.width = 20;
    });
    statsSheet.columns.forEach(column => {
      column.width = 25;
    });

    return workbook;
  }

  async generateSellersReport() {
    const workbook = new ExcelJS.Workbook();
    
    const styles = {
      header: {
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFf59e0b' }
        },
        font: {
          color: { argb: 'FFFFFFFF' },
          bold: true
        },
        border: {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }
      },
      title: {
        font: {
          size: 18,
          bold: true
        }
      },
      data: {
        border: {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }
      }
    };

    // Feuille vendeurs
    const sellersSheet = workbook.addWorksheet('Liste Vendeurs');
    
    sellersSheet.mergeCells('A1:H1');
    sellersSheet.getCell('A1').value = 'LISTE DES VENDEURS';
    sellersSheet.getCell('A1').style = styles.title;
    sellersSheet.getCell('A1').alignment = { horizontal: 'center' };

    // En-têtes
    sellersSheet.getRow(3).values = [
      'ID',
      'Nom',
      'Email',
      'Téléphone',
      'NIF',
      'Contact Urgence',
      'Statut',
      'Date Création'
    ];
    sellersSheet.getRow(3).eachCell((cell) => {
      cell.style = styles.header;
    });

    // Données vendeurs
    const sellers = await this.getSellersData();
    sellers.forEach((seller, index) => {
      const row = sellersSheet.getRow(4 + index);
      row.values = [
        seller.id,
        seller.name,
        seller.email,
        seller.phone || 'Non renseigné',
        seller.nif || 'Non renseigné',
        seller.emergency_contact_name || 'Non renseigné',
        seller.is_active ? 'Actif' : 'Inactif',
        new Date(seller.created_at).toLocaleDateString('fr-FR')
      ];
      row.eachCell((cell) => {
        cell.style = styles.data;
      });
    });

    // Performance vendeurs
    const performanceSheet = workbook.addWorksheet('Performance Vendeurs');
    
    performanceSheet.mergeCells('A1:E1');
    performanceSheet.getCell('A1').value = 'PERFORMANCE DES VENDEURS';
    performanceSheet.getCell('A1').style = styles.title;

    performanceSheet.getRow(3).values = [
      'Vendeur',
      'Total Ventes',
      'Chiffre d\'affaires (GDS)',
      'Vente Moyenne (GDS)',
      'Statut'
    ];
    performanceSheet.getRow(3).eachCell((cell) => {
      cell.style = styles.header;
    });

    const performanceData = await this.getSellerPerformance();
    performanceData.forEach((seller, index) => {
      const row = performanceSheet.getRow(4 + index);
      row.values = [
        seller.name,
        seller.total_sales,
        parseFloat(seller.total_revenue),
        parseFloat(seller.average_sale),
        seller.is_active ? 'Actif' : 'Inactif'
      ];
      row.eachCell((cell) => {
        cell.style = styles.data;
      });
    });

    // Ajuster les largeurs
    sellersSheet.columns.forEach(column => {
      column.width = 20;
    });
    performanceSheet.columns.forEach(column => {
      column.width = 25;
    });

    return workbook;
  }

  // Méthodes utilitaires pour récupérer les données
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

  async getSalesData(period) {
    let dateFilter = '';
    switch(period) {
      case 'day': dateFilter = "WHERE s.created_at >= CURRENT_DATE"; break;
      case 'week': dateFilter = "WHERE s.created_at >= CURRENT_DATE - INTERVAL '7 days'"; break;
      case 'month': dateFilter = "WHERE s.created_at >= DATE_TRUNC('month', CURRENT_DATE)"; break;
      case 'year': dateFilter = "WHERE s.created_at >= DATE_TRUNC('year', CURRENT_DATE)"; break;
    }

    const query = `
      SELECT 
        s.*,
        u.name as seller_name
      FROM sales s
      LEFT JOIN users u ON s.seller_id = u.id
      ${dateFilter}
      ORDER BY s.created_at DESC
    `;

    const result = await pool.query(query);
    return result.rows;
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

  async getSellersData() {
    const query = `
      SELECT * FROM users 
      WHERE role = 'seller' 
      ORDER BY name
    `;
    const result = await pool.query(query);
    return result.rows;
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

  getPeriodLabel(period) {
    const labels = {
      day: 'Aujourd\'hui',
      week: '7 derniers jours',
      month: 'Ce mois',
      year: 'Cette année'
    };
    return labels[period] || 'Toutes périodes';
  }
}

module.exports = new ExcelGenerator();