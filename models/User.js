const pool = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  static async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'seller',
        is_active BOOLEAN DEFAULT true,
        
        -- Nouveaux champs
        nif VARCHAR(100) UNIQUE,
        passport_number VARCHAR(100) UNIQUE,
        phone VARCHAR(50),
        profile_picture VARCHAR(500),
        emergency_contact_name VARCHAR(255),
        emergency_contact_phone VARCHAR(50),
        address TEXT,
        
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await pool.query(query);
  }

  static async create(userData) {
    const { 
      email, password, name, role, created_by,
      nif, passport_number, phone, profile_picture, 
      emergency_contact_name, emergency_contact_phone, address 
    } = userData;
    
    const query = `
      INSERT INTO users (
        email, password, name, role, created_by,
        nif, passport_number, phone, profile_picture,
        emergency_contact_name, emergency_contact_phone, address
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
      RETURNING id, email, name, role, is_active, nif, passport_number, 
                phone, profile_picture, emergency_contact_name, 
                emergency_contact_phone, address, created_at
    `;
    
    const result = await pool.query(query, [
      email, password, name, role, created_by,
      nif, passport_number, phone, profile_picture,
      emergency_contact_name, emergency_contact_phone, address
    ]);
    return result.rows[0];
  }

  static async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await pool.query(query, [email]);
    return result.rows[0];
  }

  static async findById(id) {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }


    static async update(id, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updates).forEach(key => {
      if (key !== 'id') {
        fields.push(`${key} = $${paramCount}`);
        values.push(updates[key]);
        paramCount++;
      }
    });

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const query = `
      UPDATE users SET ${fields.join(', ')} 
      WHERE id = $${paramCount} 
      RETURNING id, email, name, role, is_active, nif, passport_number, 
                phone, profile_picture, emergency_contact_name, 
                emergency_contact_phone, address, created_at, updated_at
    `;
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async updateStatus(id, is_active) {
    const query = `
    UPDATE users 
    SET is_active = $1, updated_at = CURRENT_TIMESTAMP 
    WHERE id = $2 
    RETURNING id, email, name, role, is_active, created_at
  `;
    const result = await pool.query(query, [is_active, id]);
    return result.rows[0];
  }


  static async getAllSellers() {
    const query = `
      SELECT 
        id, email, name, role, is_active, 
        nif, passport_number, phone, profile_picture,
        emergency_contact_name, emergency_contact_phone, address,
        created_at, updated_at
      FROM users 
      WHERE role = 'seller' 
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  static async getActiveSellers() {
    const query = `
      SELECT id, email, name 
      FROM users 
      WHERE role = 'seller' AND is_active = true
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  static async getAllUsers() {
    const query = `
      SELECT 
        id, email, name, role, is_active, 
        nif, passport_number, phone, profile_picture,
        emergency_contact_name, emergency_contact_phone, address,
        created_at, updated_at
      FROM users 
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  }
}

module.exports = User;