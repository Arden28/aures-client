import * as React from "react"
import { createBrowserRouter, Navigate, Outlet } from "react-router-dom"

import AuthProvider from "@/context/AuthContext"
import RequireAuth from "@/components/RequireAuth"
import GuestOnly from "@/components/GuestOnly"

import AppLayout from "@/layouts/AppLayout"
import AuthLayout from "@/layouts/AuthLayout"
import PosLayout from "@/layouts/PosLayout" // <- instead of RunnerLayout
import RequireRole from "@/components/RequireRole"
import PortalLayout from "@/layouts/PortalLayout"

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

const WaiterPage = React.lazy(() => import("@/app/staff/WaiterPage"))
const CashierPage = React.lazy(() => import("@/app/staff/CashierPage"))
const KitchenPage = React.lazy(() => import("@/app/staff/KitchenPage"))

// Portal
const PortalPage = React.lazy(() => import("@/app/portal/PortalPage"))

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
            element: <RequireAuth />, // must be logged in
            children: [
              {
                element: <RequireRole allowed={["owner", "manager"]} />, // only owner + manager
                children: [
                  // "/" → "/dashboard"
                  { index: true, element: <Navigate to="dashboard" replace /> },

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
        ],
      },  


      /* ----------------------------- POS ROUTES --------------------------- */
      {
        path: "/",
        element: <PosLayout />,
        children: [
          {
            element: <RequireAuth />, // must be logged in
            children: [
              
              // Redirect "/" → "/dashboard" for POS routes
              { index: true, element: <Navigate to="/dashboard" replace /> },
              
              // WAITER ONLY
              {
                path: "waiter",
                element: <RequireRole allowed={["waiter"]} />,
                children: [
                  { index: true, element: withSuspense(<WaiterPage />) },
                ],
              },

              // CASHIER ONLY
              {
                path: "cashier",
                element: <RequireRole allowed={["cashier"]} />,
                children: [
                  { index: true, element: withSuspense(<CashierPage />) },
                ],
              },

              // KITCHEN ONLY
              {
                path: "kitchen",
                element: <RequireRole allowed={["kitchen"]} />,
                children: [
                  { index: true, element: withSuspense(<KitchenPage />) },
                ],
              },
            ],
          },
        ],
      },



      /* ----------------------------- PORTAL ROUTES --------------------------- */
      {
        path: "/portal",
        element: <PortalLayout />,
        children: [
            { index: true, element: withSuspense(<PortalPage />) },
        ],
      },


      /* ----------------------------- FALLBACK ----------------------------- */
      { path: "*", element: withSuspense(<NotFound />) },
    ],
  },
])
