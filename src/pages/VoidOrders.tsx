import type { FC } from 'react';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Search, Ban, Printer } from 'lucide-react';
import { getStorageItem } from '../utils/storage';
import { generateVoidReceipt } from '../utils/receipt';

interface Order {
  id: string;
  customer: string;
  status: string;
  total: number;
  tax: number;
  date: Date;
  paymentStatus: string;
  paymentMethod: 'cash' | 'card' | 'pay_later';
  collectionDate: string;
  notes: string;
  items: OrderItem[];
  salesperson: string;
  voidReason?: string;
  voidedAt?: Date;
}

interface OrderItem {
  serviceId: string;
  quantity: number;
  price: number;
  subtotal: number;
  colors?: string[];
  brandId?: string;
}

interface Service {
  id: string;
  name: string;
  price: number;
  description: string;
}

const formatPrice = (amount: number) => `R${amount.toFixed(2)}`;

export const VoidOrders: FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const savedOrders = getStorageItem<Order[]>('orders', []);
    const savedServices = getStorageItem<Service[]>('services', []);
    const voidedOrders = savedOrders.filter(order => order.status === 'voided');
    setOrders(voidedOrders);
    setServices(savedServices);
  }, []);

  const filteredOrders = orders.filter(order => 
    order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.voidReason?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Void Orders</h1>
        <div className="relative w-64">
          <input
            type="text"
            placeholder="Search void orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          />
          <Search className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
        </div>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
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
                Void Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Void Reason
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredOrders.map((order) => (
              <tr key={order.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {order.id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {order.customer}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {order.voidedAt ? format(new Date(order.voidedAt), 'MMM d, yyyy HH:mm') : '-'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {order.voidReason || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                  {formatPrice(order.total)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => {
                      const doc = generateVoidReceipt(order, services);
                      doc.save(`void-order-${order.id}.pdf`);
                    }}
                    className="text-gray-600 hover:text-gray-900"
                    title="Print Void Receipt"
                  >
                    <Printer className="h-5 w-5 inline-block" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <Ban className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No void orders found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Voided orders will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}