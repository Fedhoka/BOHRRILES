import { type ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore, type Role } from "../store/auth.js";

interface Props {
  roles?: Role[];
  children?: ReactNode;
}

export default function ProtectedRoute({ roles, children }: Props) {
  const { accessToken, user } = useAuthStore();
  const location = useLocation();

  if (!accessToken || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-2xl font-bold text-slate-700">403</p>
          <p className="text-slate-500 mt-2">No tenés permiso para acceder a esta sección.</p>
        </div>
      </div>
    );
  }

  return <>{children ?? <Outlet />}</>;
}
