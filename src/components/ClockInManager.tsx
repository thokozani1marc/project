import React, { useState, useEffect } from 'react';
import { X, Clock, Search } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { getStorageItem } from '../utils/storage';

interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  gender: 'male' | 'female' | 'other';
  phone: string;
  employeeNumber: string;
  status: 'employee' | 'admin';
}

export function ClockInManager({ onClose }: { onClose: () => void }) {
  const { verifyCredentials, clockIn, clockOut } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [credentials, setCredentials] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);

  useEffect(() => {
    const savedStaffMembers = getStorageItem<StaffMember[]>('staff_members', []);
    setStaffMembers(savedStaffMembers);
  }, []);

  const filteredStaff = staffMembers.filter(staff => 
    `${staff.firstName} ${staff.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    staff.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
    staff.employeeNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleClockAction = async (staff: StaffMember, isClockIn: boolean) => {
    if (!credentials) {
      setError('Please enter credentials');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const isValid = await verifyCredentials(staff.employeeNumber, credentials);

      if (!isValid) {
        setError('Invalid credentials');
        return;
      }

      if (isClockIn) {
        await clockIn();
      } else {
        await clockOut();
      }

      setSelectedStaff(null);
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

        {!selectedStaff ? (
          <>
            <div className="mb-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search staff..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md pl-10 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
            </div>

            <div className="mt-4">
              {filteredStaff.length === 0 ? (
                <p className="text-center text-gray-500">No staff members found</p>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {filteredStaff.map((staff) => (
                    <div
                      key={staff.id}
                      onClick={() => setSelectedStaff(staff)}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {staff.firstName} {staff.lastName}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {staff.employeeNumber} • {staff.status.charAt(0).toUpperCase() + staff.status.slice(1)}
                        </p>
                      </div>
                      <Clock className="h-5 w-5 text-gray-400" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900">
                {selectedStaff.firstName} {selectedStaff.lastName}
              </h3>
              <p className="text-sm text-gray-500">
                {selectedStaff.employeeNumber} • {selectedStaff.status.charAt(0).toUpperCase() + selectedStaff.status.slice(1)}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Enter Password
              </label>
              <input
                type="password"
                value={credentials}
                onChange={(e) => setCredentials(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter your password"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <div className="flex space-x-4">
              <button
                onClick={() => handleClockAction(selectedStaff, true)}
                disabled={isProcessing}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                Clock In
              </button>
              <button
                onClick={() => handleClockAction(selectedStaff, false)}
                disabled={isProcessing}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                Clock Out
              </button>
            </div>

            <button
              onClick={() => setSelectedStaff(null)}
              className="w-full text-gray-600 hover:text-gray-900"
            >
              Back to Staff List
            </button>
          </div>
        )}
      </div>
    </div>
  );
}