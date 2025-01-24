import React, { useState, useEffect } from 'react';
import { Calculator, DollarSign, CreditCard, Hash, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { getStorageItem, setStorageItem } from '../utils/storage';
import { useAuth } from '../contexts/AuthContext';
import { clsx } from 'clsx';

interface ShiftRecord {
  id: string;
  userId: string;
  userName: string;
  date: Date;
  totalCash: number;
  totalCard: number;
  totalPoints: number;
  extractCash: number;
  extraCard: number;
  extraPoints: number;
  extraTotal: number;
  confirmedAt: Date;
}

export function EndOfShift() {
  const { user } = useAuth();
  const [shiftData, setShiftData] = useState({
    totalCash: 0,
    totalCard: 0,
    totalPoints: 0,
    extractCash: 0,
    extraCard: 0,
    extraPoints: 0
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentShift, setCurrentShift] = useState<ShiftRecord | null>(null);

  useEffect(() => {
    // Load today's orders to calculate totals
    const orders = getStorageItem<any[]>('orders', []);
    const today = new Date();
    const todayOrders = orders.filter(order => {
      const orderDate = new Date(order.date);
      return format(orderDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd') && 
             order.status !== 'voided';
    });

    // Calculate totals from orders
    const totals = todayOrders.reduce((acc, order) => {
      if (order.paymentMethod === 'cash') {
        acc.totalCash += order.total;
      } else if (order.paymentMethod === 'card') {
        acc.totalCard += order.total;
      } else if (order.paymentMethod === 'points') {
        acc.totalPoints += order.total;
      }
      return acc;
    }, {
      totalCash: 0,
      totalCard: 0,
      totalPoints: 0
    });

    setShiftData(prev => ({
      ...prev,
      ...totals
    }));

    // Check if shift is already ended for today
    const shifts = getStorageItem<ShiftRecord[]>('shift_records', []);
    const todayShift = shifts.find(shift => 
      format(new Date(shift.date), 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
    );
    setCurrentShift(todayShift || null);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const extraTotal = shiftData.extractCash + shiftData.extraCard + shiftData.extraPoints;
      const newShift: ShiftRecord = {
        id: `shift_${Date.now()}`,
        userId: user!.id,
        userName: user!.name,
        date: new Date(),
        ...shiftData,
        extraTotal,
        confirmedAt: new Date()
      };

      const shifts = getStorageItem<ShiftRecord[]>('shift_records', []);
      setStorageItem('shift_records', [...shifts, newShift]);
      setCurrentShift(newShift);
      setSuccess('End of shift has been confirmed successfully');
    } catch (err) {
      setError('Failed to submit end of shift');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (currentShift) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-gray-900">End of Shift</h1>
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Shift has already been ended for today at {format(new Date(currentShift.confirmedAt), 'HH:mm')}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Shift Summary</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center">
                <DollarSign className="h-5 w-5 text-gray-400" />
                <span className="ml-2 text-sm font-medium text-gray-500">Total Cash</span>
              </div>
              <p className="mt-2 text-lg font-semibold text-gray-900">
                R{currentShift.totalCash.toFixed(2)}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center">
                <CreditCard className="h-5 w-5 text-gray-400" />
                <span className="ml-2 text-sm font-medium text-gray-500">Total Card</span>
              </div>
              <p className="mt-2 text-lg font-semibold text-gray-900">
                R{currentShift.totalCard.toFixed(2)}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center">
                <Hash className="h-5 w-5 text-gray-400" />
                <span className="ml-2 text-sm font-medium text-gray-500">Total Points</span>
              </div>
              <p className="mt-2 text-lg font-semibold text-gray-900">
                R{currentShift.totalPoints.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">End of Shift</h1>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-green-400" />
            <div className="ml-3">
              <p className="text-sm text-green-700">{success}</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">System Totals</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Total Cash in Hand
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">R</span>
                </div>
                <input
                  type="number"
                  value={shiftData.totalCash}
                  readOnly
                  className="mt-1 block w-full pl-7 pr-12 rounded-md border-gray-300 bg-gray-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Total Payment Card
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">R</span>
                </div>
                <input
                  type="number"
                  value={shiftData.totalCard}
                  readOnly
                  className="mt-1 block w-full pl-7 pr-12 rounded-md border-gray-300 bg-gray-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Total Points
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">R</span>
                </div>
                <input
                  type="number"
                  value={shiftData.totalPoints}
                  readOnly
                  className="mt-1 block w-full pl-7 pr-12 rounded-md border-gray-300 bg-gray-50"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Extra Amounts</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Extract Cash
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">R</span>
                </div>
                <input
                  type="number"
                  value={shiftData.extractCash}
                  onChange={(e) => setShiftData({ ...shiftData, extractCash: parseFloat(e.target.value) || 0 })}
                  className="mt-1 block w-full pl-7 pr-12 rounded-md border-gray-300"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Extra Card
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">R</span>
                </div>
                <input
                  type="number"
                  value={shiftData.extraCard}
                  onChange={(e) => setShiftData({ ...shiftData, extraCard: parseFloat(e.target.value) || 0 })}
                  className="mt-1 block w-full pl-7 pr-12 rounded-md border-gray-300"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Extra Points
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">R</span>
                </div>
                <input
                  type="number"
                  value={shiftData.extraPoints}
                  onChange={(e) => setShiftData({ ...shiftData, extraPoints: parseFloat(e.target.value) || 0 })}
                  className="mt-1 block w-full pl-7 pr-12 rounded-md border-gray-300"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className={clsx(
              "px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white",
              isSubmitting
                ? "bg-indigo-400 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            )}
          >
            {isSubmitting ? 'Confirming...' : 'Confirm End of Shift'}
          </button>
        </div>
      </form>
    </div>
  );
}