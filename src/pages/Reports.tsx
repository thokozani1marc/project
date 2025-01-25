import React, { useState, useEffect } from 'react';
import { Calendar, DollarSign, TrendingUp, Search, Clock, Users, Package } from 'lucide-react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, getHours, getDay, differenceInDays } from 'date-fns';
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

interface KeyInventoryItem {
  id: string;
  name: string;
  currentStock: number;
  reorderPoint: number;
  costPrice: number;
  sellingPrice: number;
  specifications: {
    type: string;
  };
}

interface InventoryReportData {
  totalStockValue: number;
  totalPotentialRevenue: number;
  averageMargin: number;
  fastMoving: KeyPerformanceMetrics[];
  slowMoving: KeyPerformanceMetrics[];
  stockAlerts: {
    lowStock: KeyInventoryItem[];
    outOfStock: KeyInventoryItem[];
  };
  categoryBreakdown: {
    [category: string]: {
      quantity: number;
      value: number;
      sales: number;
    };
  };
  totalOrders: number;
  totalRevenue: number;
  totalTax: number;
  paymentMethods: {
    cash: number;
    card: number;
    payLater: number;
  };
}

interface KeyPerformanceMetrics {
  keyId: string;
  name: string;
  currentStock: number;
  totalSales: number;
  salesVelocity: number;
  daysOfStock: number;
  costValue: number;
  sellingValue: number;
  profitMargin: number;
  movementHistory: any[];
  wastage: number;
  category: string;
}

interface InventorySale {
  id: string;
  date: Date;
  items: {
    keyId: string;
    quantity: number;
  }[];
  voidedAt?: Date;
  paymentMethod: 'cash' | 'card' | 'pay_later';
}

type ReportType = 'daily' | 'weekly' | 'monthly' | 'custom';
type PaymentMethodFilter = 'all' | 'cash' | 'card';
type ReportView = 'sales' | 'time' | 'services' | 'activity' | 'inventory';
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
  const [inventoryItems, setInventoryItems] = useState<KeyInventoryItem[]>([]);
  const [inventorySales, setInventorySales] = useState<InventorySale[]>([]);
  const [inventoryReport, setInventoryReport] = useState<InventoryReportData | null>(null);

  // Load all required data
  useEffect(() => {
    const orders = getStorageItem<Order[]>('orders', []);
    const timeRecords = getStorageItem<TimeRecord[]>('timeRecords', []);
    const services = getStorageItem<Service[]>('services', []);
    const keyInventory = getStorageItem<KeyInventoryItem[]>('keyInventory', []);
    const inventorySales = getStorageItem<InventorySale[]>('inventorySales', []);

    setOrders(orders);
    setTimeRecords(timeRecords);
    setServices(services);
    setInventoryItems(keyInventory);
    setInventorySales(inventorySales);

    console.log('Loaded data:', {
      orders: orders.length,
      timeRecords: timeRecords.length,
      services: services.length,
      keyInventory: keyInventory.length,
      inventorySales: inventorySales.length
    });
  }, []);

  // Update report when view or date range changes
  useEffect(() => {
    if (reportView === 'inventory' && inventoryItems.length > 0) {
      const today = new Date();
      let start = today;
      let end = today;

      switch (reportType) {
        case 'daily':
          start = startOfDay(today);
          end = endOfDay(today);
          break;
        case 'weekly':
          start = startOfWeek(today);
          end = endOfWeek(today);
          break;
        case 'monthly':
          start = startOfMonth(today);
          end = endOfMonth(today);
          break;
        case 'custom':
          start = startOfDay(new Date(startDate));
          end = endOfDay(new Date(endDate));
          break;
      }

      // Get orders for the date range
      const filteredOrders = orders.filter(order => {
        const orderDate = new Date(order.date);
        return order.status !== 'voided' && isWithinInterval(orderDate, { start, end });
      });

      // Calculate metrics
      const totalRevenue = filteredOrders.reduce((sum, order) => sum + order.total, 0);
      const totalTax = filteredOrders.reduce((sum, order) => sum + order.tax, 0);
      const paymentMethods = {
        cash: filteredOrders.filter(o => o.paymentMethod === 'cash').length,
        card: filteredOrders.filter(o => o.paymentMethod === 'card').length,
        payLater: filteredOrders.filter(o => o.paymentMethod === 'pay_later').length
      };

      // Get inventory sales for the date range
      const sales = inventorySales.filter(sale => {
        const saleDate = new Date(sale.date);
        return !sale.voidedAt && isWithinInterval(saleDate, { start, end });
      });

      const metrics = inventoryItems.map(item => {
        const itemSales = sales.flatMap(sale => 
          sale.items.filter(i => i.keyId === item.id)
        );
        
        const totalSales = itemSales.reduce((sum, sale) => sum + sale.quantity, 0);
        const salesVelocity = totalSales / Math.max(1, differenceInDays(end, start));
        const daysOfStock = salesVelocity > 0 ? item.currentStock / salesVelocity : 999;
        
        const costValue = item.costPrice * item.currentStock;
        const sellingValue = item.sellingPrice * item.currentStock;
        const profitMargin = ((item.sellingPrice - item.costPrice) / item.costPrice) * 100;

        return {
          keyId: item.id,
          name: item.name,
          currentStock: item.currentStock,
          totalSales,
          salesVelocity,
          daysOfStock,
          costValue,
          sellingValue,
          profitMargin,
          movementHistory: [],
          wastage: 0,
          category: item.specifications.type
        };
      });

      const FAST_MOVING_THRESHOLD = 0.5;
      const fastMoving = metrics.filter(m => m.salesVelocity >= FAST_MOVING_THRESHOLD);
      const slowMoving = metrics.filter(m => m.salesVelocity < FAST_MOVING_THRESHOLD);

      const categoryBreakdown = metrics.reduce((acc, metric) => {
        const category = metric.category;
        if (!acc[category]) {
          acc[category] = { quantity: 0, value: 0, sales: 0 };
        }
        acc[category].quantity += metric.currentStock;
        acc[category].value += metric.costValue;
        acc[category].sales += metric.totalSales;
        return acc;
      }, {} as InventoryReportData['categoryBreakdown']);

      const reportData: InventoryReportData = {
        totalStockValue: metrics.reduce((sum, m) => sum + m.costValue, 0),
        totalPotentialRevenue: metrics.reduce((sum, m) => sum + m.sellingValue, 0),
        averageMargin: metrics.reduce((sum, m) => sum + m.profitMargin, 0) / metrics.length,
        fastMoving,
        slowMoving,
        stockAlerts: {
          lowStock: inventoryItems.filter(item => item.currentStock <= item.reorderPoint && item.currentStock > 0),
          outOfStock: inventoryItems.filter(item => item.currentStock === 0)
        },
        categoryBreakdown,
        totalOrders: filteredOrders.length,
        totalRevenue,
        totalTax,
        paymentMethods
      };

      console.log('Generated report:', {
        dateRange: { start, end },
        orders: filteredOrders.length,
        sales: sales.length,
        metrics: metrics.length,
        reportData
      });

      setInventoryReport(reportData);
    }
  }, [reportView, reportType, startDate, endDate, inventoryItems, orders, inventorySales]);

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
    if (!Array.isArray(services) || services.length === 0) {
      setServiceAnalytics([]);
      return;
    }

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

  // Chart data types
  const chartData: ChartData<'bar'> = {
    labels: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    datasets: [
      {
        label: 'Orders',
        data: activityData.daily,
        backgroundColor: 'rgba(99, 102, 241, 0.5)',
        borderColor: 'rgb(99, 102, 241)',
        borderWidth: 1,
      },
    ],
  };

  const hourlyChartData: ChartData<'bar'> = {
    labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
    datasets: [
      {
        label: 'Orders',
        data: activityData.hourly,
        backgroundColor: 'rgba(99, 102, 241, 0.5)',
        borderColor: 'rgb(99, 102, 241)',
        borderWidth: 1,
      },
    ],
  };

  const paymentMethodChartData: ChartData<'pie'> = {
    labels: ['Cash', 'Card', 'Pay Later'],
    datasets: [
      {
        data: [
          selectedReport.filter(order => order.paymentMethod === 'cash').length,
          selectedReport.filter(order => order.paymentMethod === 'card').length,
          selectedReport.filter(order => order.paymentMethod === 'pay_later').length,
        ],
        backgroundColor: [
          'rgba(52, 211, 153, 0.5)',
          'rgba(99, 102, 241, 0.5)',
          'rgba(251, 191, 36, 0.5)',
        ],
        borderColor: [
          'rgb(52, 211, 153)',
          'rgb(99, 102, 241)',
          'rgb(251, 191, 36)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions: ChartOptions<'bar'> = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
  };

  const pieChartOptions: ChartOptions<'pie'> = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
  };

  const renderInventoryReport = () => {
    if (!inventoryReport) return null;

    return (
      <div className="space-y-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Revenue</h3>
            <p className="text-2xl font-semibold">{formatPrice(inventoryReport.totalRevenue)}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Orders</h3>
            <p className="text-2xl font-semibold">{inventoryReport.totalOrders}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Tax</h3>
            <p className="text-2xl font-semibold">{formatPrice(inventoryReport.totalTax)}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Average Margin</h3>
            <p className="text-2xl font-semibold">{inventoryReport.averageMargin.toFixed(1)}%</p>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Payment Methods</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-semibold">{inventoryReport.paymentMethods.cash}</p>
              <p className="text-sm text-gray-500">Cash</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-semibold">{inventoryReport.paymentMethods.card}</p>
              <p className="text-sm text-gray-500">Card</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-semibold">{inventoryReport.paymentMethods.payLater}</p>
              <p className="text-sm text-gray-500">Pay Later</p>
            </div>
          </div>
        </div>

        {/* Fast/Slow Moving Items */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium mb-4">Fast Moving Items</h3>
            <div className="space-y-4">
              {inventoryReport.fastMoving.map(item => (
                <div key={item.keyId} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-gray-500">
                      {item.salesVelocity.toFixed(1)} units/day
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{item.currentStock} in stock</p>
                    <p className="text-sm text-gray-500">
                      {item.daysOfStock.toFixed(1)} days remaining
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium mb-4">Slow Moving Items</h3>
            <div className="space-y-4">
              {inventoryReport.slowMoving.map(item => (
                <div key={item.keyId} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-gray-500">
                      {item.salesVelocity.toFixed(1)} units/day
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatPrice(item.costValue)}</p>
                    <p className="text-sm text-gray-500">
                      {item.currentStock} units
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Category Breakdown</h3>
          <div className="space-y-4">
            {Object.entries(inventoryReport.categoryBreakdown).map(([category, data]) => (
              <div key={category} className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{category}</p>
                  <p className="text-sm text-gray-500">{data.quantity} units</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatPrice(data.value)}</p>
                  <p className="text-sm text-gray-500">{data.sales} sold</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stock Alerts */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Stock Alerts</h3>
          <div className="space-y-6">
            {inventoryReport.stockAlerts.outOfStock.length > 0 && (
              <div>
                <h4 className="text-md font-medium text-red-600 mb-2">Out of Stock</h4>
                <div className="space-y-2">
                  {inventoryReport.stockAlerts.outOfStock.map(item => (
                    <div key={item.id} className="flex justify-between items-center">
                      <p>{item.name}</p>
                      <p className="text-red-600">0 units</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {inventoryReport.stockAlerts.lowStock.length > 0 && (
              <div>
                <h4 className="text-md font-medium text-yellow-600 mb-2">Low Stock</h4>
                <div className="space-y-2">
                  {inventoryReport.stockAlerts.lowStock.map(item => (
                    <div key={item.id} className="flex justify-between items-center">
                      <p>{item.name}</p>
                      <p className="text-yellow-600">{item.currentStock} units</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
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
          <button
            onClick={() => setReportView('inventory')}
            className={`px-4 py-2 rounded-md flex items-center ${
              reportView === 'inventory'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <Package className="w-5 h-5 mr-2" />
            Inventory Report
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
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-lg font-medium mb-4">Top Services Chart</h3>
                <Bar data={chartData} options={chartOptions} />
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-lg font-medium mb-4">Service Distribution</h3>
                <Pie data={paymentMethodChartData} options={pieChartOptions} />
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
      ) : reportView === 'inventory' ? (
        renderInventoryReport()
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
                <h3 className="text-lg font-medium mb-4">Daily Orders</h3>
                <Bar data={chartData} options={chartOptions} />
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-lg font-medium mb-4">Hourly Orders</h3>
                <Bar data={hourlyChartData} options={chartOptions} />
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