import { useState, useEffect } from 'react';
import { getStorageItem } from '../utils/storage';
import { formatPrice } from '../utils/format';
import { format } from 'date-fns';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

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
  notes?: string;
  items: Array<{
    serviceId: string;
    quantity: number;
    price: number;
    subtotal: number;
    colors?: string[];
    brandId?: string;
  }>;
}

interface Service {
  id: string;
  name: string;
  price: number;
  description: string;
  categoryId: string;
}

interface Brand {
  id: string;
  name: string;
  description?: string;
}

export function Collection() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    const savedOrders = getStorageItem<Order[]>('orders', []);
    const savedServices = getStorageItem<Service[]>('services', []);
    const savedBrands = getStorageItem<Brand[]>('brands', []);
    setOrders(savedOrders);
    setServices(savedServices);
    setBrands(savedBrands);
  }, []);

  // Filter orders based on search term and status
  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getServiceName = (serviceId: string) => {
    return services.find(s => s.id === serviceId)?.name || 'Unknown Service';
  };

  const getBrandName = (brandId: string | undefined) => {
    if (!brandId) return null;
    return brands.find(b => b.id === brandId)?.name || 'Unknown Brand';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Collection</h1>
        
        <div className="mt-4 sm:mt-0 sm:flex sm:space-x-4">
          {/* Search Input */}
          <div className="relative rounded-md shadow-sm">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search orders..."
              className="block w-full rounded-md border-gray-300 pr-10 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="mt-2 sm:mt-0 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Orders List */}
      <div className="overflow-hidden bg-white shadow sm:rounded-md">
        <ul role="list" className="divide-y divide-gray-200">
          {filteredOrders.map((order) => (
            <li key={order.id}>
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <p className="truncate text-sm font-medium text-indigo-600">Order #{order.id}</p>
                    <div className="ml-2">{getStatusIcon(order.status)}</div>
                  </div>
                  <div className="ml-2 flex flex-shrink-0">
                    <p className={clsx(
                      'inline-flex rounded-full px-2 text-xs font-semibold leading-5',
                      {
                        'bg-green-100 text-green-800': order.status === 'completed',
                        'bg-yellow-100 text-yellow-800': order.status === 'pending',
                        'bg-blue-100 text-blue-800': order.status === 'processing',
                        'bg-red-100 text-red-800': order.status === 'cancelled',
                      }
                    )}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </p>
                  </div>
                </div>
                
                <div className="mt-2 sm:flex sm:justify-between">
                  <div className="sm:flex">
                    <p className="flex items-center text-sm text-gray-500">
                      Customer: {order.customer}
                    </p>
                    <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                      Collection Date: {format(new Date(order.collectionDate), 'PPP')}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                    <p>Total: {formatPrice(order.total)}</p>
                  </div>
                </div>

                {/* Order Items */}
                <div className="mt-4 border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Order Items:</h4>
                  <div className="space-y-2">
                    {order.items.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <div>
                          <span className="font-medium">{getServiceName(item.serviceId)}</span>
                          {item.brandId && (
                            <span className="text-gray-500 ml-2">({getBrandName(item.brandId)})</span>
                          )}
                          {item.colors && item.colors.length > 0 && (
                            <span className="text-gray-500 ml-2">
                              Colors: {item.colors.join(', ')}
                            </span>
                          )}
                        </div>
                        <div className="text-gray-500">
                          {item.quantity}x {formatPrice(item.price)} = {formatPrice(item.subtotal)}
                        </div>
                      </div>
                    ))}
                  </div>
                  {order.notes && (
                    <div className="mt-2 text-sm text-gray-500">
                      <span className="font-medium">Notes:</span> {order.notes}
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
