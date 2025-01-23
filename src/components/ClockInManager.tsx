import React, { useState } from 'react';
import { X, Clock, Search } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'employee';
  employeeNumber?: string;
}

const MOCK_USERS = [
  {
    id: '1',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin' as const,
  },
  {
    id: '2',
    email: 'employee@example.com',
    name: 'Employee User',
    role: 'employee' as const,
    employeeNumber: 'EMP001',
  },
  {
    id: '3',
    email: 'employee2@example.com',
    name: 'Second Employee',
    role: 'employee' as const,
    employeeNumber: 'EMP002',
  }
];

export function ClockInManager({ onClose }: { onClose: () => void }) {
  const { verifyCredentials, clockIn, clockOut } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [credentials, setCredentials] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const filteredUsers = MOCK_USERS.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.employeeNumber && user.employeeNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleClockAction = async (user: User, isClockIn: boolean) => {
    if (!credentials) {
      setError('Please enter credentials');
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

      setSelectedUser(null);
      setCredentials('');
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Clock In/Out Manager</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {!selectedUser ? (
          <>
            <div className="mb-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by name, email, or employee number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 max-h-96 overflow-y-auto">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="border rounded-lg p-4 hover:border-indigo-500 cursor-pointer"
                  onClick={() => setSelectedUser(user)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium text-gray-900">{user.name}</h3>
                      <p className="text-sm text-gray-500">{user.email}</p>
                      {user.employeeNumber && (
                        <p className="text-sm text-gray-500">Employee #: {user.employeeNumber}</p>
                      )}
                    </div>
                    <Clock className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              ))}

              {filteredUsers.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  No users found matching your search
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <h3 className="font-medium text-gray-900">{selectedUser.name}</h3>
              <p className="text-sm text-gray-500">{selectedUser.email}</p>
              {selectedUser.employeeNumber && (
                <p className="text-sm text-gray-500">Employee #: {selectedUser.employeeNumber}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                {selectedUser.role === 'admin' ? 'Enter Password' : 'Enter Employee Number'}
              </label>
              <input
                type="password"
                value={credentials}
                onChange={(e) => setCredentials(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder={selectedUser.role === 'admin' ? '••••••••' : 'EMP###'}
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
                  setSelectedUser(null);
                  setCredentials('');
                  setError('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={() => handleClockAction(selectedUser, true)}
                disabled={isProcessing}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium disabled:opacity-50"
              >
                {isProcessing ? 'Processing...' : 'Clock In'}
              </button>
              <button
                onClick={() => handleClockAction(selectedUser, false)}
                disabled={isProcessing}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium disabled:opacity-50"
              >
                {isProcessing ? 'Processing...' : 'Clock Out'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}