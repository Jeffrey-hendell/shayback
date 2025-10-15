const excelGenerator = require('../utils/excelGenerator');
const pdfGenerator = require('../utils/pdfGenerator');

class ExportController {
  async exportSalesExcel(req, res) {
    try {
      const { period = 'month', type = 'sales' } = req.query;
      
      let workbook;
      let filename;

      switch (type) {
        case 'products':
          workbook = await excelGenerator.generateProductsReport();
          filename = `rapport-produits-${new Date().toISOString().split('T')[0]}.xlsx`;
          break;
        case 'sellers':
          workbook = await excelGenerator.generateSellersReport();
          filename = `rapport-vendeurs-${new Date().toISOString().split('T')[0]}.xlsx`;
          break;
        case 'sales':
        default:
          workbook = await excelGenerator.generateSalesReport(period);
          filename = `rapport-ventes-${period}-${new Date().toISOString().split('T')[0]}.xlsx`;
          break;
      }

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error('Erreur export Excel:', error);
      res.status(500).json({ error: 'Erreur lors de la génération du fichier Excel' });
    }
  }

  async exportSalesPDF(req, res) {
    try {
      const { period = 'month', type = 'sales' } = req.query;
      
      let pdfBuffer;
      let filename;

      switch (type) {
        case 'products':
          pdfBuffer = await pdfGenerator.generateProductsReport();
          filename = `rapport-produits-${new Date().toISOString().split('T')[0]}.pdf`;
          break;
        case 'sellers':
          pdfBuffer = await pdfGenerator.generateSellersReport();
          filename = `rapport-vendeurs-${new Date().toISOString().split('T')[0]}.pdf`;
          break;
        case 'sales':
        default:
          pdfBuffer = await pdfGenerator.generateSalesReport(period);
          filename = `rapport-ventes-${period}-${new Date().toISOString().split('T')[0]}.pdf`;
          break;
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Erreur export PDF:', error);
      res.status(500).json({ error: 'Erreur lors de la génération du fichier PDF' });
    }
  }

  async exportFullReport(req, res) {
    try {
      const { period = 'month' } = req.query;
      const workbook = new (require('exceljs').Workbook)();
      
      // Générer tous les rapports
      const salesReport = await excelGenerator.generateSalesReport(period);
      const productsReport = await excelGenerator.generateProductsReport();
      const sellersReport = await excelGenerator.generateSellersReport();

      // Copier les feuilles dans un seul workbook
      salesReport.worksheets.forEach(worksheet => {
        workbook.addWorksheet(worksheet.name, worksheet);
      });
      productsReport.worksheets.forEach(worksheet => {
        workbook.addWorksheet(worksheet.name, worksheet);
      });
      sellersReport.worksheets.forEach(worksheet => {
        workbook.addWorksheet(worksheet.name, worksheet);
      });

      const filename = `rapport-complet-${new Date().toISOString().split('T')[0]}.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error('Erreur export complet:', error);
      res.status(500).json({ error: 'Erreur lors de la génération du rapport complet' });
    }
  }
}

module.exports = new ExportController();