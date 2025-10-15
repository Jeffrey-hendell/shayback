const pool = require('../config/database');

class Product {
  static async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100) NOT NULL,
        purchase_price DECIMAL(10,2) NOT NULL,
        selling_price DECIMAL(10,2) NOT NULL,
        discount DECIMAL(5,2) DEFAULT 0,
        stock INTEGER NOT NULL,
        image_urls TEXT[],
        is_active BOOLEAN DEFAULT true,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await pool.query(query);
  }

  static async create(productData) {
    const { name, description, category, purchase_price, selling_price, discount, stock, image_urls, created_by } = productData;
    const query = `
      INSERT INTO products (name, description, category, purchase_price, selling_price, discount, stock, image_urls, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *
    `;
    const result = await pool.query(query, [
      name, description, category, purchase_price, selling_price, discount, stock, image_urls, created_by
    ]);
    return result.rows[0];
  }

  static async update(id, productData) {
    const { name, description, category, purchase_price, selling_price, discount, stock, image_urls } = productData;
    const query = `
      UPDATE products 
      SET name = $1, description = $2, category = $3, purchase_price = $4, 
          selling_price = $5, discount = $6, stock = $7, image_urls = $8, updated_at = CURRENT_TIMESTAMP
      WHERE id = $9 RETURNING *
    `;
    const result = await pool.query(query, [
      name, description, category, purchase_price, selling_price, discount, stock, image_urls, id
    ]);
    return result.rows[0];
  }

  static async updateStock(id, newStock) {
    const query = 'UPDATE products SET stock = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *';
    const result = await pool.query(query, [newStock, id]);
    return result.rows[0];
  }

  static async findAll() {
    const query = 'SELECT * FROM products WHERE is_active = true ORDER BY created_at DESC';
    const result = await pool.query(query);
    return result.rows;
  }

  static async findById(id) {
    const query = 'SELECT * FROM products WHERE id = $1 AND is_active = true';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async delete(id) {
    const query = 'UPDATE products SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1';
    await pool.query(query, [id]);
  }
}

module.exports = Product;