const pool = require('../config/database');

class Sale {
  static async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS sales (
        id SERIAL PRIMARY KEY,
        invoice_number VARCHAR(100) UNIQUE NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        customer_email VARCHAR(255),
        customer_phone VARCHAR(50),
        items JSONB NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('cash', 'moncash', 'natcash', 'card', 'transfer', 'paypal', 'stripe')),
        seller_id INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await pool.query(query);
  }

  static async create(saleData) {
    const { invoice_number, customer_name, customer_email, customer_phone, items, total_amount, payment_method, seller_id } = saleData;
    
    // S'assurer que items est un tableau JSON valide
    const itemsJson = Array.isArray(items) ? JSON.stringify(items) : '[]';
    
    const query = `
      INSERT INTO sales (invoice_number, customer_name, customer_email, customer_phone, items, total_amount, payment_method, seller_id)
      VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8) RETURNING *
    `;
    
    try {
      const result = await pool.query(query, [
        invoice_number, 
        customer_name, 
        customer_email, 
        customer_phone, 
        itemsJson,
        total_amount, 
        payment_method, 
        seller_id
      ]);
      return result.rows[0];
    } catch (error) {
      console.error('Erreur SQL détaillée:', error);
      throw error;
    }
  }

  static async findAll() {
    const query = `
      SELECT s.*, u.name as seller_name, u.email as seller_email
      FROM sales s 
      LEFT JOIN users u ON s.seller_id = u.id 
      ORDER BY s.created_at DESC
    `;
    const result = await pool.query(query);
    
    // Parser les items JSON pour chaque vente
    return result.rows.map(sale => ({
      ...sale,
      items: typeof sale.items === 'string' ? JSON.parse(sale.items) : sale.items
    }));
  }

  static async findBySeller(seller_id) {
    const query = `
      SELECT s.*, u.name as seller_name, u.email as seller_email
      FROM sales s 
      LEFT JOIN users u ON s.seller_id = u.id 
      WHERE s.seller_id = $1 
      ORDER BY s.created_at DESC
    `;
    const result = await pool.query(query, [seller_id]);
    
    return result.rows.map(sale => ({
      ...sale,
      items: typeof sale.items === 'string' ? JSON.parse(sale.items) : sale.items
    }));
  }

  static async findById(id) {
    const query = `
      SELECT s.*, u.name as seller_name, u.email as seller_email
      FROM sales s 
      LEFT JOIN users u ON s.seller_id = u.id 
      WHERE s.id = $1
    `;
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const sale = result.rows[0];
    return {
      ...sale,
      items: typeof sale.items === 'string' ? JSON.parse(sale.items) : sale.items
    };
  }

  static async getSalesStats(period) {
    let dateFilter = '';
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
      default:
        dateFilter = '';
    }

    const query = `
      SELECT 
        COUNT(*) as total_sales,
        COALESCE(SUM(total_amount), 0) as total_revenue,
        AVG(total_amount) as average_sale
      FROM sales 
      ${dateFilter}
    `;
    const result = await pool.query(query);
    return result.rows[0];
  }

  static async getDailySales() {
    const query = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as sales_count,
        SUM(total_amount) as total_amount
      FROM sales 
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  }
}

module.exports = Sale;