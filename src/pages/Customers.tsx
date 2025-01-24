import React, { useState, useEffect, useMemo } from 'react';
import { X, Upload } from 'lucide-react';
import { getStorageItem, setStorageItem } from '../utils/storage';
import { clsx } from 'clsx';
import { formatPrice } from '../utils/formatPrice';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  orders: number;
}

interface Order {
  id: string;
  customer: string;
  date: string;
  total: number;
  status: string;
}

export function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [importError, setImportError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });

  useEffect(() => {
    const savedCustomers = getStorageItem<Customer[]>('customers', []);
    const savedOrders = getStorageItem<Order[]>('orders', []);
    setCustomers(savedCustomers);
    setOrders(savedOrders);
  }, []);

  // Calculate customer stats
  const customerStats = useMemo(() => {
    const stats = customers.map(customer => {
      const customerOrders = orders.filter(order => order.customer === customer.id && order.status !== 'voided');
      const totalSpent = customerOrders.reduce((sum, order) => sum + order.total, 0);
      const orderCount = customerOrders.length;
      
      // Group orders by date (last 3 months, last 6 months, last year, all time)
      const now = new Date();
      const threeMonthsAgo = new Date(now.setMonth(now.getMonth() - 3));
      const sixMonthsAgo = new Date(now.setMonth(now.getMonth() - 6));
      const oneYearAgo = new Date(now.setFullYear(now.getFullYear() - 1));

      const ordersByPeriod = {
        threeMonths: customerOrders.filter(order => new Date(order.date) >= threeMonthsAgo).length,
        sixMonths: customerOrders.filter(order => new Date(order.date) >= sixMonthsAgo).length,
        oneYear: customerOrders.filter(order => new Date(order.date) >= oneYearAgo).length,
        allTime: orderCount
      };

      return {
        ...customer,
        totalSpent,
        orderCount,
        ordersByPeriod
      };
    });

    return stats;
  }, [customers, orders]);

  const getCustomerCategory = (totalSpent: number) => {
    if (totalSpent >= 5000) return 'VIP';
    if (totalSpent >= 2000) return 'Regular';
    return 'New';
  };

  const resetForm = () => {
    setFormData({ name: '', email: '', phone: '', address: '' });
    setEditingCustomer(null);
  };

  const openModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address
      });
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingCustomer) {
      // Edit existing customer
      const updatedCustomers = customers.map(c => 
        c.id === editingCustomer.id 
          ? { ...c, ...formData }
          : c
      );
      setCustomers(updatedCustomers);
      setStorageItem('customers', updatedCustomers);
    } else {
      // Add new customer
      const newCustomer = {
        id: Math.random().toString(36).substr(2, 9),
        ...formData,
        orders: 0
      };
      const updatedCustomers = [...customers, newCustomer];
      setCustomers(updatedCustomers);
      setStorageItem('customers', updatedCustomers);
    }
    closeModal();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      const updatedCustomers = customers.filter(c => c.id !== id);
      setCustomers(updatedCustomers);
      setStorageItem('customers', updatedCustomers);
    }
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const rows = text.split('\n');
      const headers = rows[0].split(',').map(h => h.trim().toLowerCase());
      
      const requiredFields = ['name'];
      const missingFields = requiredFields.filter(field => !headers.includes(field));
      
      if (missingFields.length > 0) {
        setImportError(`Missing required fields: ${missingFields.join(', ')}`);
        return;
      }

      const newCustomers = rows.slice(1)
        .filter(row => row.trim())
        .map(row => {
          const values = row.split(',').map(v => v.trim());
          const customer: any = {
            id: Math.random().toString(36).substr(2, 9),
            orders: 0
          };

          headers.forEach((header, index) => {
            customer[header] = values[index] || '';
          });

          return customer as Customer;
        });

      setCustomers(prev => {
        const updated = [...prev, ...newCustomers];
        setStorageItem('customers', updated);
        return updated;
      });

      setImportError('');
      e.target.value = '';
    } catch (error) {
      setImportError('Error processing file. Please check the format.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Customers</h1>
        <div className="flex space-x-4">
          <div className="relative">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileImport}
              className="sr-only"
              id="file-import"
            />
            <label
              htmlFor="file-import"
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
            >
              <Upload className="h-4 w-4 mr-2" />
              Import Customers
            </label>
          </div>
          <button
            onClick={() => openModal()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Add Customer
          </button>
        </div>
      </div>

      {importError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
          {importError}
        </div>
      )}

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Orders
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Spent
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {customerStats.map((customer) => (
              <tr key={customer.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                  <div className="text-sm text-gray-500">{customer.address}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{customer.phone}</div>
                  <div className="text-sm text-gray-500">{customer.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    Total: {customer.orderCount}
                  </div>
                  <div className="text-xs text-gray-500">
                    Last 3M: {customer.ordersByPeriod.threeMonths} |
                    Last 6M: {customer.ordersByPeriod.sixMonths} |
                    Last 1Y: {customer.ordersByPeriod.oneYear}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatPrice(customer.totalSpent)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={clsx(
                    "px-2 inline-flex text-xs leading-5 font-semibold rounded-full",
                    getCustomerCategory(customer.totalSpent) === 'VIP' ? 'bg-purple-100 text-purple-800' :
                    getCustomerCategory(customer.totalSpent) === 'Regular' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  )}>
                    {getCustomerCategory(customer.totalSpent)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => openModal(customer)}
                    className="text-indigo-600 hover:text-indigo-900 mr-4"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(customer.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                {editingCustomer ? 'Edit Customer' : 'Add Customer'}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="text"
                  id="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Phone
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                  Address
                </label>
                <textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium"
                >
                  {editingCustomer ? 'Save Changes' : 'Add Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}