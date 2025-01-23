import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Orders } from './pages/Orders';
import { Collections } from './pages/Collections';
import { VoidOrders } from './pages/VoidOrders';
import { Customers } from './pages/Customers';
import { Reports } from './pages/Reports';
import { Services } from './pages/Services';
import { Settings } from './pages/Settings';
import { EndOfShift } from './pages/EndOfShift';
import { Login } from './pages/Login';
import { AuthProvider, useAuth } from './contexts/AuthContext';

function ProtectedRoute({ 
  children, 
  allowedRoles = ['admin', 'employee']
}: { 
  children: React.ReactNode;
  allowedRoles?: ('admin' | 'employee')[];
}) {
  const { user, isShiftEnded } = useAuth();
  const location = useLocation();
  
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  // If shift is ended and user is not admin, restrict access
  if (isShiftEnded && user.role !== 'admin') {
    return <Navigate to="/end-of-shift" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route 
              index 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="orders" 
              element={
                <ProtectedRoute>
                  <Orders />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="collections" 
              element={
                <ProtectedRoute>
                  <Collections />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="void-orders" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <VoidOrders />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="customers" 
              element={
                <ProtectedRoute>
                  <Customers />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="services" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Services />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="settings" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Settings />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="reports" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Reports />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="end-of-shift" 
              element={
                <ProtectedRoute>
                  <EndOfShift />
                </ProtectedRoute>
              } 
            />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;