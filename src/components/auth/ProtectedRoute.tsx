/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/src/store/useAuthStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
  allowGuest?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, adminOnly = false, allowGuest = false }) => {
  const { user, profile, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f3f3]">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#ff5a7a] border-t-transparent"></div>
      </div>
    );
  }

  // If guest is allowed and no user, it's fine
  if (!user && allowGuest) {
    return <>{children}</>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Admin check
  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  // Rejected profile check
  const isRejected = profile?.approvalStatus === 'rejected';
  const restrictedPaths = ['/explore', '/events', '/matches', '/chat'];
  const isRestrictedPath = restrictedPaths.some(path => location.pathname.startsWith(path));

  if (isRejected && isRestrictedPath) {
    return <Navigate to="/profile" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
