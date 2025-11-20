import * as React from "react"
import { createBrowserRouter, Navigate, Outlet } from "react-router-dom"

import AuthProvider from "@/context/AuthContext"
import RequireAuth from "@/components/RequireAuth"
import GuestOnly from "@/components/GuestOnly"

import AppLayout from "@/layouts/AppLayout"
import AuthLayout from "@/layouts/AuthLayout"
import PosLayout from "@/layouts/PosLayout" // <- instead of RunnerLayout
import PosTables from "@/app/pos/PosTables"
import PosBilling from "@/app/pos/PosBilling"
import KDS from "@/app/pos/KDS"

/* -------------------------------------------------------------------------- */
/*                                Lazy pages                                  */
/* -------------------------------------------------------------------------- */

// Auth
const Login = React.lazy(() => import("@/app/auth/Login"))
const ForgotPassword = React.lazy(() => import("@/app/auth/ForgotPassword"))

// Backoffice
const Dashboard = React.lazy(() => import("@/app/dashboard/Dashboard"))
const Products = React.lazy(() => import("@/app/dashboard/Products"))
const Categories = React.lazy(() => import("@/app/dashboard/Categories"))
const FloorPlans = React.lazy(() => import("@/app/dashboard/FloorPlans"))
const Tables = React.lazy(() => import("@/app/dashboard/Tables"))
const Orders = React.lazy(() => import("@/app/dashboard/Orders"))
const Clients = React.lazy(() => import("@/app/dashboard/Clients"))
const Staff = React.lazy(() => import("@/app/dashboard/Staff"))
const Settings = React.lazy(() => import("@/app/dashboard/Settings"))

// POS
// const PosTables = React.lazy(() => import("@/app/pos/PosTables"))
// const PosBilling = React.lazy(() => import("@/app/pos/PosBilling"))
// const KDS = React.lazy(() => import("@/app/pos/KDS"))

// Generic
const NotFound = React.lazy(() => import("@/app/NotFound"))

/* -------------------------------------------------------------------------- */
/*                                helpers                                     */
/* -------------------------------------------------------------------------- */

function withSuspense(node: React.ReactNode) {
  return <React.Suspense fallback={null}>{node}</React.Suspense>
}

function Providers() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  )
}

/* -------------------------------------------------------------------------- */
/*                                   Router                                   */
/* -------------------------------------------------------------------------- */

export const router = createBrowserRouter([
  {
    element: <Providers />,
    children: [
      /* --------------------------- AUTH ROUTES ---------------------------- */
      {
        path: "/auth",
        element: <AuthLayout />,
        children: [
          {
            element: <GuestOnly />,
            children: [
              { index: true, element: <Navigate to="login" replace /> },
              { path: "login", element: withSuspense(<Login />) },
              { path: "sign-up", element: withSuspense(<ForgotPassword />) },
            ],
          },
        ],
      },

      /* ------------------------ BACKOFFICE ROUTES ------------------------ */
      {
        path: "/",
        element: <AppLayout />,
        children: [
          {
            element: <RequireAuth />,
            children: [
              // default -> dashboard
              { index: true, element: <Navigate to="dashboard" replace /> },

              // Owner / manager main pages
              { path: "dashboard", element: withSuspense(<Dashboard />) },

              // Menu
              { path: "menu/products", element: withSuspense(<Products />) },
              { path: "menu/categories", element: withSuspense(<Categories />) },

              // Dining area
              { path: "floors", element: withSuspense(<FloorPlans />) },
              { path: "tables", element: withSuspense(<Tables />) },

              // Operations
              { path: "orders", element: withSuspense(<Orders />) },
              { path: "clients", element: withSuspense(<Clients />) },
              { path: "staff", element: withSuspense(<Staff />) },

              // Settings
              { path: "settings", element: withSuspense(<Settings />) },
            ],
          },
        ],
      },

      /* ----------------------------- POS ROUTES --------------------------- */
      {
        path: "/pos",
        element: <PosLayout />,
        children: [
          {
            element: <RequireAuth />, // you can make this role-aware later (waiter/cashier/kitchen)
            children: [
              // default -> tables
              { index: true, element: <Navigate to="tables" replace /> },

              { path: "tables", element: withSuspense(<PosTables />) },
              { path: "billing", element: withSuspense(<PosBilling />) },
              { path: "kds", element: withSuspense(<KDS />) },
            ],
          },
        ],
      },

      /* ----------------------------- FALLBACK ----------------------------- */
      { path: "*", element: withSuspense(<NotFound />) },
    ],
  },
])
