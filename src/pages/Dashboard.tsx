import React, { useEffect, useState } from 'react';
import { ShoppingBag, Users, TrendingUp, DollarSign } from 'lucide-react';
import { format, subDays, startOfToday, endOfToday, isWithinInterval } from 'date-fns';
import { Bar, Pie } from 'react-chartjs-2';
import { getStorageItem } from '../utils/storage';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface Order {
  id: string;
  customer: string;
  status: string;
  total: number;
  tax: number;
  date: Date;
  paymentStatus: string;
  paymentMethod: 'cash' | 'card' | 'pay_later';
  items: Array<{
    serviceId: string;
    quantity: number;
    price: number;
    subtotal: number;
  }>;
}

interface Service {
  id: string;
  name: string;
  price: number;
}

const services: Service[] = [
  { id: '1', name: 'Wash & Fold', price: 89.99 },
  { id: '2', name: 'Dry Cleaning', price: 199.99 },
  { id: '3', name: 'Express Service', price: 249.99 },
  { id: '4', name: 'Ironing', price: 59.99 },
  { id: '5', name: 'Stain Removal', price: 149.99 }
];

const formatPrice = (amount: number) => `R${amount.toFixed(2)}`;

export function Dashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [todayOrders, setTodayOrders] = useState<Order[]>([]);
  const [weeklyData, setWeeklyData] = useState<{ dates: string[], amounts: number[] }>({ dates: [], amounts: [] });
  const [serviceData, setServiceData] = useState<{ labels: string[], data: number[] }>({ labels: [], data: [] });

  // Load orders from localStorage
  useEffect(() => {
    const savedOrders = getStorageItem<Order[]>('orders', []);
    setOrders(savedOrders);
  }, []);

  // Calculate today's orders
  useEffect(() => {
    const today = new Date();
    const todaysOrders = orders.filter(order => 
      isWithinInterval(new Date(order.date), {
        start: startOfToday(),
        end: endOfToday()
      })
    );
    setTodayOrders(todaysOrders);
  }, [orders]);

  // Calculate weekly data for bar chart
  useEffect(() => {
    const dates = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), i);
      return format(date, 'MMM dd');
    }).reverse();

    const amounts = dates.map(date => {
      return orders.filter(order => 
        format(new Date(order.date), 'MMM dd') === date
      ).reduce((sum, order) => sum + order.total, 0);
    });

    setWeeklyData({ dates, amounts });
  }, [orders]);

  // Calculate service data for pie chart
  useEffect(() => {
    const serviceAmounts = services.map(service => {
      return todayOrders.reduce((sum, order) => {
        const serviceItems = order.items.filter(item => item.serviceId === service.id);
        return sum + serviceItems.reduce((itemSum, item) => itemSum + item.subtotal, 0);
      }, 0);
    });

    setServiceData({
      labels: services.map(s => s.name),
      data: serviceAmounts
    });
  }, [todayOrders]);

  // Calculate statistics
  const totalCustomers = new Set(orders.map(order => order.customer)).size;
  const todayOrderCount = todayOrders.length;
  const todayCardTotal = todayOrders
    .filter(order => order.paymentMethod === 'card')
    .reduce((sum, order) => sum + order.total, 0);
  const todayCashTotal = todayOrders
    .filter(order => order.paymentMethod === 'cash')
    .reduce((sum, order) => sum + order.total, 0);

  // Chart configurations
  const barChartData = {
    labels: weeklyData.dates,
    datasets: [
      {
        label: 'Daily Revenue',
        data: weeklyData.amounts,
        backgroundColor: 'rgba(99, 102, 241, 0.5)',
        borderColor: 'rgb(99, 102, 241)',
        borderWidth: 1
      }
    ]
  };

  const pieChartData = {
    labels: serviceData.labels,
    datasets: [
      {
        data: serviceData.data,
        backgroundColor: [
          'rgba(255, 99, 132, 0.5)',
          'rgba(54, 162, 235, 0.5)',
          'rgba(255, 206, 86, 0.5)',
          'rgba(75, 192, 192, 0.5)',
          'rgba(153, 102, 255, 0.5)'
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)'
        ],
        borderWidth: 1
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom' as const
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `${context.label}: ${formatPrice(context.raw)}`;
          }
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
      
      {/* Stats Overview */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Customers
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {totalCustomers}
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
                <ShoppingBag className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Today's Orders
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {todayOrderCount}
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
                    Card Payments (Today)
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {formatPrice(todayCardTotal)}
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
                    Cash Payments (Today)
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {formatPrice(todayCashTotal)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Revenue Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Weekly Revenue</h3>
          <div className="h-80">
            <Bar data={barChartData} options={chartOptions} />
          </div>
        </div>

        {/* Today's Service Distribution */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Today's Service Distribution</h3>
          <div className="h-80">
            <Pie data={pieChartData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Today's Orders</h3>
        </div>
        <div className="overflow-x-auto">
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
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment Method
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {todayOrders.map((order) => (
                <tr key={order.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {order.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.customer}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(order.date), 'HH:mm')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.paymentMethod === 'pay_later' ? 'Pay Later' : 
                      order.paymentMethod.charAt(0).toUpperCase() + order.paymentMethod.slice(1)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                    {formatPrice(order.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}