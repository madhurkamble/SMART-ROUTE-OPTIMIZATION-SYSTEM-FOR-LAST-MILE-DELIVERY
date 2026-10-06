# Smart Route Optimization System for Last-Mile Delivery

A complete, full-stack last-mile logistics and route optimization web application designed for fleet managers and delivery drivers. Built using beginner-friendly vanilla web technologies (Node.js, Express, MongoDB, Leaflet, and HTML5/CSS3/Vanilla JS).

---

## 📌 Problem Statement
Last-mile delivery is the single most expensive stage of logistics, accounting for more than 50% of total transport expenses. Urban delivery operations suffer from:
- Inefficient manual stop sequencing and excessive backtracking.
- Traffic congestion causing delivery delays and missed customer time windows.
- Uncontrolled fuel consumption cutting into profit margins.
- Poor coordination between fleet dispatchers and field drivers.
- Lack of performance analytics and key operational metrics.

---

## 🎯 Objectives
- Provide an intuitive multi-stop route planner that sequences delivery stops efficiently.
- Calculate accurate geographical distances using the mathematical **Haversine formula**.
- Prioritize time-critical ("Urgent") orders over standard packages.
- Account for urban traffic delays through a simulated multi-tier traffic model (Low 1.0x, Medium 1.2x, High 1.5x) with dynamic route recalculation.
- Estimate fuel consumption and fuel costs in Indian Rupees (₹) based on vehicle mileage and fuel type.
- Calculate approximate stop-by-stop arrival times (ETAs) including doorstep service durations.
- Provide a responsive driver portal for task execution, customer contact, and delivery status updates.
- Track fleet logistics KPIs (On-Time Delivery Rate, Completion Rate, Vehicle Utilization, and Planned vs. Actual Variance).

---

## ✨ Features
1. **Role-Based Authentication:** Clean login with Admin/Fleet Manager and Driver roles, with bcrypt password hashing and JWT sessions.
2. **Delivery Order Management:** Complete CRUD interface to create, edit, filter, and delete delivery orders with priority, weight, and delivery time windows.
3. **Driver Roster & Status Management:** Track driver licenses, assigned vehicles, on-time delivery counts, and availability states (`available`, `on_duty`, `off_duty`).
4. **Fleet Vehicle Tracking:** Manage vans, bikes, and trucks across Petrol, Diesel, and Electric fuel types with custom mileage parameters.
5. **Interactive Leaflet + OpenStreetMap:** Visual map displaying driver origin, numbered stops, and traffic-colored route lines without any paid Google Maps API keys.
6. **Smart Route Optimizer:** Priority-aware Nearest Neighbor algorithm with multi-factor route scoring.
7. **Dynamic Traffic Recalculation:** Simulate live traffic shifts during active transit and recalculate ETAs, fuel costs, and route scores with one click.
8. **Interactive Driver Execution Console:** Mobile-ready driver view showing assigned orders, customer phone links, delivery sequence, status updates (`Pending` $\rightarrow$ `Out for Delivery` $\rightarrow$ `Completed`), and issue/delay reporting.
9. **Logistics Performance Analytics:** Visual analytics dashboard tracking On-Time Rate, Completion Rate, Vehicle Utilization, and Planned vs. Actual Variance.
10. **Fleet Administration & Config Hub:** Manage user accounts, tune global logistics parameters (fuel prices, city speed), inspect dispatch audit logs, and restore sample datasets.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | HTML5, CSS3 (Flexbox & CSS Grid, Responsive), Vanilla JavaScript (ES6+ Fetch API) |
| **Backend** | Node.js, Express.js (Modular REST API Architecture) |
| **Database** | MongoDB, Mongoose ODM |
| **Mapping** | Leaflet.js, OpenStreetMap Tiles (100% Free & Open-Source) |
| **Security** | bcryptjs (Password Hashing), jsonwebtoken (JWT Auth), dotenv (Environment Isolation) |

*Zero complex frameworks (No React, Angular, Vue, Redux, Docker, or Kubernetes required).*

---

## 🏗️ Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                 FRONTEND (Vanilla HTML/CSS/JS)              │
│  Login │ Dashboard │ Deliveries │ Vehicles │ Route Planner  │
│  Driver Panel │ Analytics │ Admin Central Console           │
└──────────────────────────────┬──────────────────────────────┘
                               │  REST API calls (fetch + JWT)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 BACKEND (Node.js & Express.js)              │
│  ├── Auth & JWT Middleware                                  │
│  ├── Delivery, Driver & Vehicle CRUD Handlers               │
│  ├── Route Optimizer Engine (Nearest Neighbor + Priority)   │
│  ├── Haversine Distance & Distance Matrix Calculator        │
│  ├── Fuel Consumption & Cost Modeling Engine                │
│  ├── Traffic Simulator & Stop-by-Stop ETA Calculator        │
│  └── Analytics & Logistics KPI Aggregator                   │
└──────────────────────────────┬──────────────────────────────┘
                               │  Mongoose ODM
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      DATABASE (MongoDB)                     │
│  Users │ Deliveries │ Drivers │ Vehicles │ Routes │ Batches │
└─────────────────────────────────────────────────────────────┘
```

---

## 📂 Project Structure
```
SMART ROUTE OPTIMIZATION SYSTEM FOR LAST-MILE DELIVERY/
│
├── frontend/
│   ├── index.html              # Gateway session router
│   ├── login.html              # Authentication portal with demo auto-fills
│   ├── dashboard.html          # Operations dashboard with live delivery stream
│   ├── deliveries.html         # Delivery order management & CRUD modal
│   ├── vehicles.html           # Fleet vehicle management & driver assignment
│   ├── route-planner.html      # Interactive Leaflet map & route optimization
│   ├── driver-panel.html       # Driver live execution console & roster tabs
│   ├── analytics.html          # Fleet performance KPIs & variance analytics
│   ├── admin.html              # Central administration & global config hub
│   │
│   ├── css/
│   │   └── style.css           # Modular, responsive stylesheet
│   │
│   └── js/
│       ├── auth.js             # Session & JWT token management
│       ├── dashboard.js        # Live stream telemetry & KPI cards
│       ├── deliveries.js       # Deliveries CRUD fetch module
│       ├── vehicles.js         # Fleet vehicle CRUD & assignment
│       ├── route.js            # Route optimizer, traffic & Leaflet map engine
│       ├── driver.js           # Driver task execution & status lifecycle
│       ├── analytics.js        # Logistics analytics & KPI distribution
│       └── admin.js            # User management & parameter config
│
├── backend/
│   ├── server.js               # Express server entry point & auto-seeder
│   ├── package.json            # Dependencies & scripts
│   ├── .env                    # Local environment variables (Port, MongoDB URI)
│   ├── .env.example            # Environment template
│   │
│   ├── config/
│   │   └── db.js               # Mongoose MongoDB connection module
│   │
│   ├── models/
│   │   ├── User.js             # User credentials & role schema
│   │   ├── Delivery.js         # Delivery order schema with coordinates & priority
│   │   ├── Driver.js           # Driver roster & availability schema
│   │   ├── Vehicle.js          # Fleet vehicle specs, fuel & mileage schema
│   │   └── Route.js            # Persisted optimized multi-stop route schema
│   │
│   ├── routes/
│   │   ├── authRoutes.js       # Login, register, me, users, seed-reset
│   │   ├── dashboardRoutes.js  # Dashboard aggregation summary
│   │   ├── deliveryRoutes.js   # Delivery CRUD, status transitions & issue log
│   │   ├── driverRoutes.js     # Driver roster management
│   │   ├── vehicleRoutes.js    # Vehicle fleet management
│   │   ├── routeRoutes.js      # Optimization, recalculation & active lookup
│   │   └── analyticsRoutes.js  # Logistics KPIs & variance analysis
│   │
│   └── utils/
│       ├── distanceCalculator.js # Haversine formula & distance matrix
│       ├── etaCalculator.js      # Traffic factors & stop-by-stop ETAs
│       ├── fuelCalculator.js     # Mileage & fuel cost calculations
│       └── routeOptimizer.js     # Priority-aware Nearest Neighbor engine
│
├── docs/
│   └── PRD.md                  # Complete Product Requirements Document
│
├── screenshots/                # Real application interface captures
├── .gitignore                  # Git ignore rules
├── PROJECT_PROGRESS.md         # 6-Day development milestone tracker
└── README.md                   # Complete system documentation
```

---

## 👥 User Roles & Permissions

| Feature / Action | Fleet Manager / Admin | Delivery Driver |
|---|:---:|:---:|
| Login & View Dashboard | ✅ | ✅ |
| Create & Edit Delivery Orders | ✅ | ❌ |
| Manage Fleet Vehicles | ✅ | ❌ |
| Manage Driver Roster | ✅ | ❌ |
| Plan & Optimize Multi-Stop Routes | ✅ | ❌ |
| View Assigned Route on Interactive Map | ✅ | ✅ |
| Update Delivery Status (`Out for Delivery`, `Completed`) | ✅ | ✅ |
| Report Delay / Logistics Issue | ✅ | ✅ |
| View Analytics & Logistics KPIs | ✅ | ❌ |
| System User & Parameter Administration | ✅ | ❌ |

---

## 🧮 Route Optimization Logic
The system implements a **Priority-Aware Nearest Neighbor Algorithm**:
1. Departure begins from the driver's current coordinates.
2. At each iteration, all unvisited delivery orders are evaluated using their straight-line **Haversine** distance.
3. An **Urgent Priority Weighting Discount (0.6x)** is applied:
   $$\text{Effective Distance} = \text{Raw Haversine Distance} \times (\text{isUrgent} ? 0.6 : 1.0)$$
4. The candidate with the lowest effective cost is selected as the next stop.
5. The algorithm repeats until all selected stops are sequenced.

### Route Scoring Formula
$$\text{Route Score} = (\text{Distance} \times 1.5) + \text{Traffic Penalty} + \text{Fuel Cost} - \text{Priority Bonus}$$
- $\text{Traffic Penalty} = (\text{Traffic Factor} - 1.0) \times 25.0$
- $\text{Priority Bonus} = \text{Urgent Orders Count} \times 15.0$
*(Lower Route Score indicates higher cost-efficiency and delivery punctuality).*

---

## 🚦 Traffic Handling
Traffic is simulated using standardized multipliers:
- **LOW Traffic:** $1.0\times$ (Free-flow urban transit, base speed $35\text{ km/h}$)
- **MEDIUM Traffic:** $1.2\times$ (Normal urban daytime traffic, effective speed $\approx 29.2\text{ km/h}$)
- **HIGH Traffic:** $1.5\times$ (Peak congestion, effective speed $\approx 23.3\text{ km/h}$)

**Dynamic Recalculation:** If traffic worsens during active transit, clicking **"Recalculate Route"** updates driving times, delays, and stop ETAs in real-time.

---

## ⛽ Fuel Calculation
$$\text{Fuel Consumed} = \frac{\text{Route Distance (km)}}{\text{Vehicle Mileage (km/L)}}$$
$$\text{Total Fuel Cost} = \text{Fuel Consumed} \times \text{Unit Fuel Price (₹)}$$
$$\text{Cost Per Stop} = \frac{\text{Total Fuel Cost}}{\text{Number of Deliveries}}$$

Configurable unit prices (default):
- **Petrol:** ₹104.0 / Litre
- **Diesel:** ₹91.0 / Litre
- **Electric (EV):** ₹8.5 / kWh unit equivalent

---

## ⏰ ETA Calculation
$$\text{Driving Duration (mins)} = \left(\frac{\text{Distance}}{\text{Effective Speed}}\right) \times 60$$
$$\text{Service Duration (mins)} = \text{Stops Count} \times 5\text{ mins (handover)}$$
$$\text{Total Duration (mins)} = \text{Driving Duration} + \text{Service Duration}$$
$$\text{Final Stop ETA} = \text{Departure Time} + \text{Total Duration}$$

Stop-by-stop cumulative arrival and departure times are calculated incrementally for every point on the route.

---

## 📡 API Endpoints

### Authentication
- `POST /api/auth/login` — Authenticate user and return JWT token
- `POST /api/auth/register` — Register a new user account
- `GET /api/auth/me` — Verify token and get profile
- `GET /api/auth/users` — Get all users (Admin view)
- `POST /api/auth/seed-reset` — Restore default Pune logistics sample dataset

### Deliveries
- `GET /api/deliveries` — List all orders (with driver/vehicle populated)
- `POST /api/deliveries` — Create a new delivery order
- `GET /api/deliveries/:id` — Retrieve single delivery details
- `PUT /api/deliveries/:id` — Update order details
- `PUT /api/deliveries/:id/status` — Update delivery status (`out_for_delivery`, `completed`, `failed`)
- `POST /api/deliveries/:id/issue` — Report logistics delay or failure reason
- `DELETE /api/deliveries/:id` — Delete order

### Drivers & Vehicles
- `GET /api/drivers` / `POST /api/drivers` / `PUT /api/drivers/:id` / `DELETE /api/drivers/:id`
- `GET /api/vehicles` / `POST /api/vehicles` / `PUT /api/vehicles/:id` / `DELETE /api/vehicles/:id`

### Route Planning & Optimization
- `GET /api/routes/data` — Fetch active drivers, available vehicles, and pending orders
- `POST /api/routes/preview` — Preview optimized route without saving
- `POST /api/routes/optimize` — Run optimization, persist route, and assign driver/vehicle
- `POST /api/routes/:id/recalculate` — Dynamically recompute route under new traffic condition
- `GET /api/routes/driver/:driverId` — Fetch active route assigned to a driver
- `GET /api/routes/:id` — Get route details
- `GET /api/routes` — List all saved routes

### Dashboard & Analytics
- `GET /api/dashboard/summary` — Aggregate live KPI metrics and telemetry
- `GET /api/analytics` — Compute on-time rates, completion rates, vehicle utilization, and variance

---

## 📦 Database Models
1. **User:** `name`, `email`, `password` (hashed), `role` (`admin` | `driver`), `phone`, `createdAt`.
2. **Delivery:** `orderId`, `customerName`, `customerPhone`, `deliveryAddress`, `latitude`, `longitude`, `priority` (`urgent` | `standard`), `timeWindowStart`, `timeWindowEnd`, `packageWeight`, `packageSize`, `assignedDriver`, `assignedVehicle`, `status`, `plannedETA`, `actualDeliveryTime`, `failureReason`, `notes`.
3. **Driver:** `name`, `phone`, `email`, `licenseNumber`, `assignedVehicle`, `availability`, `currentLatitude`, `currentLongitude`, `completedDeliveries`, `failedDeliveries`, `onTimeDeliveries`.
4. **Vehicle:** `vehicleNumber`, `vehicleType`, `fuelType`, `mileage`, `fuelTankCapacity`, `loadCapacity`, `assignedDriver`, `availability`.
5. **Route:** `routeId`, `driver`, `vehicle`, `trafficCondition`, `trafficFactor`, `totalDistanceKm`, `totalDurationMinutes`, `estimatedETA`, `estimatedFuelLiters`, `estimatedFuelCost`, `routeScore`, `stops` (ordered array), `status`.

---

## 🚀 Installation & How to Run

### Prerequisites
- [Node.js](https://nodejs.org/) ($\ge 18.x$)
- [MongoDB](https://www.mongodb.com/) (Local service or MongoDB Atlas connection URI)

### Setup Steps
1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd "SMART ROUTE OPTIMIZATION SYSTEM FOR LAST-MILE DELIVERY"
   ```

2. **Install backend dependencies:**
   ```bash
   cd backend
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file inside the `backend/` directory:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://127.0.0.1:27017/smart_route_db
   JWT_SECRET=smart_route_secret_key_super_secure_2026
   ```

4. **Launch the server:**
   ```bash
   npm start
   # or with live reloading:
   npm run dev
   ```

5. **Open the Application:**
   Navigate in your browser to:
   ```
   http://localhost:5000/login.html
   ```

---

## 🔐 Default Demo Accounts

| Role | Email | Password | Access |
|---|---|---|---|
| **Fleet Manager / Admin** | `admin@lastmile.com` | `admin123` | Full system access to all 8 modules |
| **Delivery Driver** | `rahul@lastmile.com` | `driver123` | Driver dispatch console & task execution |

*(Both accounts and realistic Pune logistics sample data are auto-seeded on initial server launch).*

---

## 📸 Screenshots
Real captures of all functional application views are saved in the [`screenshots/`](./screenshots) folder:
- **Login Portal:** [`screenshots/01-login.png`](./screenshots)
- **Operations Dashboard:** [`screenshots/02-dashboard.png`](./screenshots)
- **Deliveries Management:** [`screenshots/03-deliveries.png`](./screenshots)
- **Fleet Vehicles:** [`screenshots/04-vehicles.png`](./screenshots)
- **Route Planner & Leaflet Map:** [`screenshots/05-route-planner.png`](./screenshots)
- **Driver Dispatch Console:** [`screenshots/06-driver-panel.png`](./screenshots)
- **Performance Analytics:** [`screenshots/07-analytics.png`](./screenshots)
- **Admin Command Hub:** [`screenshots/08-admin.png`](./screenshots)

---

## 🌐 Deployment Guide

### Database (MongoDB Atlas)
1. Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a database user and allow network access (`0.0.0.0/0`).
3. Copy the Atlas connection string into your backend `.env` as `MONGODB_URI`.

### Backend (Render)
1. Create a new **Web Service** on [Render](https://render.com/).
2. Point to the repository with **Root Directory** set to `backend`.
3. Set **Build Command:** `npm install` and **Start Command:** `node server.js`.
4. Add environment variables: `PORT=5000`, `MONGODB_URI`, `JWT_SECRET`.

### Frontend (Netlify / Vercel / Render Static)
Since the Express backend is already configured to serve the `frontend/` static assets directly via `app.use(express.static('../frontend'))`, deploying the backend web service on Render automatically serves the full frontend web application!

---

## 🔮 Future Enhancements
- Turn-by-turn road geometry using Open Source Routing Machine (OSRM).
- Live driver GPS location telemetry via WebSocket streaming.
- Multi-vehicle capacity partitioning (Capacitated Vehicle Routing Problem).
- Automated SMS/WhatsApp customer arrival notifications.
- Carbon emission footprint tracker ($CO_2\text{ kg}$ saved).

---

## 👨‍💻 Author
Developed as a Student-Level MVP for Last-Mile Logistics Optimization.
Project completed over a structured 6-day engineering lifecycle.
