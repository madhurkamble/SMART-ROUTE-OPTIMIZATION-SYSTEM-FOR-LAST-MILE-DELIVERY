# Product Requirements Document (PRD)

## Smart Route Optimization System for Last-Mile Delivery

---

### 1. Context
Last-mile delivery is the final, most operationally intensive, and expensive segment of logistics supply chains, representing upwards of 53% of overall shipping costs. Small-to-medium logistics providers and urban delivery fleets struggle with inefficient arbitrary stop sequencing, recurring traffic congestion, escalating fuel expenses, and disjointed coordination between dispatchers and field drivers. 

This project delivers a functional, student-level MVP web application providing automated multi-stop route sequencing, simulated traffic adjustments, fuel expense modeling, driver status dispatching, and comprehensive logistics KPI tracking.

---

### 2. Problem Statement
Traditional last-mile delivery operations suffer from:
1. **Inefficient Manual Routing:** Dispatchers manually sequence stops based on intuition, causing redundant travel mileage and crisscrossing across urban corridors.
2. **Traffic Volatility:** Urban congestion severely skews static delivery arrival schedules, leading to delayed deliveries and customer dissatisfaction.
3. **Escalating Fuel Expenses:** Suboptimal routes waste fuel, directly cutting into operational profit margins.
4. **Poor Fleet Visibility:** Disconnect between fleet managers in the hub and drivers in the field regarding task progress and delays.
5. **Absence of Logistics Telemetry:** Inability to evaluate key performance indicators (KPIs) like on-time delivery rates, vehicle utilization, and cost per delivery stop.

---

### 3. Objectives
- **Automate Multi-Stop Route Planning:** Generate optimized delivery sequences from driver origin coordinates across multiple customer destinations.
- **Traffic-Aware Adjustments:** Provide configurable traffic factor multipliers (Low 1.0x, Medium 1.2x, High 1.5x) with dynamic route recalculation capabilities.
- **Fuel & Financial Modeling:** Estimate fuel liters consumed and total fuel expenses in Indian Rupees (₹) across Petrol, Diesel, and Electric vehicles.
- **Priority-Driven Sequencing:** Prioritize time-critical ("Urgent") orders over standard packages during algorithm candidate selection.
- **Interactive Map Visualization:** Plot vehicle origin, sequenced stop markers, and color-coded route lines using open-source OpenStreetMap and Leaflet.js.
- **End-to-End Operational Workflow:** Connect Fleet Manager dispatching with Driver field status updates (`Pending` $\rightarrow$ `Out for Delivery` $\rightarrow$ `Completed`/`Failed`).
- **Comprehensive Performance Telemetry:** Compute logistics KPIs including On-Time Delivery Rate, Delivery Completion Rate, and Planned vs. Actual Variances.

---

### 4. Scope
#### In-Scope (6-Day Student MVP):
- Web frontend built using HTML5, CSS3, and Vanilla JavaScript.
- Backend REST API built with Node.js and Express.js.
- Database persistence using MongoDB and Mongoose.
- Leaflet.js and OpenStreetMap interactive mapping (zero paid API keys required).
- Nearest Neighbor multi-stop algorithm with priority weighting and Haversine distance calculations.
- Simulated traffic conditions (Low, Medium, High).
- Dual-role authentication (Admin / Fleet Manager and Driver).
- 8 interconnected functional application pages.

#### Out-of-Scope (Future Enhancements):
- Autonomous delivery drones and driverless vehicles.
- Hardware OBD-II / physical GPS tracker integration.
- Cross-border multi-modal freight forwarding.
- Deep learning neural network demand forecasting.
- Enterprise-scale microservices or Kafka message streaming.

---

### 5. Functional Requirements
| ID | Module | Requirement Description |
|---|---|---|
| **FR-01** | Authentication | Secure role-based login (Admin/Fleet Manager vs. Driver) with password hashing (bcryptjs) and JWT tokens. |
| **FR-02** | Deliveries Management | Full CRUD operations for orders: Customer name, phone, address, coordinates, priority (Urgent/Standard), package weight/size, and time windows. |
| **FR-03** | Driver Management | Roster tracking driver name, phone, license number, assigned vehicle, availability status (`available`, `on_duty`, `off_duty`), and completion counters. |
| **FR-04** | Vehicle Management | Fleet tracking vehicle registration, type (`bike`, `van`, `truck`), fuel type (`petrol`, `diesel`, `electric`), mileage (km/L), and load capacity. |
| **FR-05** | Route Planner | Selection of active driver, available vehicle, and pending orders with visual OpenStreetMap marker rendering. |
| **FR-06** | Optimization Engine | Priority-aware Nearest Neighbor algorithm evaluating Haversine distance, urgent order discounts (0.6x), and multi-factor scoring. |
| **FR-07** | Traffic Modeling | Dynamic adjustment of transit speeds and travel durations using simulated factors: Low (1.0x), Med (1.2x), High (1.5x). |
| **FR-08** | Route Recalculation | Dynamic recalculation button recomputing ETAs and route scores when traffic shifts during active transit. |
| **FR-09** | Driver Portal | Live task interface showing delivery stops, customer phone contacts, planned ETAs, status transitions, and delay/issue logging. |
| **FR-10** | Analytics & KPIs | Aggregated computation of On-Time Rate, Completion Rate, Vehicle Utilization, Cost Per Stop, and Planned vs. Actual Variance. |
| **FR-11** | Admin Console | System user management, global parameter tuning, dispatch audit logs, and one-click demo dataset reset. |

---

### 6. Non-Functional Requirements
- **Simplicity & Maintainability:** Built using beginner-friendly vanilla technologies (Functions, Objects, Express routes, Mongoose models, fetch API).
- **Performance:** Multi-stop route optimization computes in $< 200\text{ ms}$ for standard urban batch sizes ($\le 25\text{ stops}$).
- **Responsiveness:** Fluid grid and flexbox styling adapted for Desktop, Tablet, and Mobile viewport sizes without heavy frameworks.
- **Security:** Passwords salted and hashed with `bcryptjs`; sensitive parameters isolated in `.env`; input validated before database queries.
- **Zero Paid Dependencies:** Leaflet and OpenStreetMap eliminate credit card requirements and Google Maps billing quotas.

---

### 7. User Flows
```
Fleet Manager Login
        ↓
Operations Dashboard
        ↓
Manage Deliveries / Drivers / Vehicles
        ↓
Route Planner Interface
        ↓
Select Driver + Vehicle + Deliveries + Traffic Level
        ↓
Run Priority Nearest Neighbor Optimization
        ↓
Inspect Map Path, Fuel Cost, ETAs, and Score
        ↓
Save & Dispatch Route to Driver
        ↓
Driver Logs In & Opens Driver Panel
        ↓
Driver Updates: Pending → Out for Delivery → Completed (or Logs Issue)
        ↓
Dashboard & Analytics Update in Real-Time
```

---

### 8. Data Requirements
- **User:** `name`, `email`, `password`, `role` (`admin` | `driver`), `phone`, `createdAt`.
- **Delivery:** `orderId`, `customerName`, `customerPhone`, `deliveryAddress`, `latitude`, `longitude`, `priority` (`urgent` | `standard`), `timeWindowStart`, `timeWindowEnd`, `packageWeight`, `packageSize`, `assignedDriver`, `assignedVehicle`, `status`, `plannedETA`, `actualDeliveryTime`, `failureReason`, `notes`.
- **Driver:** `name`, `phone`, `email`, `licenseNumber`, `assignedVehicle`, `availability` (`available` | `on_duty` | `off_duty`), `currentLatitude`, `currentLongitude`, `completedDeliveries`, `failedDeliveries`, `onTimeDeliveries`.
- **Vehicle:** `vehicleNumber`, `vehicleType` (`bike` | `van` | `truck`), `fuelType` (`petrol` | `diesel` | `electric`), `mileage`, `fuelTankCapacity`, `loadCapacity`, `assignedDriver`, `availability`.
- **Route:** `routeId`, `driver`, `vehicle`, `trafficCondition`, `trafficFactor`, `totalDistanceKm`, `totalDurationMinutes`, `estimatedETA`, `estimatedFuelLiters`, `estimatedFuelCost`, `routeScore`, `stops` (ordered array of subdocuments), `status`.

---

### 9. Key Performance Indicators (KPIs)
1. **On-Time Delivery Rate:**
   $$\text{On-Time Rate} = \left(\frac{\text{Completed Orders Within Window}}{\text{Total Completed Orders}}\right) \times 100$$
2. **Delivery Completion Rate:**
   $$\text{Completion Rate} = \left(\frac{\text{Completed Deliveries}}{\text{Total Deliveries}}\right) \times 100$$
3. **Vehicle Fleet Utilization:**
   $$\text{Utilization} = \left(\frac{\text{Active In-Use Vehicles}}{\text{Total Vehicles}}\right) \times 100$$
4. **Fuel Expense Per Stop:**
   $$\text{Cost Per Stop} = \frac{\text{Total Estimated Fuel Expense}}{\text{Completed Deliveries}}$$
5. **Route Optimization Efficiency Gain:**
   $$\text{Efficiency Gain} = \left(\frac{\text{Baseline Distance} - \text{Optimized Distance}}{\text{Baseline Distance}}\right) \times 100$$

---

### 10. Assumptions & Constraints
- **Assumptions:** Driver departure locations are initialized at Pune city center depot coordinates ($18.5204^\circ\text{ N}, 73.8567^\circ\text{ E}$) or driver's recorded location.
- **Constraints:** Traffic is modeled via simulated multipliers (Low 1.0x, Med 1.2x, High 1.5x) rather than paid commercial traffic sensor APIs.
- **Platform:** Evaluated and run on standard Node.js $\ge 18$ runtimes with MongoDB database access.

---

### 11. Future Enhancements
- Real-time WebSockets / SSE push updates between Dispatcher and Driver.
- Integration with Open Source Routing Machine (OSRM) for turn-by-turn road network geometry.
- AI-based delivery density clustering and batching for multi-vehicle partition solving.
- SMS / WhatsApp automated customer arrival notifications.
