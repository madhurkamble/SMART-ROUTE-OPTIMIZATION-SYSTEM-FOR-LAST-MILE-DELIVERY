# Smart Route Optimization System for Last-Mile Delivery

A complete, full-stack last-mile logistics and route optimization web application designed for fleet managers and delivery drivers. Built using beginner-friendly vanilla web technologies (Node.js, Express, MongoDB, Leaflet, and HTML5/CSS3/Vanilla JS).

---

## 🌐 Live Application & Web Documentation (HTTPS)

- **Live Application Deployment (Production):**  
  [https://smart-route-optimization-system-for.vercel.app/login.html](https://smart-route-optimization-system-for.vercel.app/login.html)
- **Interactive System Documentation Portal (Web / HTTPS):**  
  [https://smart-route-optimization-system-for.vercel.app/docs.html](https://smart-route-optimization-system-for.vercel.app/docs.html) *(or local: `http://localhost:5000/docs.html`)*
- **Product Requirements Document (PRD):**  
  [`docs/PRD.md`](./docs/PRD.md)

---

## 📌 Problem Statement
Last-mile delivery is the single most expensive stage of logistics, accounting for more than 53% of total transport expenses. Urban delivery operations suffer from:
- Inefficient manual stop sequencing and excessive backtracking.
- Traffic congestion causing delivery delays and missed customer time windows.
- Uncontrolled fuel consumption cutting into profit margins.
- Poor coordination between fleet dispatchers and field drivers.
- Lack of performance analytics and key operational metrics.

---

## 🎯 Objectives
- Provide an intuitive multi-stop route planner that sequences delivery stops efficiently.
- Calculate accurate geographical distances using the mathematical **Haversine formula**.
- Prioritize time-critical ("Urgent") orders over standard packages (40% distance discount).
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
11. **Interactive Web Documentation Portal:** Complete documentation page accessible in browser over HTTP/HTTPS at `/docs.html`.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | HTML5, CSS3 (Flexbox & CSS Grid, Responsive), Vanilla JavaScript (ES6+ Fetch API) |
| **Backend** | Node.js, Express.js (Modular REST API Architecture, Serverless compatible) |
| **Database** | MongoDB, Mongoose ODM |
| **Mapping** | Leaflet.js, OpenStreetMap Vector Tiles (100% Free & Open-Source) |
| **Security** | bcryptjs (Password Hashing), jsonwebtoken (JWT Auth), dotenv (Environment Isolation) |

*Zero complex frameworks (No React, Angular, Vue, Redux, Docker, or Kubernetes required).*

---

## 🏗️ Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                 FRONTEND (Vanilla HTML/CSS/JS)              │
│  Login │ Dashboard │ Deliveries │ Vehicles │ Route Planner  │
│  Driver Panel │ Analytics │ Admin Central Hub │ Docs Portal │
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
│   ├── docs.html               # Comprehensive web documentation portal (HTTPS)
│   │
│   ├── css/
│   │   └── style.css           # Modular, responsive stylesheet
│   │
│   └── js/
│       ├── config.js           # Smart environment & API base URL handler
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
│   ├── vercel.json             # Vercel serverless deployment config
│   ├── package.json            # Dependencies & scripts
│   ├── .env                    # Local environment variables (Port, MongoDB URI)
│   ├── .env.example            # Environment template
│   │
│   ├── api/
│   │   └── index.js            # Vercel serverless entry proxy
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

## 🧮 Route Optimization Logic & Mathematical Formulations

### 1. Haversine Distance Formula
$$\Delta \phi = \text{lat}_2 - \text{lat}_1 \quad (\text{radians})$$
$$\Delta \lambda = \text{lon}_2 - \text{lon}_1 \quad (\text{radians})$$
$$a = \sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\text{lat}_1) \cdot \cos(\text{lat}_2) \cdot \sin^2\left(\frac{\Delta \lambda}{2}\right)$$
$$c = 2 \cdot \text{atan2}(\sqrt{a}, \sqrt{1-a})$$
$$d = 6,371 \cdot c \quad (\text{km})$$

### 2. Priority Nearest Neighbor Algorithm
$$\text{Effective Distance} = \text{Raw Haversine Distance} \times (\text{isUrgent} ? 0.6 : 1.0)$$
- An urgent stop 10 km away is treated as 6 km, ensuring drivers prioritize urgent orders over standard stops unless standard stops are directly adjacent.

### 3. Traffic-Aware Speed & ETA
$$\text{Effective Transit Speed} = \frac{\text{Base Speed (35 km/h)}}{\text{Traffic Factor (1.0, 1.2, or 1.5)}}$$
$$\text{Driving Time (mins)} = \left(\frac{\text{Distance}}{\text{Effective Speed}}\right) \times 60$$
$$\text{Service Time (mins)} = \text{Stops Count} \times 5\text{ mins (handover)}$$
$$\text{Total Duration} = \text{Driving Time} + \text{Service Time}$$

### 4. Fuel Consumption & Cost
$$\text{Fuel Consumed} = \frac{\text{Total Distance (km)}}{\text{Vehicle Mileage (km/L)}}$$
$$\text{Total Fuel Cost} = \text{Fuel Consumed} \times \text{Unit Fuel Price (₹)}$$
$$\text{Cost Per Delivery} = \frac{\text{Total Fuel Cost}}{\text{Stops Count}}$$

### 5. Composite Route Scoring Formula
$$\text{Route Score} = (\text{Distance} \times 1.5) + \text{Traffic Penalty} + \text{Fuel Cost} - \text{Priority Bonus}$$
- $\text{Traffic Penalty} = (\text{Traffic Factor} - 1.0) \times 25.0$
- $\text{Priority Bonus} = \text{Urgent Orders Count} \times 15.0$
*(Lower score represents a more cost-effective sequence).*

---

## 📡 Complete REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Authenticate user & return JWT token |
| `POST` | `/api/auth/register` | Register new fleet user account |
| `GET` | `/api/auth/me` | Verify token & return logged-in profile |
| `GET` | `/api/auth/users` | List all system users (Admin view) |
| `POST` | `/api/auth/seed-reset` | Restore default demonstration logistics dataset |
| `GET` | `/api/deliveries` | List all delivery orders |
| `POST` | `/api/deliveries` | Create a new delivery order |
| `PUT` | `/api/deliveries/:id/status` | Update delivery status (`out_for_delivery`, `completed`, `failed`) |
| `POST` | `/api/deliveries/:id/issue` | Log field delay/issue report |
| `DELETE` | `/api/deliveries/:id` | Remove delivery order |
| `GET` | `/api/drivers` | Retrieve all drivers roster |
| `POST` | `/api/drivers` | Add driver to fleet |
| `GET` | `/api/vehicles` | Retrieve fleet vehicle list |
| `POST` | `/api/vehicles` | Add new vehicle to fleet |
| `GET` | `/api/routes/data` | Fetch active drivers, vehicles, and pending orders for planner |
| `POST` | `/api/routes/preview` | Preview optimized route without saving |
| `POST` | `/api/routes/optimize` | Run optimization, save route, and assign driver/vehicle |
| `POST` | `/api/routes/:id/recalculate` | Dynamically recompute route when traffic changes |
| `GET` | `/api/routes/driver/:driverId` | Fetch active assigned route for a specific driver |
| `GET` | `/api/analytics` | Compute fleet KPIs, completion rates, and variance metrics |
| `GET` | `/api/dashboard/summary` | Retrieve live aggregated dashboard metrics |

---

## 🚀 Installation & How to Run

### Prerequisites
- [Node.js](https://nodejs.org/) ($\ge 18.x$)
- [MongoDB](https://www.mongodb.com/) (Local service or MongoDB Atlas cloud URI)

### Local Setup
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
   Create a `.env` file in `backend/`:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://127.0.0.1:27017/smart_route_db
   JWT_SECRET=smart_route_secret_key_super_secure_2026
   ```

4. **Start the server:**
   ```bash
   node server.js
   ```

5. **Open in browser:**
   - Application: `http://localhost:5000/login.html`
   - Documentation Portal: `http://localhost:5000/docs.html`

---

## 🔐 Demo Credentials

| Role | Email | Password | Access Scope |
|---|---|---|---|
| **Fleet Manager / Admin** | `admin@lastmile.com` | `admin123` | Full access to all 8 modules & settings |
| **Delivery Driver** | `rahul@lastmile.com` | `driver123` | Driver task console & delivery execution |

---

## 🌐 Production Cloud Deployment Guide

### Option A: Vercel (Current Production Deployment)
- **Live Application:** [https://smart-route-optimization-system-for.vercel.app/login.html](https://smart-route-optimization-system-for.vercel.app/login.html)
- **Live Documentation:** [https://smart-route-optimization-system-for.vercel.app/docs.html](https://smart-route-optimization-system-for.vercel.app/docs.html)
- **Environment variables on Vercel:**
  - `MONGODB_URI`: Your MongoDB Atlas URI
  - `JWT_SECRET`: Your production secret
- The included `frontend/js/config.js` automatically routes API requests seamlessly.

### Option B: Render (Unified Web Service)
1. Create a **Web Service** on [Render](https://render.com/).
2. Root directory: `backend`, Build Command: `npm install`, Start Command: `node server.js`.
3. Render automatically hosts the backend and serves the frontend static files together.

---

## 👨‍💻 Author & Academic Project Details
- **Project Title:** SMART ROUTE OPTIMIZATION SYSTEM FOR LAST-MILE DELIVERY
- **Domain:** Logistics & Supply Chain Engineering / Web Systems
- **Development Lifecycle:** Structured 6-Day Agile Development Plan
- **Documentation:** Built-in web documentation accessible at `/docs.html`
