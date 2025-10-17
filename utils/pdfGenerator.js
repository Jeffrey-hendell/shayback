const PDFDocument = require('pdfkit');
const moment = require('moment');

class PDFGenerator {
  constructor() {
    this.colors = {
      primary: '#2c3e50',
      secondary: '#3498db',
      accent: '#e74c3c',
      success: '#27ae60',
      lightGray: '#f8f9fa',
      mediumGray: '#ecf0f1',
      darkGray: '#7f8c8d',
      white: '#ffffff',
      border: '#bdc3c7'
    };
  }

  generateInvoice(sale) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ 
          margin: 50,
          size: 'A4',
          info: {
            Title: `Shaybusiness`,
            Author: 'Shay Business',
            Subject: 'Facture client',
            Creator: 'Shay Business Invoice System',
            CreationDate: new Date()
          }
        });

        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        this._generateHeader(doc, sale);
        this._generateCustomerInfo(doc, sale);
        this._generateInvoiceTable(doc, sale);
        this._generateTotals(doc, sale);
        this._generatePaymentInfo(doc, sale);
        this._generateFooter(doc, sale);
        this._generateWatermark(doc, sale);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  _generateHeader(doc, sale) {
    // En-tête avec design moderne
    doc.fillColor(this.colors.primary)
       .rect(0, 0, doc.page.width, 100)
       .fill();

    // Logo et nom de l'entreprise
    doc.fillColor(this.colors.white)
       .fontSize(22)
       .font('Helvetica-Bold')
       .text('SHAY BUSINESS', 50, 35);

    doc.fillColor('rgba(255,255,255,0.8)')
       .fontSize(9)
       .font('Helvetica')
       .text('Votre partenaire technologique de confiance', 50, 60)

    // Numéro de facture et dates
    const rightColumnX = 350;
    
    doc.fillColor(this.colors.white)
       .fontSize(18)
       .font('Helvetica-Bold')
       .text('FACTURE', rightColumnX, 35);

    this._createInfoBox(doc, rightColumnX, 60, [
      { label: 'N° Facture', value: sale.invoice_number },
      { label: 'Date', value: moment(sale.created_at).format('DD/MM/YYYY') },
      { label: 'Échéance', value: moment(sale.due_date || sale.created_at).add(30, 'days').format('DD/MM/YYYY') }
    ]);
  }

  _generateCustomerInfo(doc, sale) {
    const startY = 130;
    
    // Box client avec fond
    doc.fillColor(this.colors.mediumGray)
       .roundedRect(50, startY, 250, 80, 5)
       .fill();

    doc.fillColor(this.colors.primary)
       .fontSize(11)
       .font('Helvetica-Bold')
       .text('CLIENT', 60, startY + 15);

    this._createAddressBox(doc, 60, startY + 35, {
      name: sale.customer_name,
      email: sale.customer_email,
      phone: sale.customer_phone,
      address: sale.customer_address,
      city: sale.customer_city,
      zipCode: sale.customer_zip
    });

    // Box émetteur avec fond
    doc.fillColor(this.colors.mediumGray)
       .roundedRect(320, startY, 230, 80, 5)
       .fill();

    doc.fillColor(this.colors.primary)
       .fontSize(11)
       .font('Helvetica-Bold')
       .text('ÉMETTEUR', 330, startY + 15);

    this._createAddressBox(doc, 330, startY + 35, {
      name: 'SHAY BUSINESS',
      email: 'contact@jhysolutions.com',
    });
  }

  _generateInvoiceTable(doc, sale) {
    const tableTop = 240;
    
    // En-tête du tableau avec style moderne
    doc.fillColor(this.colors.primary)
       .roundedRect(50, tableTop, 500, 25, 3)
       .fill();

    doc.fillColor(this.colors.white)
       .fontSize(10)
       .font('Helvetica-Bold')
       .text('DESCRIPTION', 60, tableTop + 8)
       .text('QTÉ', 320, tableTop + 8)
       .text('PRIX UNIT.', 370, tableTop + 8)
       .text('TOTAL', 470, tableTop + 8);

    // Articles avec alternance de couleurs
    let currentY = tableTop + 25;
    
    sale.items.forEach((item, index) => {
      const isEven = index % 2 === 0;
      
      if (isEven) {
        doc.fillColor(this.colors.lightGray)
           .rect(50, currentY, 500, 25)
           .fill();
      }

      // Bordures des lignes
      doc.strokeColor(this.colors.border)
         .lineWidth(0.3)
         .rect(50, currentY, 500, 25)
         .stroke();

      doc.fillColor(this.colors.primary)
         .fontSize(9)
         .font('Helvetica')
         .text(item.name, 60, currentY + 8, { width: 240 })
         .text(item.quantity.toString(), 320, currentY + 8)
         .text(`${this._formatCurrency(item.unit_price)}`, 370, currentY + 8)
         .text(`${this._formatCurrency(item.subtotal)}`, 470, currentY + 8);

      currentY += 25;

      // Description supplémentaire
      if (item.description) {
        doc.fillColor(this.colors.darkGray)
           .fontSize(8)
           .text(item.description, 60, currentY - 5, { width: 240 });
        currentY += 10;
      }
    });

    this._lastTableY = currentY + 10;
  }

  _generateTotals(doc, sale) {
    const startY = this._lastTableY;
    const rightColumnX = 350;

    const totals = this._calculateTotals(sale.items);

    const totalLines = [
      { label: 'Sous-total HT', value: totals.totalHT },
      { label: 'TVA (20%)', value: totals.totalVAT },
      { label: 'Total TTC', value: totals.totalTTC, bold: true },
      { label: 'Escompte', value: -(sale.discount || 0) },
      { label: 'TOTAL À PAYER', value: totals.totalTTC - (sale.discount || 0), bold: true, accent: true }
    ];

    // Box des totaux
    doc.fillColor(this.colors.mediumGray)
       .roundedRect(rightColumnX - 10, startY + 50, 210, totalLines.length * 20 + 20, 5)
       .fill();

    totalLines.forEach((line, index) => {
      const y = startY + (index * 20) + 60;
      
      if (line.bold) {
        doc.font('Helvetica-Bold');
      } else {
        doc.font('Helvetica');
      }

      if (line.accent) {
        doc.fillColor(this.colors.accent);
        doc.fontSize(12);
      } else {
        doc.fillColor(this.colors.primary);
        doc.fontSize(10);
      }

      doc.text(line.label, rightColumnX, y)
         .text(this._formatCurrency(line.value), rightColumnX + 120, y);
    });
  }

  _generatePaymentInfo(doc, sale) {
    const startY = this._lastTableY + 200;

    // Box informations de paiement
    doc.fillColor(this.colors.mediumGray)
       .roundedRect(50, startY, 500, 80, 5)
       .fill();

    doc.fillColor(this.colors.primary)
       .fontSize(11)
       .font('Helvetica-Bold')
       .text('INFORMATIONS DE PAIEMENT', 60, startY + 15);

    doc.fillColor(this.colors.darkGray)
       .fontSize(9)
       .font('Helvetica')
       .text(`Méthode: ${sale.payment_method.toUpperCase()}`, 60, startY + 35)
       .text(`Statut: ${sale.payment_status || 'PAYÉ'}`, 60, startY + 50)
       .text(`Date de paiement: ${moment(sale.payment_date || sale.created_at).format('DD/MM/YYYY')}`, 60, startY + 65);


    // Message de remerciement
    doc.fillColor(this.colors.success)
       .fontSize(10)
       .font('Helvetica-Bold')
       .text('Merci pour votre confiance !', 400, startY + 15);
  }

  _generateFooter(doc, sale) {
    const footerY = doc.page.height - 60;

    // Ligne séparatrice
    doc.moveTo(50, footerY)
       .lineTo(550, footerY)
       .strokeColor(this.colors.border)
       .lineWidth(0.5)
       .stroke();

    // Informations de pied de page
    doc.fillColor(this.colors.white)
       .fontSize(7)

       .text('#00 Cap Haitien, Haiti - Tel: +50900000000', 50, 75, {
         width: 500,
         align: 'left'
       })
       .text(`Facture générée le ${moment().format('DD/MM/YYYY à HH:mm')}`, 50, 88, {
         width: 500,
         align: 'left'
       });
  }

  _generateWatermark(doc, sale) {
    if (sale.status === 'PROFORMA') {
      doc.fillColor('rgba(231, 76, 60, 0.1)')
         .fontSize(60)
         .font('Helvetica-Bold')
         .text('PROFORMA', 50, 300, {
           rotate: 45,
           align: 'center',
           width: doc.page.width - 100
         });
    }
  }

  _createInfoBox(doc, x, y, items) {
    items.forEach((item, index) => {
      doc.fillColor(this.colors.white)
         .fontSize(9)
         .font('Helvetica-Bold')
         .text(`${item.label}:`, x, y + (index * 15))
         .font('Helvetica')
         .text(item.value, x + 60, y + (index * 15));
    });
  }

  _createAddressBox(doc, x, y, address) {
    doc.fillColor(this.colors.primary)
       .fontSize(10)
       .font('Helvetica-Bold')
       .text(address.name, x, y);

    let currentY = y + 12;
    
    if (address.email) {
      doc.font('Helvetica')
         .fontSize(8)
         .fillColor(this.colors.darkGray)
         .text(address.email, x, currentY);
      currentY += 10;
    }

    if (address.phone) {
      doc.text(address.phone, x, currentY);
      currentY += 10;
    }

    if (address.address) {
      doc.text(address.address, x, currentY);
      currentY += 10;
    }

    if (address.city) {
      doc.text(address.city, x, currentY);
      currentY += 10;
    }

    if (address.siret) {
      doc.text(`SIRET: ${address.siret}`, x, currentY);
      currentY += 10;
    }

    if (address.vat) {
      doc.text(`TVA: ${address.vat}`, x, currentY);
    }
  }

  _calculateTotals(items) {
    let totalHT = 0;
    let totalVAT = 0;

    items.forEach(item => {
      const vatRate = item.vat_rate || 20;
      const vatAmount = (item.subtotal * vatRate) / 100;
      const subtotalHT = item.subtotal - vatAmount;
      
      totalHT += subtotalHT;
      totalVAT += vatAmount;
    });

    return {
      totalHT: totalHT,
      totalVAT: totalVAT,
      totalTTC: totalHT + totalVAT
    };
  }

  _formatCurrency(amount) {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount) + ' GDS';
  }
}

module.exports = new PDFGenerator();