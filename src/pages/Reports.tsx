import React, { useState, useEffect } from 'react';
import { Calendar, DollarSign, TrendingUp, Search, Clock, Users } from 'lucide-react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, getHours, getDay } from 'date-fns';
import { getStorageItem } from '../utils/storage';
import { Bar, Pie } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';

interface OrderItem {
  serviceId: string;
  quantity: number;
  price: number;
  subtotal: number;
}

interface Order {
  id: string;
  customer: string;
  status: string;
  total: number;
  tax: number;
  date: Date;
  paymentStatus: string;
  paymentMethod: 'cash' | 'card' | 'pay_later';
  items: OrderItem[];
}

interface TimeRecord {
  id: string;
  userId: string;
  userName: string;
  clockIn: Date;
  clockOut?: Date;
  totalHours?: number;
}

interface Service {
  id: string;
  name: string;
  price: number;
  description: string;
  categoryId: string;
}

interface ServiceAnalytics {
  serviceId: string;
  serviceName: string;
  count: number;
  revenue: number;
  averagePrice: number;
}

interface ActivityData {
  hourly: number[];
  daily: number[];
  totalOrders: number;
  peakHour: number;
  peakDay: number;
  averageOrdersPerDay: number;
}

type ReportType = 'daily' | 'weekly' | 'monthly' | 'custom';
type PaymentMethodFilter = 'all' | 'cash' | 'card';
type ReportView = 'sales' | 'time' | 'services' | 'activity';
type ServiceSortBy = 'count' | 'revenue' | 'averagePrice';
type SortOrder = 'asc' | 'desc';

const formatPrice = (amount: number) => `R${amount.toFixed(2)}`;
const formatHours = (hours: number) => `${Math.floor(hours)}h ${Math.round((hours % 1) * 60)}m`;

export function Reports() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [timeRecords, setTimeRecords] = useState<TimeRecord[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [serviceAnalytics, setServiceAnalytics] = useState<ServiceAnalytics[]>([]);
  const [activityData, setActivityData] = useState<ActivityData>({
    hourly: Array(24).fill(0),
    daily: Array(7).fill(0),
    totalOrders: 0,
    peakHour: 0,
    peakDay: 0,
    averageOrdersPerDay: 0
  });
  const [reportType, setReportType] = useState<ReportType>('daily');
  const [reportView, setReportView] = useState<ReportView>('sales');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<PaymentMethodFilter>('all');
  const [selectedReport, setSelectedReport] = useState<Order[]>([]);
  const [selectedTimeRecords, setSelectedTimeRecords] = useState<TimeRecord[]>([]);
  const [serviceSortBy, setServiceSortBy] = useState<ServiceSortBy>('count');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const savedOrders = getStorageItem<Order[]>('orders', []);
    const savedTimeRecords = getStorageItem<TimeRecord[]>('time_records', []);
    const savedServices = getStorageItem<Service[]>('services', []);
    // Filter out voided orders
    const activeOrders = savedOrders.filter(order => order.status !== 'voided');
    setOrders(activeOrders);
    setTimeRecords(savedTimeRecords);
    setServices(savedServices);
  }, []);

  const filterByDateRange = (start: Date, end: Date) => {
    const filteredOrders = orders.filter(order => {
      const orderDate = new Date(order.date);
      return isWithinInterval(orderDate, { start, end }) &&
        (paymentMethodFilter === 'all' || order.paymentMethod === paymentMethodFilter) &&
        order.status !== 'voided';
    });

    const filteredTimeRecords = timeRecords.filter(record => {
      const clockInDate = new Date(record.clockIn);
      return isWithinInterval(clockInDate, { start, end });
    });

    setSelectedReport(filteredOrders);
    setSelectedTimeRecords(filteredTimeRecords);
    calculateServiceAnalytics(filteredOrders);
    calculateActivityData(filteredOrders);
  };

  const calculateServiceAnalytics = (filteredOrders: Order[]) => {
    const analytics = new Map<string, ServiceAnalytics>();

    // Initialize analytics with all services
    services.forEach(service => {
      analytics.set(service.id, {
        serviceId: service.id,
        serviceName: service.name,
        count: 0,
        revenue: 0,
        averagePrice: 0
      });
    });

    // Calculate metrics from orders
    filteredOrders.forEach(order => {
      order.items.forEach(item => {
        const current = analytics.get(item.serviceId);
        if (current) {
          current.count += item.quantity;
          current.revenue += item.subtotal;
          current.averagePrice = current.revenue / current.count;
        }
      });
    });

    // Sort analytics
    let sortedAnalytics = Array.from(analytics.values());
    
    // Apply search filter
    if (searchTerm) {
      sortedAnalytics = sortedAnalytics.filter(item => 
        item.serviceName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort by selected metric
    sortedAnalytics.sort((a, b) => {
      const multiplier = sortOrder === 'desc' ? -1 : 1;
      return multiplier * (a[serviceSortBy] - b[serviceSortBy]);
    });

    setServiceAnalytics(sortedAnalytics);
  };

  const calculateActivityData = (filteredOrders: Order[]) => {
    const hourly = Array(24).fill(0);
    const daily = Array(7).fill(0);
    
    filteredOrders.forEach(order => {
      const orderDate = new Date(order.date);
      const hour = getHours(orderDate);
      const day = getDay(orderDate);
      
      hourly[hour]++;
      daily[day]++;
    });

    // Find peak times
    const peakHour = hourly.indexOf(Math.max(...hourly));
    const peakDay = daily.indexOf(Math.max(...daily));
    const totalOrders = filteredOrders.length;
    const averageOrdersPerDay = totalOrders / 7;

    setActivityData({
      hourly,
      daily,
      totalOrders,
      peakHour,
      peakDay,
      averageOrdersPerDay
    });
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

  // Chart data for services
  const serviceChartData: ChartData<'bar' | 'pie'> = {
    labels: serviceAnalytics.slice(0, 10).map(s => s.serviceName),
    datasets: [
      {
        label: serviceSortBy === 'count' ? 'Number of Sales' : 
               serviceSortBy === 'revenue' ? 'Total Revenue' : 'Average Price',
        data: serviceAnalytics.slice(0, 10).map(s => s[serviceSortBy]),
        backgroundColor: [
          'rgba(255, 99, 132, 0.5)',
          'rgba(54, 162, 235, 0.5)',
          'rgba(255, 206, 86, 0.5)',
          'rgba(75, 192, 192, 0.5)',
          'rgba(153, 102, 255, 0.5)',
          'rgba(255, 159, 64, 0.5)',
          'rgba(201, 203, 207, 0.5)',
          'rgba(255, 99, 132, 0.5)',
          'rgba(54, 162, 235, 0.5)',
          'rgba(255, 206, 86, 0.5)'
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)',
          'rgba(201, 203, 207, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)'
        ],
        borderWidth: 1
      }
    ]
  };

  const chartOptions: ChartOptions<'bar' | 'pie'> = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Service Analytics',
      },
    },
  };

  // Activity chart data
  const hourlyActivityData: ChartData<'bar'> = {
    labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
    datasets: [{
      label: 'Orders per Hour',
      data: activityData.hourly,
      backgroundColor: 'rgba(54, 162, 235, 0.5)',
      borderColor: 'rgb(54, 162, 235)',
      borderWidth: 1
    }]
  };

  const dailyActivityData: ChartData<'bar'> = {
    labels: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    datasets: [{
      label: 'Orders per Day',
      data: activityData.daily,
      backgroundColor: 'rgba(75, 192, 192, 0.5)',
      borderColor: 'rgb(75, 192, 192)',
      borderWidth: 1
    }]
  };

  const activityChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `${context.parsed.y} orders`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1
        }
      }
    }
  };

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
          <button
            onClick={() => setReportView('services')}
            className={`px-4 py-2 rounded-md ${
              reportView === 'services'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Service Analytics
          </button>
          <button
            onClick={() => setReportView('activity')}
            className={`px-4 py-2 rounded-md ${
              reportView === 'activity'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Activity Analysis
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
      ) : reportView === 'time' ? (
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
      ) : reportView === 'services' ? (
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-medium text-gray-900">Service Performance</h2>
              <div className="flex space-x-4">
                <select
                  value={serviceSortBy}
                  onChange={(e) => setServiceSortBy(e.target.value as ServiceSortBy)}
                  className="rounded-md border-gray-300"
                >
                  <option value="count">Sort by Usage</option>
                  <option value="revenue">Sort by Revenue</option>
                  <option value="averagePrice">Sort by Average Price</option>
                </select>
                <button
                  onClick={() => setSortOrder(order => order === 'asc' ? 'desc' : 'asc')}
                  className="px-3 py-2 border rounded-md hover:bg-gray-50"
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
                <input
                  type="text"
                  placeholder="Search services..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="rounded-md border-gray-300"
                />
              </div>
            </div>

            {/* Service Charts */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-lg font-medium mb-4">Top Services Chart</h3>
                <Bar data={serviceChartData} options={chartOptions} />
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-lg font-medium mb-4">Service Distribution</h3>
                <Pie data={serviceChartData} options={chartOptions} />
              </div>
            </div>

            {/* Service Analytics Table */}
            <div className="mt-6">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Service Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usage Count
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Revenue
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Average Price
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {serviceAnalytics.map((service) => (
                    <tr key={service.serviceId}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {service.serviceName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {service.count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatPrice(service.revenue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatPrice(service.averagePrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-medium text-gray-900">Activity Analysis</h2>
            </div>

            {/* Activity Stats */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-4 mb-6">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <Users className="h-6 w-6 text-gray-400" />
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Total Orders
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {activityData.totalOrders}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <Clock className="h-6 w-6 text-gray-400" />
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Peak Hour
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {`${activityData.peakHour}:00`}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <Calendar className="h-6 w-6 text-gray-400" />
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Busiest Day
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][activityData.peakDay]}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <TrendingUp className="h-6 w-6 text-gray-400" />
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Avg Orders/Day
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {activityData.averageOrdersPerDay.toFixed(1)}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Activity Charts */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-lg font-medium mb-4">Hourly Activity</h3>
                <Bar data={hourlyActivityData} options={activityChartOptions} />
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-lg font-medium mb-4">Daily Activity</h3>
                <Bar data={dailyActivityData} options={activityChartOptions} />
              </div>
            </div>

            {/* Activity Heatmap */}
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-4">Weekly Activity Heatmap</h3>
              <div className="grid grid-cols-8 gap-1">
                <div className="h-8"></div>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="h-8 flex items-center justify-center text-sm text-gray-500">
                    {day}
                  </div>
                ))}
                {Array.from({ length: 24 }, (_, hour) => (
                  <React.Fragment key={hour}>
                    <div className="h-8 flex items-center justify-end pr-2 text-sm text-gray-500">
                      {`${hour}:00`}
                    </div>
                    {Array.from({ length: 7 }, (_, day) => {
                      const value = activityData.hourly[hour] + activityData.daily[day];
                      const intensity = Math.min(value / (activityData.totalOrders / 10), 1);
                      return (
                        <div
                          key={`${hour}-${day}`}
                          className="h-8 rounded"
                          style={{
                            backgroundColor: `rgba(99, 102, 241, ${intensity})`
                          }}
                          title={`${value} orders`}
                        />
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Records */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            {reportView === 'sales' ? 'Detailed Orders' : reportView === 'time' ? 'Time Records' : 'Service Analytics'}
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
          ) : reportView === 'time' ? (
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
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usage Count
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Average Price
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {serviceAnalytics.map((service) => (
                  <tr key={service.serviceId}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {service.serviceName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {service.count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatPrice(service.revenue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatPrice(service.averagePrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}