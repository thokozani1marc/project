import React, { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { X, Plus, Minus, Search, Ban, Printer, Palette, Tag } from 'lucide-react';
import { clsx } from 'clsx';
import { getStorageItem, setStorageItem, getNextOrderNumber } from '../utils/storage';
import { useAuth } from '../contexts/AuthContext';
import { generateReceipt } from '../utils/receipt';
import { formatPrice } from '../utils/formatPrice';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  orders: number;
}

interface Brand {
  id: string;
  name: string;
  description?: string;
}

interface Category {
  id: string;
  name: string;
  description?: string;
}

interface Service {
  id: string;
  name: string;
  price: number;
  description: string;
  categoryId: string;
  brands?: string[];
}

interface OrderItem {
  serviceId: string;
  quantity: number;
  price: number;
  subtotal: number;
  colors?: string[];
  brandId?: string;
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
  collectionDate: string;
  notes: string;
  items: OrderItem[];
  salesperson: string;
  voidReason?: string;
  voidedAt?: Date;
}

const ORDER_STATUSES = ['pending', 'processing', 'ready', 'completed', 'voided'];

const COLORS = [
  'White', 'Black', 'Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Pink',
  'Orange', 'Brown', 'Grey', 'Navy', 'Beige', 'Maroon', 'Teal'
];

export function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [ordersPerPage] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'pay_later'>('cash');
  const [collectionDate, setCollectionDate] = useState('');
  const [notes, setNotes] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [statusUpdateMessage, setStatusUpdateMessage] = useState('');
  const [selectedColors, setSelectedColors] = useState<{ [key: string]: string[] }>({});
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null);
  const [selectedBrands, setSelectedBrands] = useState<{ [key: string]: string }>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    const savedOrders = getStorageItem<Order[]>('orders', []);
    const savedServices = getStorageItem<Service[]>('services', []);
    const savedCategories = getStorageItem<Category[]>('categories', []);
    const savedCustomers = getStorageItem<Customer[]>('customers', []);
    const savedBrands = getStorageItem<Brand[]>('brands', []);
    
    setOrders(savedOrders);
    setServices(savedServices);
    setCategories(savedCategories);
    setCustomers(savedCustomers);
    setBrands(savedBrands);
  }, []);

  useEffect(() => {
    const filtered = customers.filter(customer => 
      customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      customer.phone.toLowerCase().includes(customerSearch.toLowerCase()) ||
      customer.email.toLowerCase().includes(customerSearch.toLowerCase())
    );
    setFilteredCustomers(filtered);
  }, [customerSearch, customers]);

  // Get current orders
  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = orders.slice(indexOfFirstOrder, indexOfLastOrder);
  const totalPages = Math.ceil(orders.length / ordersPerPage);

  // Change page
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const resetForm = () => {
    setOrderItems([]);
    setSelectedCustomer('');
    setSelectedOrder(null);
    setPaymentMethod('cash');
    setCollectionDate('');
    setNotes('');
    setCustomerSearch('');
    setSelectedColors({});
    setSelectedBrands({});
  };

  const openModal = (order?: Order) => {
    // Prevent editing completed paid orders
    if (order && order.status === 'completed' && (order.paymentMethod === 'card' || order.paymentMethod === 'cash')) {
      return;
    }

    if (order) {
      setSelectedOrder(order);
      setOrderItems(order.items);
      setSelectedCustomer(order.customer);
      setPaymentMethod(order.paymentMethod);
      setCollectionDate(order.collectionDate);
      setNotes(order.notes);
      const colors: { [key: string]: string[] } = {};
      const brandSelections: { [key: string]: string } = {};
      order.items.forEach(item => {
        if (item.colors) {
          colors[item.serviceId] = item.colors;
        }
        if (item.brandId) {
          brandSelections[item.serviceId] = item.brandId;
        }
      });
      setSelectedColors(colors);
      setSelectedBrands(brandSelections);
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleColorToggle = (serviceId: string, color: string) => {
    setSelectedColors(prev => {
      const currentColors = prev[serviceId] || [];
      const newColors = currentColors.includes(color)
        ? currentColors.filter(c => c !== color)
        : [...currentColors, color];
      
      return {
        ...prev,
        [serviceId]: newColors
      };
    });
  };

  const handleBrandSelect = (serviceId: string, brandId: string) => {
    setSelectedBrands(prev => ({
      ...prev,
      [serviceId]: brandId
    }));
  };

  const addService = (service: Service) => {
    const existingItem = orderItems.find(item => item.serviceId === service.id);
    if (existingItem) {
      setOrderItems(orderItems.map(item =>
        item.serviceId === service.id
          ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.price }
          : item
      ));
    } else {
      setOrderItems([...orderItems, {
        serviceId: service.id,
        quantity: 1,
        price: service.price,
        subtotal: service.price
      }]);
    }
  };

  const updateQuantity = (serviceId: string, change: number) => {
    setOrderItems(orderItems.map(item => {
      if (item.serviceId === serviceId) {
        const newQuantity = Math.max(0, Number((item.quantity + change).toFixed(2)));
        return {
          ...item,
          quantity: newQuantity,
          subtotal: Number((newQuantity * item.price).toFixed(2))
        };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const handleQuantityChange = (serviceId: string, value: string) => {
    setOrderItems(orderItems.map(item => {
      if (item.serviceId === serviceId) {
        const newQuantity = Math.max(0, Number(value) || 0);
        return {
          ...item,
          quantity: newQuantity,
          subtotal: Number((newQuantity * item.price).toFixed(2))
        };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const calculateSubtotal = () => {
    return orderItems.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const calculateTax = (subtotal: number) => {
    return subtotal * 0.15; // 15% tax
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const tax = calculateTax(subtotal);
    return subtotal + tax;
  };

  const getServiceById = (id: string) => services.find(s => s.id === id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || orderItems.length === 0 || !collectionDate) return;

    const subtotal = calculateSubtotal();
    const tax = calculateTax(subtotal);
    const total = subtotal + tax;

    const newOrder: Order = {
      id: selectedOrder?.id || getNextOrderNumber().toString(),
      customer: selectedCustomer,
      status: 'pending',
      total,
      tax,
      date: new Date(),
      paymentStatus: paymentMethod === 'pay_later' ? 'pending' : 'paid',
      paymentMethod,
      collectionDate,
      notes,
      items: orderItems.map(item => ({
        ...item,
        colors: selectedColors[item.serviceId],
        brandId: selectedBrands[item.serviceId]
      })),
      salesperson: user?.name ?? 'Unknown'
    };

    if (selectedOrder) {
      setOrders(orders.map(o => o.id === selectedOrder.id ? newOrder : o));
      setStorageItem('orders', orders.map(o => o.id === selectedOrder.id ? newOrder : o));
    } else {
      setOrders([newOrder, ...orders]);
      setStorageItem('orders', [newOrder, ...orders]);
    }

    setIsModalOpen(false);
    resetForm();
  };

  const handleStatusChange = (orderId: string, newStatus: string) => {
    const updatedOrders = orders.map(order => {
      if (order.id === orderId) {
        return {
          ...order,
          status: newStatus,
          salesperson: user?.name ?? order.salesperson ?? 'Unknown'
        };
      }
      return order;
    });
    setStorageItem('orders', updatedOrders);
    setOrders(updatedOrders);
  };

  const handlePaymentMethodUpdate = (orderId: string, newPaymentMethod: 'cash' | 'card' | 'pay_later') => {
    const updatedOrders = orders.map(order => {
      if (order.id === orderId) {
        return {
          ...order,
          paymentMethod: newPaymentMethod,
          paymentStatus: newPaymentMethod === 'pay_later' ? 'pending' : 'paid'
        };
      }
      return order;
    });
    setOrders(updatedOrders);
    setStorageItem('orders', updatedOrders);
    setStatusUpdateMessage('Payment method updated successfully');
  };

  const handlePrint = (order: Order) => {
    const doc = generateReceipt(order, services);
    doc.save(`order-${order.id}.pdf`);
  };

  const getCurrentDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  // Filter services by category
  const filteredServices = useMemo(() => {
    if (selectedCategory === 'all') return services;
    return services.filter(service => service.categoryId === selectedCategory);
  }, [services, selectedCategory]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Orders</h1>
        <button
          onClick={() => openModal()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          New Order
        </button>
      </div>

      {statusUpdateMessage && (
        <div className={clsx(
          'fixed top-4 right-4 p-4 rounded-md shadow-lg',
          statusUpdateMessage.includes('Cannot complete') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
        )}>
          {statusUpdateMessage}
          <button
            onClick={() => setStatusUpdateMessage('')}
            className="ml-4 text-sm font-medium hover:text-gray-600"
          >
            Dismiss
          </button>
        </div>
      )}

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
                Salesperson
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Payment Method
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Collection Date
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentOrders.filter(order => order.status !== 'voided').map((order) => (
              <tr key={order.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {order.id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {order.customer}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {order.salesperson || 'Unknown'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <select
                    value={order.status}
                    onChange={(e) => handleStatusChange(order.id, e.target.value)}
                    disabled={order.status === 'completed' && (order.paymentMethod === 'card' || order.paymentMethod === 'cash')}
                    className={clsx(
                      'text-sm font-medium rounded-full px-3 py-1 border-2',
                      order.status === 'pending' ? 'bg-yellow-50 text-yellow-800' :
                      order.status === 'processing' ? 'bg-blue-50 text-blue-800' :
                      order.status === 'ready' ? 'bg-green-50 text-green-800' :
                      order.status === 'completed' ? 'bg-gray-50 text-gray-800' :
                      'bg-red-50 text-red-800',
                      (order.status === 'completed' && (order.paymentMethod === 'card' || order.paymentMethod === 'cash')) && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    {ORDER_STATUSES.map(status => (
                      <option key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatPrice(order.total)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <select
                    value={order.paymentMethod}
                    onChange={(e) => handlePaymentMethodUpdate(order.id, e.target.value as 'cash' | 'card' | 'pay_later')}
                    disabled={order.status === 'completed' && (order.paymentMethod === 'card' || order.paymentMethod === 'cash')}
                    className={clsx(
                      'px-2 py-1 text-xs font-medium rounded-full border-0',
                      order.paymentMethod === 'cash' ? 'bg-green-100 text-green-800' :
                      order.paymentMethod === 'card' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800',
                      (order.status === 'completed' && (order.paymentMethod === 'card' || order.paymentMethod === 'cash')) && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="pay_later">Pay Later</option>
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {format(new Date(order.collectionDate), 'MMM d, yyyy HH:mm')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handlePrint(order)}
                    className="text-gray-600 hover:text-gray-900 mr-4"
                    title="Print Receipt"
                  >
                    <Printer className="h-5 w-5 inline-block" />
                  </button>
                  <button
                    onClick={() => openModal(order)}
                    disabled={order.status === 'completed' && (order.paymentMethod === 'card' || order.paymentMethod === 'cash')}
                    className={clsx(
                      "text-indigo-600 hover:text-indigo-900 mr-4",
                      (order.status === 'completed' && (order.paymentMethod === 'card' || order.paymentMethod === 'cash')) && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    Edit
                  </button>
                  {user.role === 'admin' && (
                    <button
                      onClick={() => {
                        const reason = window.prompt('Please enter a reason for voiding this order:');
                        if (reason) {
                          const updatedOrders = orders.map(o => 
                            o.id === order.id 
                              ? { ...o, status: 'voided', voidReason: reason, voidedAt: new Date() }
                              : o
                          );
                          setOrders(updatedOrders);
                          setStorageItem('orders', updatedOrders);
                        }
                      }}
                      className="text-red-600 hover:text-red-900"
                      title="Void Order"
                    >
                      <Ban className="h-5 w-5 inline-block" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-8 flex flex-col">
        <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
            <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
            </div>
          </div>
        </div>
        
        <div className="mt-4 flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
              className={clsx(
                "relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700",
                currentPage === 1 ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"
              )}
            >
              Previous
            </button>
            <button
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={clsx(
                "relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700",
                currentPage === totalPages ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"
              )}
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{indexOfFirstOrder + 1}</span> to{' '}
                <span className="font-medium">{Math.min(indexOfLastOrder, orders.length)}</span> of{' '}
                <span className="font-medium">{orders.length}</span> orders
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={clsx(
                    "relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300",
                    currentPage === 1 ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"
                  )}
                >
                  <span className="sr-only">Previous</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                  </svg>
                </button>
                {[...Array(totalPages)].map((_, index) => (
                  <button
                    key={index + 1}
                    onClick={() => paginate(index + 1)}
                    className={clsx(
                      "relative inline-flex items-center px-4 py-2 text-sm font-semibold",
                      currentPage === index + 1
                        ? "z-10 bg-indigo-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                        : "text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0"
                    )}
                  >
                    {index + 1}
                  </button>
                ))}
                <button
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={clsx(
                    "relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300",
                    currentPage === totalPages ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"
                  )}
                >
                  <span className="sr-only">Next</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                {selectedOrder ? 'Edit Order' : 'New Order'}
              </h2>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Customer Search */}
              <div>
                <label htmlFor="customerSearch" className="block text-sm font-medium text-gray-700">
                  Search Customer
                </label>
                <div className="mt-1 relative">
                  <input
                    type="text"
                    id="customerSearch"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Search by name, phone, or email"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm pr-10"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>

              {/* Customer Selection */}
              <div>
                <label htmlFor="customer" className="block text-sm font-medium text-gray-700">
                  Customer
                </label>
                <select
                  id="customer"
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  required
                >
                  <option value="">Select a customer</option>
                  {filteredCustomers.map(customer => (
                    <option key={customer.id} value={customer.name}>
                      {customer.name} - {customer.phone}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Payment Method
                </label>
                <div className="mt-2 space-x-4">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      value="cash"
                      checked={paymentMethod === 'cash'}
                      onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'card' | 'pay_later')}
                      className="form-radio h-4 w-4 text-indigo-600"
                    />
                    <span className="ml-2">Cash</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      value="card"
                      checked={paymentMethod === 'card'}
                      onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'card' | 'pay_later')}
                      className="form-radio h-4 w-4 text-indigo-600"
                    />
                    <span className="ml-2">Card</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      value="pay_later"
                      checked={paymentMethod === 'pay_later'}
                      onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'card' | 'pay_later')}
                      className="form-radio h-4 w-4 text-indigo-600"
                    />
                    <span className="ml-2">Pay Later</span>
                  </label>
                </div>
              </div>

              {/* Collection Date & Time */}
              <div>
                <label htmlFor="collectionDate" className="block text-sm font-medium text-gray-700">
                  Collection Date & Time
                </label>
                <input
                  type="datetime-local"
                  id="collectionDate"
                  value={collectionDate}
                  onChange={(e) => setCollectionDate(e.target.value)}
                  min={getCurrentDateTime()}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  required
                />
              </div>

              {/* Notes */}
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                  Notes
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="Add any special instructions or notes here..."
                />
              </div>

              {/* Services */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Services</h3>
                  <div className="flex space-x-2">
                    <div className="sm:hidden">
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                      >
                        <option value="all">All Categories</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="hidden sm:block">
                      <nav className="flex space-x-4" aria-label="Categories">
                        <button
                          onClick={() => setSelectedCategory('all')}
                          className={clsx(
                            'rounded-md px-3 py-2 text-sm font-medium',
                            selectedCategory === 'all'
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'text-gray-500 hover:text-gray-700'
                          )}
                        >
                          All Categories
                        </button>
                        {categories.map((category) => (
                          <button
                            key={category.id}
                            onClick={() => setSelectedCategory(category.id)}
                            className={clsx(
                              'rounded-md px-3 py-2 text-sm font-medium',
                              selectedCategory === category.id
                                ? 'bg-indigo-100 text-indigo-700'
                                : 'text-gray-500 hover:text-gray-700'
                            )}
                          >
                            {category.name}
                          </button>
                        ))}
                      </nav>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {filteredServices
                    .map(service => (
                    <div
                      key={service.id}
                      className="border rounded-lg p-4 cursor-pointer hover:border-indigo-500"
                      onClick={() => addService(service)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">{service.name}</h4>
                        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                          {categories.find(category => category.id === service.categoryId)?.name}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">{service.description}</p>
                      <p className="text-sm font-medium text-indigo-600 mt-2">{formatPrice(service.price)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Items */}
              {orderItems.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Order Items</h3>
                  <div className="space-y-4">
                    {orderItems.map(item => {
                      const service = getServiceById(item.serviceId);
                      return service && (
                        <div key={item.serviceId} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{service.name}</p>
                              <p className="text-sm text-gray-500">{formatPrice(item.price)} each</p>
                            </div>
                            <div className="flex items-center space-x-4">
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.serviceId, -0.5)}
                                className="text-gray-500 hover:text-gray-700"
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => handleQuantityChange(item.serviceId, e.target.value)}
                                step="0.1"
                                min="0"
                                className="w-16 text-center border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                              />
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.serviceId, 0.5)}
                                className="text-gray-500 hover:text-gray-700"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                              <span className="text-gray-700 ml-4">
                                {formatPrice(item.subtotal)}
                              </span>
                              <div className="flex space-x-2">
                                <button
                                  type="button"
                                  onClick={() => setShowColorPicker(showColorPicker === item.serviceId ? null : item.serviceId)}
                                  className={clsx(
                                    "p-2 rounded-md",
                                    showColorPicker === item.serviceId ? "bg-gray-100" : "hover:bg-gray-50"
                                  )}
                                >
                                  <Palette className="h-5 w-5 text-gray-500" />
                                </button>
                                {getServiceById(item.serviceId)?.brands && getServiceById(item.serviceId)?.brands.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setShowColorPicker(null)}
                                    className="p-2 rounded-md hover:bg-gray-50"
                                  >
                                    <Tag className="h-5 w-5 text-gray-500" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Color Selection */}
                          {showColorPicker === item.serviceId && (
                            <div className="mt-4 border-t pt-4">
                              <div className="flex flex-wrap gap-2">
                                {COLORS.map(color => (
                                  <button
                                    key={color}
                                    type="button"
                                    onClick={() => handleColorToggle(item.serviceId, color)}
                                    className={clsx(
                                      "px-3 py-1 text-sm rounded-full border",
                                      selectedColors[item.serviceId]?.includes(color)
                                        ? "bg-indigo-100 border-indigo-500 text-indigo-700"
                                        : "border-gray-300 hover:border-gray-400"
                                    )}
                                  >
                                    {color}
                                  </button>
                                ))}
                              </div>
                              {selectedColors[item.serviceId]?.length > 0 && (
                                <div className="mt-2 text-sm text-gray-500">
                                  Selected colors: {selectedColors[item.serviceId].join(', ')}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Brand Selection */}
                          {getServiceById(item.serviceId)?.brands && getServiceById(item.serviceId)?.brands.length > 0 && (
                            <div className="mt-4 border-t pt-4">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Brand (Optional)
                              </label>
                              <select
                                value={selectedBrands[item.serviceId] || ''}
                                onChange={(e) => handleBrandSelect(item.serviceId, e.target.value)}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                              >
                                <option value="">Select a brand</option>
                                {getServiceById(item.serviceId)?.brands.map(brandId => {
                                  const brand = brands.find(b => b.id === brandId);
                                  return brand && (
                                    <option key={brand.id} value={brand.id}>
                                      {brand.name}
                                    </option>
                                  );
                                })}
                              </select>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    <div className="border-t pt-4 space-y-2">
                      <div className="flex justify-end">
                        <p className="text-sm text-gray-600">
                          Subtotal: {formatPrice(calculateSubtotal())}
                        </p>
                      </div>
                      <div className="flex justify-end">
                        <p className="text-sm text-gray-600">
                          Tax (15%): {formatPrice(calculateTax(calculateSubtotal()))}
                        </p>
                      </div>
                      <div className="flex justify-end">
                        <p className="text-lg font-medium">
                          Total: {formatPrice(calculateTotal())}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium"
                >
                  {selectedOrder ? 'Update Order' : 'Create Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}