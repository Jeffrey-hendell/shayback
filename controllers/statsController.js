const pool = require('../config/database');

class StatsController {
  async getSalesStats(req, res) {
    try {
      const { period = 'month' } = req.params;

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
          AVG(total_amount) as average_sale,
          COUNT(DISTINCT seller_id) as active_sellers_count
        FROM sales 
        ${dateFilter}
      `;

      const result = await pool.query(query);
      res.json({ stats: result.rows[0] });
    } catch (error) {
      console.error('Erreur stats ventes:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
    }
  }

async getSellerStats(req, res) {
  try {
    // console.log('🔄 Récupération des statistiques vendeurs...');

    // Vendeurs actifs/inactifs
    const sellerStatsQuery = `
      SELECT 
        COUNT(*) as total_sellers,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_sellers,
        COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_sellers
      FROM users 
      WHERE role = 'seller'
    `;

    // Produits les plus vendus - Version simplifiée
    const topProductsQuery = `
      SELECT 
        p.name,
        p.category,
        COALESCE(SUM((item->>'quantity')::int), 0) as total_quantity,
        COALESCE(SUM((item->>'subtotal')::numeric), 0) as total_revenue
      FROM products p
      LEFT JOIN sales s ON true
      LEFT JOIN LATERAL jsonb_array_elements(s.items) AS item ON (item->>'product_id')::int = p.id
      WHERE p.is_active = true
      GROUP BY p.id, p.name, p.category
      ORDER BY total_quantity DESC
      LIMIT 10
    `;

    // Performance des vendeurs
    const sellerPerformanceQuery = `
      SELECT 
        u.id,
        u.name,
        u.email,
        COUNT(s.id) as total_sales,
        COALESCE(SUM(s.total_amount), 0) as total_revenue,
        COALESCE(AVG(s.total_amount), 0) as average_sale
      FROM users u
      LEFT JOIN sales s ON u.id = s.seller_id
      WHERE u.role = 'seller' AND u.is_active = true
      GROUP BY u.id, u.name, u.email
      ORDER BY total_revenue DESC
    `;

    // Statistiques produits
    const productStatsQuery = `
      SELECT 
        COUNT(*) as total_products,
        COUNT(CASE WHEN stock > 0 THEN 1 END) as in_stock_products,
        COUNT(CASE WHEN stock = 0 THEN 1 END) as out_of_stock_products,
        COALESCE(SUM(stock), 0) as total_stock,
        COALESCE(AVG(selling_price), 0) as average_price
      FROM products
      WHERE is_active = true
    `;

    // Répartition par catégorie - Version simplifiée
    const categoryDistributionQuery = `
      SELECT 
        p.category,
        COUNT(p.id) as product_count,
        COALESCE(SUM((item->>'quantity')::int), 0) as total_sold,
        COALESCE(SUM((item->>'subtotal')::numeric), 0) as total_revenue
      FROM products p
      LEFT JOIN sales s ON true
      LEFT JOIN LATERAL jsonb_array_elements(s.items) AS item ON (item->>'product_id')::int = p.id
      WHERE p.is_active = true
      GROUP BY p.category
      ORDER BY total_sold DESC
    `;

    // Ventes quotidiennes
    const dailySalesQuery = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as sales_count,
        COALESCE(SUM(total_amount), 0) as total_amount
      FROM sales 
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    const [
      sellerStats,
      topProducts,
      sellerPerformance,
      productStats,
      categoryDistribution,
      dailySales
    ] = await Promise.all([
      pool.query(sellerStatsQuery),
      pool.query(topProductsQuery),
      pool.query(sellerPerformanceQuery),
      pool.query(productStatsQuery),
      pool.query(categoryDistributionQuery),
      pool.query(dailySalesQuery)
    ]);

    // console.log('📊 Statistiques calculées:');
    // console.log('- Vendeurs:', sellerStats.rows[0]);
    // console.log('- Produits top:', topProducts.rows.length);
    // console.log('- Performance vendeurs:', sellerPerformance.rows.length);
    // console.log('- Stats produits:', productStats.rows[0]);
    // console.log('- Catégories:', categoryDistribution.rows.length);
    // console.log('- Ventes quotidiennes:', dailySales.rows.length);

    const result = {
      seller_stats: sellerStats.rows[0] || { total_sellers: 0, active_sellers: 0, inactive_sellers: 0 },
      top_products: topProducts.rows || [],
      seller_performance: sellerPerformance.rows || [],
      product_stats: productStats.rows[0] || { total_products: 0, in_stock_products: 0, out_of_stock_products: 0, total_stock: 0, average_price: 0 },
      category_distribution: categoryDistribution.rows || [],
      daily_sales: dailySales.rows || []
    };

    res.json(result);

  } catch (error) {
    console.error('❌ Erreur statistiques:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des statistiques',
      details: error.message 
    });
  }
}

  async getCategoryStats(req, res) {
    try {
      const query = `
        SELECT 
          category,
          COUNT(*) as product_count,
          SUM(stock) as total_stock,
          AVG(selling_price) as average_price
        FROM products 
        WHERE is_active = true
        GROUP BY category
        ORDER BY product_count DESC
      `;

      const result = await pool.query(query);
      res.json({ categories: result.rows });
    } catch (error) {
      console.error('Erreur stats catégories:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération des statistiques par catégorie' });
    }
  }
}

module.exports = new StatsController();