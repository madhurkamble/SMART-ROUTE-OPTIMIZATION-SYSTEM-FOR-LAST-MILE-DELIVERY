const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const User = require('./models/User');
const Driver = require('./models/Driver');
const Vehicle = require('./models/Vehicle');
const Delivery = require('./models/Delivery');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB().then(() => {
  seedDefaultAccounts();
});

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// ── API Routes ─────────────────────────────────────────────
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/deliveries', require('./routes/deliveryRoutes'));
app.use('/api/drivers', require('./routes/driverRoutes'));
app.use('/api/vehicles', require('./routes/vehicleRoutes'));

// Root → login page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err.stack);
  res.status(500).json({ success: false, message: 'Internal Server Error' });
});

// ── Seed Sample Data ────────────────────────────────────────
async function seedDefaultAccounts() {
  try {
    // 1. Auth users
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount === 0) {
      await new User({ name: 'Fleet Admin', email: 'admin@lastmile.com', password: 'admin123', role: 'admin', phone: '+91 98765 43210' }).save();
      console.log('👤 Admin seeded: admin@lastmile.com / admin123');
    }
    const driverUserCount = await User.countDocuments({ role: 'driver' });
    if (driverUserCount === 0) {
      await new User({ name: 'Rahul Sharma', email: 'rahul@lastmile.com', password: 'driver123', role: 'driver', phone: '+91 91234 56789' }).save();
      console.log('🚚 Driver user seeded: rahul@lastmile.com / driver123');
    }

    // 2. Vehicles (seed only if collection is empty)
    const vehicleCount = await Vehicle.countDocuments();
    if (vehicleCount === 0) {
      const vehicles = await Vehicle.insertMany([
        { vehicleNumber: 'MH12AB1234', vehicleType: 'van',   fuelType: 'diesel',  mileage: 14, fuelTankCapacity: 60, loadCapacity: 800,  availability: 'available' },
        { vehicleNumber: 'MH12CD5678', vehicleType: 'bike',  fuelType: 'petrol',  mileage: 45, fuelTankCapacity: 12, loadCapacity: 30,   availability: 'available' },
        { vehicleNumber: 'MH14EF9012', vehicleType: 'van',   fuelType: 'petrol',  mileage: 16, fuelTankCapacity: 50, loadCapacity: 700,  availability: 'in_use'   },
        { vehicleNumber: 'MH14GH3456', vehicleType: 'truck', fuelType: 'diesel',  mileage: 8,  fuelTankCapacity: 150, loadCapacity: 5000, availability: 'available' },
        { vehicleNumber: 'MH20EV0001', vehicleType: 'bike',  fuelType: 'electric', mileage: 80, fuelTankCapacity: 0,  loadCapacity: 25,   availability: 'available' }
      ]);
      console.log(`🚗 ${vehicles.length} vehicles seeded`);

      // 3. Drivers
      const driverCount = await Driver.countDocuments();
      if (driverCount === 0) {
        const drivers = await Driver.insertMany([
          { name: 'Rahul Sharma',  phone: '+91 91234 56789', email: 'rahul.driver@lastmile.com',  licenseNumber: 'MH0120230001', assignedVehicle: vehicles[0]._id, availability: 'on_duty',   completedDeliveries: 47, onTimeDeliveries: 43, currentLatitude: 18.5595, currentLongitude: 73.7869 },
          { name: 'Amit Patil',   phone: '+91 98765 12340', email: 'amit.driver@lastmile.com',   licenseNumber: 'MH0120230002', assignedVehicle: vehicles[1]._id, availability: 'available', completedDeliveries: 31, onTimeDeliveries: 29, currentLatitude: 18.5642, currentLongitude: 73.9165 },
          { name: 'Pooja Verma',  phone: '+91 87654 32109', email: 'pooja.driver@lastmile.com',  licenseNumber: 'MH0120230003', assignedVehicle: vehicles[2]._id, availability: 'on_duty',   completedDeliveries: 23, onTimeDeliveries: 21, currentLatitude: 18.4985, currentLongitude: 73.8478 },
          { name: 'Suresh Kumar', phone: '+91 76543 21098', email: 'suresh.driver@lastmile.com', licenseNumber: 'MH0120230004', assignedVehicle: null,            availability: 'off_duty',  completedDeliveries: 15, onTimeDeliveries: 12, currentLatitude: 18.5204, currentLongitude: 73.8567 }
        ]);
        console.log(`👤 ${drivers.length} drivers seeded`);

        // Link vehicles → drivers
        await Vehicle.findByIdAndUpdate(vehicles[0]._id, { assignedDriver: drivers[0]._id });
        await Vehicle.findByIdAndUpdate(vehicles[1]._id, { assignedDriver: drivers[1]._id });
        await Vehicle.findByIdAndUpdate(vehicles[2]._id, { assignedDriver: drivers[2]._id });

        // 4. Sample Deliveries
        const deliveryCount = await Delivery.countDocuments();
        if (deliveryCount === 0) {
          await Delivery.insertMany([
            { customerName: 'Ananya Desai',  customerPhone: '+91 90001 11111', deliveryAddress: 'Hinjawadi Phase 1, IT Park, Pune 411057',         latitude: 18.5912, longitude: 73.7389, priority: 'urgent',   timeWindowStart: '09:00', timeWindowEnd: '12:00', packageWeight: 2.5, packageSize: 'medium', assignedDriver: drivers[0]._id, assignedVehicle: vehicles[0]._id, status: 'out_for_delivery', plannedETA: '11:30 AM' },
            { customerName: 'Rohan Mehta',   customerPhone: '+91 90002 22222', deliveryAddress: 'Viman Nagar Cybercity Road, Pune 411014',           latitude: 18.5642, longitude: 73.9165, priority: 'standard', timeWindowStart: '10:00', timeWindowEnd: '14:00', packageWeight: 0.5, packageSize: 'small',  assignedDriver: drivers[1]._id, assignedVehicle: vehicles[1]._id, status: 'assigned',        plannedETA: '12:15 PM' },
            { customerName: 'Sneha Joshi',   customerPhone: '+91 90003 33333', deliveryAddress: 'Pune Railway Station, Central Cargo Bay, Pune 411001', latitude: 18.5196, longitude: 73.8554, priority: 'urgent',   timeWindowStart: '08:00', timeWindowEnd: '11:00', packageWeight: 5.0, packageSize: 'large',  assignedDriver: drivers[0]._id, assignedVehicle: vehicles[0]._id, status: 'pending',         plannedETA: '10:45 AM' },
            { customerName: 'Vikram Nair',   customerPhone: '+91 90004 44444', deliveryAddress: 'Kothrud Main Stand, Pune 411038',                   latitude: 18.4985, longitude: 73.8125, priority: 'standard', timeWindowStart: '12:00', timeWindowEnd: '17:00', packageWeight: 1.0, packageSize: 'small',  assignedDriver: drivers[2]._id, assignedVehicle: vehicles[2]._id, status: 'completed',       plannedETA: '02:00 PM', actualDeliveryTime: new Date() },
            { customerName: 'Priya Singh',   customerPhone: '+91 90005 55555', deliveryAddress: 'FC Road Deccan Gymkhana, Pune 411004',              latitude: 18.5189, longitude: 73.8364, priority: 'standard', timeWindowStart: '13:00', timeWindowEnd: '18:00', packageWeight: 3.0, packageSize: 'medium', status: 'pending' },
            { customerName: 'Arjun Kulkarni',customerPhone: '+91 90006 66666', deliveryAddress: 'Baner Road Balewadi, Pune 411045',                   latitude: 18.5650, longitude: 73.7815, priority: 'standard', timeWindowStart: '09:00', timeWindowEnd: '18:00', packageWeight: 1.5, packageSize: 'small',  status: 'pending' }
          ]);
          console.log('📦 Sample deliveries seeded');
        }
      }
    }
  } catch (error) {
    console.error('Seeding warning:', error.message);
  }
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🌐 Frontend: http://localhost:${PORT}/login.html`);
});
