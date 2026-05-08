import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import ProtectedRoute from "./ProtectedRoute.js";
import AppShell from "../layout/AppShell.js";
import LoginPage from "../modules/auth/LoginPage.js";

const VatModule = lazy(() => import("../modules/vat/VatPage.js"));
const PayrollModule = lazy(() => import("../modules/payroll/PayrollPage.js"));
const AnnualModule = lazy(() => import("../modules/annual/AnnualPage.js"));
const ExportsModule = lazy(() => import("../modules/exports/ExportsPage.js"));
const StudioModule = lazy(() => import("../modules/studio/StudioPage.js"));
const DashboardPage = lazy(() => import("../modules/dashboard/DashboardPage.js"));

const Loading = () => (
  <div className="flex items-center justify-center h-full">
    <p className="text-slate-400 text-sm">Cargando...</p>
  </div>
);

const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          {
            path: "/",
            element: <Suspense fallback={<Loading />}><DashboardPage /></Suspense>,
          },
          {
            path: "/vat",
            element: <Suspense fallback={<Loading />}><VatModule /></Suspense>,
          },
          {
            path: "/payroll",
            element: <Suspense fallback={<Loading />}><PayrollModule /></Suspense>,
          },
          {
            path: "/annual",
            element: <Suspense fallback={<Loading />}><AnnualModule /></Suspense>,
          },
          {
            path: "/exports",
            element: <Suspense fallback={<Loading />}><ExportsModule /></Suspense>,
          },
          {
            path: "/studio",
            element: (
              <ProtectedRoute roles={["admin_studio", "accountant"]}>
                <Suspense fallback={<Loading />}><StudioModule /></Suspense>
              </ProtectedRoute>
            ),
          },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
