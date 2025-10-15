const Sale = require('../models/Sale');
const exceljs = require('exceljs');

class ReportController {
  async getSalesStats(req, res) {
    try {
      const { period } = req.params;
      
      const stats = await Sale.getSalesStats(period);
      const dailySales = await Sale.getDailySales();
      
      res.json({
        period,
        stats,
        daily_sales: dailySales
      });
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
    }
  }

  async exportSalesToExcel(req, res) {
    try {
      const sales = await Sale.findAll();
      
      const workbook = new exceljs.Workbook();
      const worksheet = workbook.addWorksheet('Ventes');
      
      // En-têtes
      worksheet.columns = [
        { header: 'N° Facture', key: 'invoice_number', width: 20 },
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Client', key: 'customer_name', width: 20 },
        { header: 'Email Client', key: 'customer_email', width: 25 },
        { header: 'Vendeur', key: 'seller_name', width: 20 },
        { header: 'Montant Total', key: 'total_amount', width: 15 },
        { header: 'Méthode Paiement', key: 'payment_method', width: 20 }
      ];
      
      // Données
      sales.forEach(sale => {
        worksheet.addRow({
          invoice_number: sale.invoice_number,
          date: new Date(sale.created_at).toLocaleDateString(),
          customer_name: sale.customer_name,
          customer_email: sale.customer_email,
          seller_name: sale.seller_name,
          total_amount: sale.total_amount,
          payment_method: sale.payment_method
        });
      });
      
      // Style
      worksheet.getRow(1).font = { bold: true };
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=ventes.xlsx');
      
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors de l\'export Excel' });
    }
  }
}

module.exports = new ReportController();