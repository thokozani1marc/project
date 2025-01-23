import React, { useState } from 'react';
import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, Users, ShoppingBag, BarChart2, LogOut, 
  Package, Ban, Settings, Clock, X, ClipboardList 
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { ClockInManager } from './ClockInManager';

export function Layout() {
  const { user, signOut, clockIn, clockOut, verifyCredentials, isShiftEnded } = useAuth();
  const location = useLocation();
  const [showClockModal, setShowClockModal] = useState(false);
  const [showClockManager, setShowClockManager] = useState(false);
  const [credentials, setCredentials] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const navigation = [
    ...(user.role === 'admin' ? [
      { name: 'Dashboard', href: '/', icon: LayoutDashboard }
    ] : []),
    { name: 'Orders', href: '/orders', icon: ShoppingBag },
    { name: 'Collections', href: '/collections', icon: Package },
    ...(user.role === 'admin' ? [
      { name: 'Void Orders', href: '/void-orders', icon: Ban },
      { name: 'Services', href: '/services', icon: Settings },
      { name: 'Settings', href: '/settings', icon: Settings }
    ] : []),
    { name: 'Customers', href: '/customers', icon: Users },
    ...(user.role === 'admin' ? [
      { name: 'Reports', href: '/reports', icon: BarChart2 }
    ] : []),
    { name: 'End of Shift', href: '/end-of-shift', icon: ClipboardList }
  ];

  const handleClockAction = async (isClockIn: boolean) => {
    if (!credentials) {
      setError('Please enter your credentials');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const isValid = await verifyCredentials(
        user.role === 'employee' ? user.employeeNumber! : credentials,
        credentials
      );

      if (!isValid) {
        setError('Invalid credentials');
        return;
      }

      if (isClockIn) {
        await clockIn();
      } else {
        await clockOut();
      }

      setShowClockModal(false);
      setCredentials('');
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-center h-16 px-4 bg-indigo-600">
            <h1 className="text-xl font-bold text-white">Laundry POS</h1>
          </div>
          <div className="p-4">
            <div className="text-sm text-gray-600">
              Logged in as: <span className="font-medium">{user.name}</span>
              <br />
              Role: <span className="font-medium capitalize">{user.role}</span>
              {user.clockedIn && (
                <div className="mt-1 text-green-600">
                  <Clock className="inline-block w-4 h-4 mr-1" />
                  Clocked in at {format(user.lastClockIn!, 'HH:mm')}
                </div>
              )}
            </div>
            <div className="mt-2">
              <button
                onClick={() => setShowClockManager(true)}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
              >
                <Clock className="inline-block w-4 h-4 mr-2" />
                Clock In/Out Manager
              </button>
            </div>
          </div>
          <nav className="flex-1 px-2 py-4 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
          <div className="p-4 border-t">
            <button
              onClick={signOut}
              className="flex items-center w-full px-4 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-50"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <main className="p-6">
          <Outlet />
        </main>
      </div>

      {/* Clock In/Out Modal */}
      {showClockModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                {user.clockedIn ? 'Clock Out' : 'Clock In'}
              </h2>
              <button
                onClick={() => {
                  setShowClockModal(false);
                  setCredentials('');
                  setError('');
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {user.role === 'admin' ? 'Enter Password' : 'Enter Employee Number'}
                </label>
                <input
                  type="password"
                  value={credentials}
                  onChange={(e) => setCredentials(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder={user.role === 'admin' ? '••••••••' : 'EMP###'}
                />
              </div>

              {error && (
                <div className="text-sm text-red-600">
                  {error}
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowClockModal(false);
                    setCredentials('');
                    setError('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleClockAction(!user.clockedIn)}
                  disabled={isProcessing}
                  className={`px-4 py-2 text-white rounded-md text-sm font-medium disabled:opacity-50 ${
                    user.clockedIn
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {isProcessing ? 'Processing...' : user.clockedIn ? 'Clock Out' : 'Clock In'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clock In/Out Manager Modal */}
      {showClockManager && (
        <ClockInManager onClose={() => setShowClockManager(false)} />
      )}
    </div>
  );
}