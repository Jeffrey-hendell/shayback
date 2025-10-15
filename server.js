const express = require('express');
const cors = require('cors');
require('dotenv').config();
const requestIp = require('request-ip');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const productRoutes = require('./routes/products');
const saleRoutes = require('./routes/sales');
const loginHistoryRoutes = require('./routes/loginHistory');
const ipTracker = require('./middleware/ipTracker');

const User = require('./models/User');
const Product = require('./models/Product');
const Sale = require('./models/Sale');
const LoginHistory = require('./models/LoginHistory');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(ipTracker);
app.use(requestIp.mw()); 

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/login-history', loginHistoryRoutes);

// Route de santé
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    clientIp: req.clientIp 
  });
});
// Initialisation de la base de données
// async function initializeDatabase() {
//   try {
//     await User.createTable();
//     await Product.createTable();
//     await Sale.createTable();
//     await LoginHistory.createTable();
    
//     // Créer un admin par défaut si aucun admin n'existe
//     const adminExists = await User.findByEmail('contact@jhysolutions.com');
//     if (!adminExists) {
//       const bcrypt = require('bcryptjs');
//       const hashedPassword = await bcrypt.hash('Jhystrong%Jeffrey120', 10);
      
//       await User.create({
//         email: 'contact@jhysolutions.com',
//         password: hashedPassword,
//         name: 'Admin',
//         role: 'admin',
//         created_by: null
//       });
//       console.log('Compte admin créé: contact@jhysolutions.com / Jhystrong%Jeffrey120');
//     }
    
//     console.log('Base de données initialisée avec succès');
//   } catch (error) {
//     console.error('Erreur lors de l\'initialisation de la base de données:', error);
//   }
// }

app.get('/api/reports/sales/excel', require('./middleware/auth').auth, require('./middleware/auth').adminAuth, async (req, res) => {
  const Sale = require('./models/Sale');
  const ExcelGenerator = require('./utils/excelGenerator');
  
  const sales = await Sale.findAll();
  await ExcelGenerator.generateSalesReport(sales, res);
});

// Gestion des erreurs
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Erreur interne du serveur' });
});


const PORT = process.env.PORT || 4000;

app.listen(PORT, async () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
  // await initializeDatabase();
});