import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { getStorageItem, setStorageItem } from '../utils/storage';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  orders: number;
}

export function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });

  // Load customers from localStorage on component mount
  useEffect(() => {
    const savedCustomers = getStorageItem<Customer[]>('customers', []);
    setCustomers(savedCustomers);
  }, []);

  const resetForm = () => {
    setFormData({ name: '', email: '', phone: '' });
    setEditingCustomer(null);
  };

  const openModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        name: customer.name,
        email: customer.email,
        phone: customer.phone
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Customers</h1>
        <button
          onClick={() => openModal()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          Add Customer
        </button>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Phone
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Orders
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {customers.map((customer) => (
              <tr key={customer.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{customer.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{customer.phone}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{customer.orders}</div>
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
                  required
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  required
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
                  required
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