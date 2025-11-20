# Aures Restaurant Manager

Aures Restaurant Manager is a full‑stack, production‑ready restaurant operations platform built using:

- **Laravel 12** — REST API, authentication, permissions, dashboards, real‑time endpoints  
- **React + TypeScript** — lightning‑fast SPA powered by Vite  
- **shadcn/ui** — world‑class interface foundation  
- **TailwindCSS** — design consistency & responsiveness  
- **MySQL** — relational database for all restaurant operations  

This platform is designed for restaurants of every scale — from cafés to multi‑floor dining establishments.

---

## 🚀 Features Overview

### 🔐 Authentication & Roles
- Email/password login (Sanctum tokens)
- Role‑based access: **Owner**, **Manager**, **Waiter**, **Cashier**, **Kitchen**
- Secure tokenized API access

### 📊 Advanced Dashboard (Role‑Aware)
Tailored dashboards depending on the logged‑in user:

#### Owner / Manager
- Total revenue
- Total orders
- Average order value
- Active orders
- Completed orders
- Occupancy rate
- Revenue charts
- Order charts & breakdowns
- Floor plan occupancy
- Top products
- Recent orders
- **Staff performance metrics**

#### Waiter
- Assigned orders only  
- Activity statistics  
- Performance summary  

#### Cashier
- Payments processed  
- Revenue from handled payments  

#### Kitchen
- Active orders (Pending, In Progress, Ready)  
- KDS‑style view  

### 🍽️ Orders & Items
- Order lifecycle management  
- Order‑item relationship tracking  
- Multi‑source support: dine‑in, takeaway, online  
- Payment status tracking: **unpaid**, **partial**, **paid**, **refunded**  

### 🧾 Payments & Transactions
- Cash or card handling  
- Linked to cashier accounts  
- Transaction history per user  

### 🪑 Floor Plans & Tables
- Multi‑floor support  
- Dynamic occupancy tracking  
- Table status: free, reserved, occupied, needs cleaning  

### 📦 Products & Categories
- Menu item grouping  
- Top‑selling analytics  
- Revenue per product  

---

## 🏗️ Project Structure

```
Aures-Restaurant-Manager/
│
├── api/ (Laravel 12)
│   ├── app/
│   │   ├── Http/Controllers/Api
│   │   ├── Models
│   │   └── Services
│   ├── routes/api.php
│   └── ...
│
└── spa/ (React + Vite + TypeScript)
    ├── src/
    │   ├── pages/
    │   ├── api/
    │   ├── components/
    │   └── lib/
    └── ...
```

---

## 📡 API Endpoints (Key)

### **Auth**
```
POST /api/v1/auth/login
POST /api/v1/auth/logout
GET  /api/v1/auth/me
```

### **Dashboard**
```
GET /api/v1/dashboard/overview?timeframe=today|week|month|year
```

### **Orders**
```
GET    /api/v1/orders
POST   /api/v1/orders
PATCH  /api/v1/orders/{id}
DELETE /api/v1/orders/{id}
```

### **Tables**
```
GET  /api/v1/tables
PATCH /api/v1/tables/{id}
```

### **Payments**
```
POST /api/v1/payments/{orderId}
```

---

## 🛠️ Installation (Backend – Laravel)

### 1. Clone the repo
```
git clone https://github.com/your/repo.git
cd api
```

### 2. Install dependencies
```
composer install
```

### 3. Copy env file
```
cp .env.example .env
```

### 4. Generate key
```
php artisan key:generate
```

### 5. Migrate database
```
php artisan migrate --seed
```

### 6. Serve
```
php artisan serve
```

---

## 🖥️ Installation (Frontend – React SPA)

### 1. Install dependencies
```
cd spa
npm install
```

### 2. Start dev server
```
npm run dev
```

---

## 👤 Roles & Permissions

| Role     | Dashboard | Orders | Payments | Floor Plans | Staff Performance |
|----------|----------|--------|----------|--------------|--------------------|
| Owner    | ✔️ Full  | ✔️ All | ✔️ All   | ✔️ Manage    | ✔️ Yes             |
| Manager  | ✔️ Full  | ✔️ All | ✔️ All   | ✔️ Manage    | ✔️ Yes             |
| Waiter   | ✔️ Own   | ✔️ Own | ❌ No    | ❌ View Only | ❌ No              |
| Cashier  | ✔️ Own   | ❌ No  | ✔️ Own   | ❌ No        | ❌ No              |
| Kitchen  | ✔️ KDS   | ✔️ KDS | ❌ No    | ❌ No        | ❌ No              |

---

## 🧠 Staff Performance (Owner/Manager only)

Metrics include:

- Total orders served  
- Average serving time  
- Revenue influenced  
- Payment accuracy  
- Order error rate  
- Peak‑hour performance  
- Contribution score (weighted)  

Backend endpoint:

```
GET /api/v1/dashboard/staff-performance?timeframe=...
```

---

## 🎨 UI & UX Principles

The interface follows:

- Adaptive layouts (mobile → desktop)
- Consistent spacing scale
- Motion‑driven micro‑interactions
- Accessible color palettes
- Zero clutter, hierarchy‑first design

---

## 📈 Tech Stack

| Layer         | Technology |
|---------------|------------|
| Backend       | Laravel 12 |
| Frontend      | React + TypeScript |
| UI Framework  | shadcn/ui |
| Styling       | TailwindCSS |
| Auth          | Sanctum |
| DB            | MySQL |
| Charts        | shadcn charts |
| HTTP Client   | fetch wrapper (`apiService.ts`) |

---

## 🔒 Security

- Sanctum token-based authentication  
- Validation on all endpoints  
- Role-based authorization  
- Middleware-protected API routes  
- Password hashing (bcrypt)  

---

## 🧪 Testing

Run backend tests:

```
php artisan test
```

---

## 🗺️ Roadmap

### MVP (Completed)
✔ Auth API  
✔ Dashboard v1  
✔ Orders + Payments  
✔ Tables + floor plans  
✔ Staff performance  
✔ Real-time updates foundation  

### Coming next
🔄 WebSockets (order sync, table updates)  
📱 Mobile waiter app (PWA)  
📺 Full Kitchen Display System  
🍽 Customer ordering interface  

---

## 🤝 Contributing

PRs, issues, and ideas are welcome!

---

## 📄 License

MIT License.

---

## ✨ Built by Arden BOUET (Koverae Technologies)
Aures Restaurant Manager is part of the Koverae product ecosystem.
