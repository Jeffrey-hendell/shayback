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
      darkGray: '#7f8c8d',
      white: '#ffffff'
    };
  }

  generateInvoice(sale) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ 
          margin: 50,
          size: 'A4',
          info: {
            Title: `Facture ${sale.invoice_number}`,
            Author: 'JHY Solutions',
            Subject: 'Facture client',
            Creator: 'JHY Solutions Invoice System',
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
    // En-tête avec dégradé simulé
    doc.fillColor(this.colors.primary)
       .rect(0, 0, doc.page.width, 120)
       .fill();

    // Logo et nom de l'entreprise
    doc.fillColor(this.colors.white)
       .fontSize(24)
       .font('Helvetica-Bold')
       .text('JHY SOLUTIONS', 50, 40);

    doc.fillColor(this.colors.white)
       .fontSize(10)
       .font('Helvetica')
       .text('Votre partenaire technologique de confiance', 50, 70)
       .text('SAS au capital de 150 000 €', 50, 85);

    // Numéro de facture et dates
    const rightColumnX = 400;
    
    doc.fillColor(this.colors.white)
       .fontSize(16)
       .font('Helvetica-Bold')
       .text('FACTURE', rightColumnX, 40);

    this._createInfoBox(doc, rightColumnX, 65, [
      { label: 'N° Facture', value: sale.invoice_number },
      { label: 'Date', value: moment(sale.created_at).format('DD/MM/YYYY') },
      { label: 'Échéance', value: moment(sale.due_date || sale.created_at).add(30, 'days').format('DD/MM/YYYY') }
    ]);
  }

  _generateCustomerInfo(doc, sale) {
    const startY = 150;
    
    // Informations client
    doc.fillColor(this.colors.primary)
       .fontSize(12)
       .font('Helvetica-Bold')
       .text('FACTURÉ À', 50, startY);

    this._createAddressBox(doc, 50, startY + 20, {
      name: sale.customer_name,
      email: sale.customer_email,
      phone: sale.customer_phone,
      address: sale.customer_address,
      city: sale.customer_city,
      zipCode: sale.customer_zip
    });

    // Informations vendeur
    doc.fillColor(this.colors.primary)
       .fontSize(12)
       .font('Helvetica-Bold')
       .text('ÉMETTEUR', 300, startY);

    this._createAddressBox(doc, 300, startY + 20, {
      name: 'JHY SOLUTIONS',
      email: 'contact@jhysolutions.com',
      phone: '+33 1 23 45 67 89',
      address: '123 Avenue des Champs-Élysées',
      city: '75008 Paris',
      siret: '123 456 789 00012',
      vat: 'FR 12 34567 89'
    });
  }

  _generateInvoiceTable(doc, sale) {
    const tableTop = 280;
    
    // En-tête du tableau
    doc.fillColor(this.colors.primary)
       .rect(50, tableTop, 500, 25)
       .fill();

    doc.fillColor(this.colors.white)
       .fontSize(10)
       .font('Helvetica-Bold')
       .text('DESCRIPTION', 60, tableTop + 8)
       .text('QTÉ', 300, tableTop + 8)
       .text('PRIX UNIT.', 350, tableTop + 8)
       .text('TVA', 420, tableTop + 8)
       .text('TOTAL HT', 470, tableTop + 8);

    // Articles
    let currentY = tableTop + 25;
    
    sale.items.forEach((item, index) => {
      const isEven = index % 2 === 0;
      
      if (isEven) {
        doc.fillColor(this.colors.lightGray)
           .rect(50, currentY, 500, 20)
           .fill();
      }

      const vatRate = item.vat_rate || 20;
      const vatAmount = (item.subtotal * vatRate) / 100;
      const subtotalHT = item.subtotal - vatAmount;

      doc.fillColor(this.colors.primary)
         .fontSize(9)
         .font('Helvetica')
         .text(item.name, 60, currentY + 5, { width: 230 })
         .text(item.quantity.toString(), 300, currentY + 5)
         .text(`${this._formatCurrency(item.unit_price)}`, 350, currentY + 5)
         .text(`${vatRate}%`, 420, currentY + 5)
         .text(`${this._formatCurrency(subtotalHT)}`, 470, currentY + 5);

      currentY += 20;

      // Description supplémentaire si elle existe
      if (item.description) {
        doc.fillColor(this.colors.darkGray)
           .fontSize(8)
           .text(item.description, 60, currentY, { width: 230 });
        currentY += 15;
      }
    });

    // Ligne séparatrice
    doc.moveTo(50, currentY + 10)
       .lineTo(550, currentY + 10)
       .strokeColor(this.colors.darkGray)
       .lineWidth(0.5)
       .stroke();

    this._lastTableY = currentY + 20;
  }

  _generateTotals(doc, sale) {
    const startY = this._lastTableY;
    const rightColumnX = 400;

    const totals = this._calculateTotals(sale.items);

    const totalLines = [
      { label: 'Total HT', value: totals.totalHT },
      { label: 'TVA (20%)', value: totals.totalVAT },
      { label: 'Total TTC', value: totals.totalTTC, bold: true },
      { label: 'Escompte', value: -(sale.discount || 0) },
      { label: 'Total à payer', value: totals.totalTTC - (sale.discount || 0), bold: true, accent: true }
    ];

    totalLines.forEach((line, index) => {
      const y = startY + (index * 20);
      
      if (line.bold) {
        doc.font('Helvetica-Bold');
      } else {
        doc.font('Helvetica');
      }

      if (line.accent) {
        doc.fillColor(this.colors.accent);
      } else {
        doc.fillColor(this.colors.primary);
      }

      doc.fontSize(10)
         .text(line.label, rightColumnX, y)
         .text(this._formatCurrency(line.value), rightColumnX + 100, y);
    });
  }

  _generatePaymentInfo(doc, sale) {
    const startY = this._lastTableY + 120;

    doc.fillColor(this.colors.primary)
       .fontSize(11)
       .font('Helvetica-Bold')
       .text('INFORMATIONS DE PAIEMENT', 50, startY);

    doc.fillColor(this.colors.darkGray)
       .fontSize(9)
       .font('Helvetica')
       .text(`Méthode: ${sale.payment_method.toUpperCase()}`, 50, startY + 20)
       .text(`Statut: ${sale.payment_status || 'PAYÉ'}`, 50, startY + 35)
       .text(`Date de paiement: ${moment(sale.payment_date || sale.created_at).format('DD/MM/YYYY')}`, 50, startY + 50);

    // Instructions de paiement
    if (sale.payment_method.toLowerCase() === 'virement') {
      doc.text('Veuillez effectuer le virement sur le compte suivant:', 50, startY + 75)
         .text('IBAN: FR76 1234 5678 9123 4567 8901 234', 50, startY + 90)
         .text('BIC: ABCDFRPP', 50, startY + 105);
    }

    // Message de remerciement
    doc.fillColor(this.colors.success)
       .fontSize(10)
       .font('Helvetica-Oblique')
       .text('Merci pour votre confiance !', 400, startY + 30);
  }

  _generateFooter(doc, sale) {
    const footerY = doc.page.height - 80;

    doc.moveTo(50, footerY)
       .lineTo(550, footerY)
       .strokeColor(this.colors.darkGray)
       .lineWidth(0.5)
       .stroke();

    doc.fillColor(this.colors.darkGray)
       .fontSize(8)
       .text('JHY Solutions - SAS au capital de 150 000 € - RC Paris B 123 456 789', 50, footerY + 10)
       .text('123 Avenue des Champs-Élysées, 75008 Paris - Tel: +33 1 23 45 67 89', 50, footerY + 25)
       .text('Email: contact@jhysolutions.com - Site: www.jhysolutions.com', 50, footerY + 40)
       .text(`Facture générée le ${moment().format('DD/MM/YYYY à HH:mm')}`, 500, footerY + 40, { align: 'right' });
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

    let currentY = y + 15;
    
    if (address.email) {
      doc.font('Helvetica')
         .fontSize(9)
         .fillColor(this.colors.darkGray)
         .text(address.email, x, currentY);
      currentY += 12;
    }

    if (address.phone) {
      doc.text(address.phone, x, currentY);
      currentY += 12;
    }

    if (address.address) {
      doc.text(address.address, x, currentY);
      currentY += 12;
    }

    if (address.city) {
      doc.text(address.city, x, currentY);
      currentY += 12;
    }

    if (address.siret) {
      doc.text(`SIRET: ${address.siret}`, x, currentY);
      currentY += 12;
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
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  }
}

module.exports = new PDFGenerator();