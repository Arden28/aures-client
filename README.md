<div align="center">
  <br />
  <a href="https://github.com/yourusername/tapla-frontend">
    <img src="public/images/logo.png" alt="Tapla Logo" width="150" />
  </a>
  <br />

  <h1 align="center">Tapla POS</h1>

  <p align="center">
    <strong>The Next-Gen Restaurant Management Operating System.</strong>
    <br />
    Seamlessly connecting Waiters, Kitchens, and Cashiers in real-time.
  </p>

  <p align="center">
    <a href="https://reactjs.org/">
      <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
    </a>
    <a href="https://www.typescriptlang.org/">
      <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
    </a>
    <a href="https://tailwindcss.com/">
      <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
    </a>
    <a href="https://vitejs.dev/">
      <img src="https://img.shields.io/badge/Vite-B73C92?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
    </a>
    <a href="https://pusher.com/">
      <img src="https://img.shields.io/badge/Pusher-Realtime-20c997?style=for-the-badge&logo=pusher&logoColor=white" alt="Pusher" />
    </a>
  </p>
</div>

<br />

## ⚡ Overview

**Tapla** is a high-performance Single Page Application (SPA) designed to modernize restaurant operations. Unlike traditional bulky POS systems, Tapla is role-based, reactive, and mobile-first.

It is divided into three distinct synchronized interfaces:

1.  **🤵 Waiter Mode:** A mobile-optimized interface for taking orders, managing tables, and receiving notifications when food is ready.
2.  **👨‍🍳 Kitchen Display System (KDS):** A digital Kanban board for chefs to view, track, and bump orders via drag-and-drop or touch interactions.
3.  **💸 Cashier Station:** A streamlined dashboard for processing payments, splitting bills, and viewing daily sales statistics.

---

## 📸 Interface Previews

| **Waiter Mobile View** | **Kitchen Display System** |
|:---:|:---:|
| <img src="https://placehold.co/300x600/18181b/FFF?text=Waiter+UI" alt="Waiter UI" width="250" /> | <img src="https://placehold.co/600x400/18181b/FFF?text=KDS+Board" alt="KDS UI" width="400" /> |

---

## 🛠 Tech Stack

-   **Core:** [React 18](https://react.dev/) + [Vite](https://vitejs.dev/)
-   **Language:** [TypeScript](https://www.typescriptlang.org/)
-   **Styling:** [Tailwind CSS](https://tailwindcss.com/) + [Shadcn UI](https://ui.shadcn.com/)
-   **Icons:** [Lucide React](https://lucide.dev/)
-   **Real-time:** [Laravel Echo](https://github.com/laravel/echo) + [Pusher JS](https://github.com/pusher/pusher-js)
-   **State/Data:** Axios & React Hooks
-   **Drag & Drop:** Mobile-drag-drop (Polyfill for touch devices)

---

## 🚀 Key Features

### 🤵 Waiter Interface
-   **Live Task Feed:** Real-time push notifications and audio alerts for new table assignments and "Order Ready" signals.
-   **Table Management:** Visual floor plan to claim tables and view occupancy.
-   **Offline Detection:** Smart handling of network drops with auto-reconnection polling.
-   **Optimistic UI:** Instant UI updates while data syncs in the background.

### 🍳 Kitchen Display (KDS)
-   **Kanban Workflow:** Pending -> Cooking -> Ready -> Served columns.
-   **Drag & Drop:** Intuitive touch-enabled drag system to move tickets.
-   **Ticket Timer:** Color-coded timers (Green/Orange/Red) to highlight delayed orders.
-   **Sound Alerts:** Audio cues when new tickets arrive in the kitchen.

### 💸 Cashier
-   **Unpaid Orders Feed:** Live list of tables waiting to settle their bill.
-   **Daily Stats:** Real-time calculation of Total Sales and Completed Orders.
-   **Quick Actions:** One-tap payment processing and receipt viewing.

---

## ⚙️ Installation & Setup

### Prerequisites
-   Node.js (v18+)
-   NPM or Yarn
-   A running instance of the [Tapla Backend API](https://github.com/your-username/tapla-backend)

### 1. Clone the repository
```bash

git clone [https://github.com/your-username/tapla-frontend.git](https://github.com/your-username/tapla-frontend.git)
cd tapla-frontend

```
2. Install Dependencies

``` bash

npm install

```

### 3. Configure Environment
Create a .env file in the root directory:

``` bash

cp .env.example .env

```

Update the variables with your configuration:

```bash

# API Connection
VITE_API_URL=[https://api.your-domain.com](https://api.your-domain.com)

# Real-time Configuration (Pusher)
VITE_PUSHER_APP_KEY=your_pusher_key
VITE_PUSHER_APP_CLUSTER=mt1

```

### 4. Run Development Server
``` bash

npm run dev
The app will be available at http://localhost:5173.

```


## 🏗 Project Structure
Bash

src/
├── api/            # Axios instances and API service functions
├── app/            # Main application pages (Next.js/Router style organization)
│   ├── (auth)/     # Login & Authentication pages
│   ├── (waiter)/   # Waiter specific views
│   ├── (kitchen)/  # KDS specific views
│   └── (cashier)/  # Cashier specific views
├── components/     # Reusable UI components (Buttons, Inputs, etc.)
│   └── ui/         # Shadcn UI primitives
├── hooks/          # Custom React hooks (useAuth, useCart)
├── layouts/        # Main layout wrappers (PosLayout, AuthLayout)
├── lib/            # Utilities (Echo, cn helper, etc.)
└── types/          # TypeScript interfaces


<!-- ## 🤝 Contributing
Contributions are welcome! Please follow these steps:

Fork the project.

Create your feature branch (git checkout -b feature/AmazingFeature).

Commit your changes (git commit -m 'Add some AmazingFeature').

Push to the branch (git push origin feature/AmazingFeature).

Open a Pull Request. -->

<!-- ## 📄 License
Distributed under the MIT License. See LICENSE for more information. -->

<br /> <div align="center"> <p>Built by the [Arden BOUET](https://github.com/Arden28)</p> </div>