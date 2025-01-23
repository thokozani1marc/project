import React, { useState, useEffect } from 'react';
import { Calendar, DollarSign, TrendingUp, Search, Clock, Users } from 'lucide-react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { getStorageItem } from '../utils/storage';

interface Order {
  id: string;
  customer: string;
  status: string;
  total: number;
  tax: number;
  date: Date;
  paymentStatus: string;
  paymentMethod: 'cash' | 'card' | 'pay_later';
}

interface TimeRecord {
  id: string;
  userId: string;
  userName: string;
  clockIn: Date;
  clockOut?: Date;
  totalHours?: number;
}

type ReportType = 'daily' | 'weekly' | 'monthly' | 'custom';
type PaymentMethodFilter = 'all' | 'cash' | 'card';
type ReportView = 'sales' | 'time';

const formatPrice = (amount: number) => `R${amount.toFixed(2)}`;
const formatHours = (hours: number) => `${Math.floor(hours)}h ${Math.round((hours % 1) * 60)}m`;

export function Reports() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [timeRecords, setTimeRecords] = useState<TimeRecord[]>([]);
  const [reportType, setReportType] = useState<ReportType>('daily');
  const [reportView, setReportView] = useState<ReportView>('sales');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<PaymentMethodFilter>('all');
  const [selectedReport, setSelectedReport] = useState<Order[]>([]);
  const [selectedTimeRecords, setSelectedTimeRecords] = useState<TimeRecord[]>([]);

  useEffect(() => {
    const savedOrders = getStorageItem<Order[]>('orders', []);
    const savedTimeRecords = getStorageItem<TimeRecord[]>('time_records', []);
    setOrders(savedOrders);
    setTimeRecords(savedTimeRecords);
  }, []);

  const filterByDateRange = (start: Date, end: Date) => {
    const filteredOrders = orders.filter(order => {
      const orderDate = new Date(order.date);
      return isWithinInterval(orderDate, { start, end }) &&
        (paymentMethodFilter === 'all' || order.paymentMethod === paymentMethodFilter);
    });

    const filteredTimeRecords = timeRecords.filter(record => {
      const clockInDate = new Date(record.clockIn);
      return isWithinInterval(clockInDate, { start, end });
    });

    setSelectedReport(filteredOrders);
    setSelectedTimeRecords(filteredTimeRecords);
  };

  const generateReport = () => {
    const today = new Date();

    switch (reportType) {
      case 'daily':
        filterByDateRange(startOfDay(today), endOfDay(today));
        break;
      case 'weekly':
        filterByDateRange(startOfWeek(today), endOfWeek(today));
        break;
      case 'monthly':
        filterByDateRange(startOfMonth(today), endOfMonth(today));
        break;
      case 'custom':
        filterByDateRange(
          startOfDay(new Date(startDate)),
          endOfDay(new Date(endDate))
        );
        break;
    }
  };

  useEffect(() => {
    generateReport();
  }, [reportType, paymentMethodFilter, startDate, endDate, orders, timeRecords]);

  const calculateTotals = () => {
    return selectedReport.reduce((acc, order) => ({
      orders: acc.orders + 1,
      revenue: acc.revenue + order.total,
      tax: acc.tax + order.tax
    }), { orders: 0, revenue: 0, tax: 0 });
  };

  const calculateTimeStats = () => {
    return selectedTimeRecords.reduce((acc, record) => {
      if (record.clockOut) {
        const hours = record.totalHours || 0;
        return {
          totalHours: acc.totalHours + hours,
          records: acc.records + 1
        };
      }
      return acc;
    }, { totalHours: 0, records: 0 });
  };

  const totals = calculateTotals();
  const timeStats = calculateTimeStats();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Reports</h1>
        <div className="space-x-4">
          <button
            onClick={() => setReportView('sales')}
            className={`px-4 py-2 rounded-md ${
              reportView === 'sales'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Sales Report
          </button>
          <button
            onClick={() => setReportView('time')}
            className={`px-4 py-2 rounded-md ${
              reportView === 'time'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Time Tracking
          </button>
        </div>
      </div>

      {/* Report Type Selection */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <button
          onClick={() => setReportType('daily')}
          className={`text-left p-6 rounded-lg shadow-md transition-shadow ${
            reportType === 'daily' ? 'bg-indigo-50 ring-2 ring-indigo-600' : 'bg-white hover:shadow-lg'
          }`}
        >
          <div className="flex items-center">
            <Calendar className={`h-8 w-8 ${reportType === 'daily' ? 'text-indigo-600' : 'text-gray-400'}`} />
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">Daily Report</h3>
              <p className="text-sm text-gray-500">Today's summary</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setReportType('weekly')}
          className={`text-left p-6 rounded-lg shadow-md transition-shadow ${
            reportType === 'weekly' ? 'bg-indigo-50 ring-2 ring-indigo-600' : 'bg-white hover:shadow-lg'
          }`}
        >
          <div className="flex items-center">
            <Calendar className={`h-8 w-8 ${reportType === 'weekly' ? 'text-indigo-600' : 'text-gray-400'}`} />
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">Weekly Report</h3>
              <p className="text-sm text-gray-500">This week's summary</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setReportType('monthly')}
          className={`text-left p-6 rounded-lg shadow-md transition-shadow ${
            reportType === 'monthly' ? 'bg-indigo-50 ring-2 ring-indigo-600' : 'bg-white hover:shadow-lg'
          }`}
        >
          <div className="flex items-center">
            <Calendar className={`h-8 w-8 ${reportType === 'monthly' ? 'text-indigo-600' : 'text-gray-400'}`} />
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">Monthly Report</h3>
              <p className="text-sm text-gray-500">This month's summary</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setReportType('custom')}
          className={`text-left p-6 rounded-lg shadow-md transition-shadow ${
            reportType === 'custom' ? 'bg-indigo-50 ring-2 ring-indigo-600' : 'bg-white hover:shadow-lg'
          }`}
        >
          <div className="flex items-center">
            <Search className={`h-8 w-8 ${reportType === 'custom' ? 'text-indigo-600' : 'text-gray-400'}`} />
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">Custom Range</h3>
              <p className="text-sm text-gray-500">Select date range</p>
            </div>
          </div>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-md space-y-4">
        <div className="flex flex-wrap gap-4">
          {reportType === 'custom' && (
            <div className="flex gap-4">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                  Start Date
                </label>
                <input
                  type="date"
                  id="startDate"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1 block rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
                  End Date
                </label>
                <input
                  type="date"
                  id="endDate"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1 block rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>
          )}
          {reportView === 'sales' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Payment Method
              </label>
              <select
                value={paymentMethodFilter}
                onChange={(e) => setPaymentMethodFilter(e.target.value as PaymentMethodFilter)}
                className="mt-1 block rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="all">All Methods</option>
                <option value="cash">Cash Only</option>
                <option value="card">Card Only</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {reportView === 'sales' ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <DollarSign className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Revenue
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {formatPrice(totals.revenue)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TrendingUp className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Orders
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {totals.orders}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <DollarSign className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Tax
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {formatPrice(totals.tax)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Clock className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Hours Worked
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {formatHours(timeStats.totalHours)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Users className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Clock In/Out Records
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {timeStats.records}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Records */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            {reportView === 'sales' ? 'Detailed Orders' : 'Time Records'}
          </h3>
        </div>
        <div className="overflow-x-auto">
          {reportView === 'sales' ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {selectedReport.map((order) => (
                  <tr key={order.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {order.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.customer}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(order.date), 'MMM d, yyyy HH:mm')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.paymentMethod === 'pay_later' ? 'Pay Later' : 
                        order.paymentMethod.charAt(0).toUpperCase() + order.paymentMethod.slice(1)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        order.status === 'completed' ? 'bg-green-100 text-green-800' :
                        order.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                      {formatPrice(order.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Clock In
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Clock Out
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Hours
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {selectedTimeRecords.map((record) => (
                  <tr key={record.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {record.userName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(record.clockIn), 'MMM d, yyyy HH:mm')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {record.clockOut ? format(new Date(record.clockOut), 'MMM d, yyyy HH:mm') : 'Active'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                      {record.totalHours ? formatHours(record.totalHours) : 'In Progress'}
                    </td>
                  </tr>
                ))}
                {selectedTimeRecords.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                      No time records found for the selected period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}