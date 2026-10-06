const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Delivery = require('../models/Delivery');
const Driver = require('../models/Driver');
const Vehicle = require('../models/Vehicle');
const Route = require('../models/Route');

const JWT_SECRET = process.env.JWT_SECRET || 'smart_route_secret_key_super_secure_2026';

// Helper function to generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// @route   POST /api/auth/login
// @desc    Authenticate user & return token
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide both email and password' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = generateToken(user);

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Server error during login', error: error.message });
  }
});

// @route   POST /api/auth/register
// @desc    Register a new user (admin or driver)
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide name, email, and password' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }

    const user = new User({
      name,
      email: email.toLowerCase().trim(),
      password,
      role: role === 'driver' ? 'driver' : 'admin',
      phone: phone || ''
    });

    await user.save();
    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ success: false, message: 'Server error during registration', error: error.message });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user profile from token
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided, authorization denied' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({ success: true, user });
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
});

// @route   GET /api/auth/users
// @desc    Get all users (Admin view)
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    return res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error fetching users', error: error.message });
  }
});

// @route   POST /api/auth/seed-reset
// @desc    Reset and re-seed default demo dataset (Admin control)
router.post('/seed-reset', async (req, res) => {
  try {
    // Clear and restore deliveries
    await Delivery.deleteMany({});
    const drivers = await Driver.find();
    const vehicles = await Vehicle.find();

    const d1 = drivers[0] ? drivers[0]._id : null;
    const d2 = drivers[1] ? drivers[1]._id : null;
    const v1 = vehicles[0] ? vehicles[0]._id : null;
    const v2 = vehicles[1] ? vehicles[1]._id : null;

    await Delivery.insertMany([
      { customerName: 'Ananya Desai',  customerPhone: '+91 90001 11111', deliveryAddress: 'Hinjawadi Phase 1, IT Park, Pune 411057',         latitude: 18.5912, longitude: 73.7389, priority: 'urgent',   timeWindowStart: '09:00', timeWindowEnd: '12:00', packageWeight: 2.5, packageSize: 'medium', assignedDriver: d1, assignedVehicle: v1, status: 'out_for_delivery', plannedETA: '11:30 AM' },
      { customerName: 'Rohan Mehta',   customerPhone: '+91 90002 22222', deliveryAddress: 'Viman Nagar Cybercity Road, Pune 411014',           latitude: 18.5642, longitude: 73.9165, priority: 'standard', timeWindowStart: '10:00', timeWindowEnd: '14:00', packageWeight: 0.5, packageSize: 'small',  assignedDriver: d2, assignedVehicle: v2, status: 'assigned',        plannedETA: '12:15 PM' },
      { customerName: 'Sneha Joshi',   customerPhone: '+91 90003 33333', deliveryAddress: 'Pune Railway Station, Central Cargo Bay, Pune 411001', latitude: 18.5196, longitude: 73.8554, priority: 'urgent',   timeWindowStart: '08:00', timeWindowEnd: '11:00', packageWeight: 5.0, packageSize: 'large',  assignedDriver: d1, assignedVehicle: v1, status: 'pending',         plannedETA: '10:45 AM' },
      { customerName: 'Vikram Nair',   customerPhone: '+91 90004 44444', deliveryAddress: 'Kothrud Main Stand, Pune 411038',                   latitude: 18.4985, longitude: 73.8125, priority: 'standard', timeWindowStart: '12:00', timeWindowEnd: '17:00', packageWeight: 1.0, packageSize: 'small',  status: 'completed', plannedETA: '02:00 PM', actualDeliveryTime: new Date() },
      { customerName: 'Priya Singh',   customerPhone: '+91 90005 55555', deliveryAddress: 'FC Road Deccan Gymkhana, Pune 411004',              latitude: 18.5189, longitude: 73.8364, priority: 'standard', timeWindowStart: '13:00', timeWindowEnd: '18:00', packageWeight: 3.0, packageSize: 'medium', status: 'pending' },
      { customerName: 'Arjun Kulkarni',customerPhone: '+91 90006 66666', deliveryAddress: 'Baner Road Balewadi, Pune 411045',                   latitude: 18.5650, longitude: 73.7815, priority: 'standard', timeWindowStart: '09:00', timeWindowEnd: '18:00', packageWeight: 1.5, packageSize: 'small',  status: 'pending' }
    ]);

    return res.json({ success: true, message: 'Database demo dataset successfully re-seeded!' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Reset failed', error: error.message });
  }
});

module.exports = router;
