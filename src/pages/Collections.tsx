import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Package, Search } from 'lucide-react';
import { getStorageItem, setStorageItem } from '../utils/storage';
import clsx from 'clsx';

interface Service {
  id: string;
  name: string;
  price: number;
  description: string;
}

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
  date: Date;
  items: OrderItem[];
  collectionDate: string;
  salesperson: string;
  paymentMethod: string;
}

const services: Service[] = [
  { id: '1', name: 'Wash & Fold', price: 89.99, description: 'Per kg' },
  { id: '2', name: 'Dry Cleaning', price: 199.99, description: 'Per piece' },
  { id: '3', name: 'Express Service', price: 249.99, description: 'Additional fee' },
  { id: '4', name: 'Ironing', price: 59.99, description: 'Per piece' },
  { id: '5', name: 'Stain Removal', price: 149.99, description: 'Per stain' }
];

const formatPrice = (amount: number) => `R${amount.toFixed(2)}`;

export function Collections() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const savedOrders = getStorageItem<Order[]>('orders', []);
    const updatedOrders = savedOrders.map(order => ({
      ...order,
      salesperson: order.salesperson || 'Unknown'
    }));
    const readyOrders = updatedOrders.filter(order => 
      order.status === 'ready' || order.status === 'processing'
    );
    if (JSON.stringify(savedOrders) !== JSON.stringify(updatedOrders)) {
      setStorageItem('orders', updatedOrders);
    }
    setOrders(readyOrders);
  }, []);

  const filteredOrders = orders.filter(order => 
    order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getServiceById = (id: string) => services.find(s => s.id === id);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Collections</h1>
        <div className="relative w-64">
          <input
            type="text"
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          />
          <Search className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredOrders.map((order) => (
          <div key={order.id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900">{order.customer}</h3>
                <p className="text-sm text-gray-500">Order #{order.id}</p>
                <p className="text-sm text-gray-500">By: {order.salesperson}</p>
                <p className="text-sm">
                  <span className={clsx(
                    'px-2 py-1 text-xs font-medium rounded-full',
                    order.paymentMethod === 'cash' ? 'bg-green-100 text-green-800' :
                    order.paymentMethod === 'card' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  )}>
                    {order.paymentMethod === 'pay_later' ? 'Pay Later' :
                     order.paymentMethod.charAt(0).toUpperCase() + order.paymentMethod.slice(1)}
                  </span>
                </p>
              </div>
              <Package className="h-8 w-8 text-indigo-600" />
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Items</h4>
                <div className="mt-2 space-y-2">
                  {order.items.map((item) => {
                    const service = getServiceById(item.serviceId);
                    return service && (
                      <div key={item.serviceId} className="flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{service.name}</p>
                          <div className="text-sm text-gray-500">
                            Quantity: {item.quantity} × {formatPrice(item.price)}
                          </div>
                        </div>
                        <div className="text-sm font-medium text-gray-900">
                          {formatPrice(item.subtotal)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-900">Total</span>
                  <span className="text-lg font-semibold text-indigo-600">{formatPrice(order.total)}</span>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Collection Details</h4>
                <p className="text-sm text-gray-500">
                  Date: {format(new Date(order.collectionDate), 'MMM d, yyyy HH:mm')}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Status: <span className="font-medium capitalize">{order.status}</span>
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredOrders.length === 0 && (
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No orders ready for collection</h3>
          <p className="mt-1 text-sm text-gray-500">
            Orders that are ready for collection will appear here.
          </p>
        </div>
      )}
    </div>
  );
}