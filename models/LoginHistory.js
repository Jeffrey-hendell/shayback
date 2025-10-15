const pool = require('../config/database');

class LoginHistory {
  static async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS login_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        ip_address VARCHAR(45),
        user_agent TEXT,
        device_type VARCHAR(50),
        login_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        success BOOLEAN DEFAULT true,
        failure_reason TEXT
      )
    `;
    await pool.query(query);
  }

  static async create(loginData) {
    const { user_id, ip_address, user_agent, device_type, success, failure_reason } = loginData;
    const query = `
      INSERT INTO login_history (user_id, ip_address, user_agent, device_type, success, failure_reason)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    `;
    const result = await pool.query(query, [
      user_id, ip_address, user_agent, device_type, success, failure_reason
    ]);
    return result.rows[0];
  }

  static async findByUserId(user_id) {
    const query = `
      SELECT * FROM login_history 
      WHERE user_id = $1 
      ORDER BY login_at DESC 
      LIMIT 50
    `;
    const result = await pool.query(query, [user_id]);
    return result.rows;
  }

  static async getAllHistory(limit = 100) {
    const query = `
      SELECT lh.*, u.name as user_name, u.email, u.role
      FROM login_history lh
      LEFT JOIN users u ON lh.user_id = u.id
      ORDER BY lh.login_at DESC 
      LIMIT $1
    `;
    const result = await pool.query(query, [limit]);
    return result.rows;
  }

  static async getRecentLogins(hours = 24) {
    const query = `
      SELECT lh.*, u.name as user_name, u.email, u.role
      FROM login_history lh
      LEFT JOIN users u ON lh.user_id = u.id
      WHERE lh.login_at >= NOW() - INTERVAL '${hours} hours'
      ORDER BY lh.login_at DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  static async getFailedLogins(limit = 50) {
    const query = `
      SELECT lh.*, u.name as user_name, u.email, u.role
      FROM login_history lh
      LEFT JOIN users u ON lh.user_id = u.id
      WHERE lh.success = false
      ORDER BY lh.login_at DESC 
      LIMIT $1
    `;
    const result = await pool.query(query, [limit]);
    return result.rows;
  }
}

module.exports = LoginHistory;
