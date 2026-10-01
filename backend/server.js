const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const User = require('./models/User');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB().then(() => {
  // Auto-seed default demonstration accounts if database is fresh
  seedDefaultAccounts();
});

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));

// Root route redirects to login or dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

// Seed default demonstration users
async function seedDefaultAccounts() {
  try {
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount === 0) {
      const admin = new User({
        name: 'Fleet Admin',
        email: 'admin@lastmile.com',
        password: 'admin123',
        role: 'admin',
        phone: '+91 98765 43210'
      });
      await admin.save();
      console.log('👤 Default Admin account created: admin@lastmile.com / admin123');
    }

    const driverCount = await User.countDocuments({ role: 'driver' });
    if (driverCount === 0) {
      const driver = new User({
        name: 'Madhur Kamble',
        email: 'madhur@lastmile.com',
        password: 'driver123',
        role: 'driver',
        phone: '+91 91234 56789'
      });
      await driver.save();
      console.log('🚚 Default Driver account created: madhur@lastmile.com / driver123');
    }
  } catch (error) {
    console.error('Seeding warning:', error.message);
  }
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err.stack);
  res.status(500).json({ success: false, message: 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🌐 Frontend accessible at http://localhost:${PORT}/login.html`);
});
