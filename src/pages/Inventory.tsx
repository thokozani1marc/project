import { useState, useEffect } from 'react';
import { keyInventoryService } from '../services/KeyInventoryService';
import { formatPrice } from '../utils/formatPrice';
import { KeyInventoryItem, SalesHistory } from '../models/KeyInventory';
import { InventorySale, InventorySaleItem } from '../models/InventorySale';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { X, Plus, Minus } from 'lucide-react';
import { getStorageItem, setStorageItem } from '../utils/storage';
import { useAuth } from '../contexts/AuthContext';
import { clsx } from 'clsx';

const STORAGE_KEYS = {
  INVENTORY_SALES: 'inventorySales'
} as const;

export function Inventory() {
  const { user } = useAuth();
  const [keys, setKeys] = useState<KeyInventoryItem[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [salesHistory, setSalesHistory] = useState<SalesHistory | null>(null);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [saleItems, setSaleItems] = useState<InventorySaleItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'pay_later'>('cash');
  const [statusMessage, setStatusMessage] = useState('');

  // Load existing sales
  const [sales, setSales] = useState<InventorySale[]>([]);

  useEffect(() => {
    const allKeys = keyInventoryService.getAllKeys();
    setKeys(allKeys || []);
    const savedSales = getStorageItem<InventorySale[]>(STORAGE_KEYS.INVENTORY_SALES, []);
    setSales(savedSales);
  }, []);

  useEffect(() => {
    if (selectedKey) {
      const history = keyInventoryService.getSalesHistory(selectedKey);
      setSalesHistory(history || null);
    }
  }, [selectedKey]);

  const addSaleItem = (key: KeyInventoryItem) => {
    const existingItem = saleItems.find(item => item.keyId === key.id);
    const itemPrice = key.sellingPrice || 0;
    
    if (existingItem) {
      if (existingItem.quantity >= key.currentStock) {
        setStatusMessage('Cannot exceed available stock');
        return;
      }
      setSaleItems(items => items.map(item =>
        item.keyId === key.id
          ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * itemPrice }
          : item
      ));
    } else {
      if (key.currentStock <= 0) {
        setStatusMessage('Item is out of stock');
        return;
      }
      setSaleItems(items => [...items, {
        keyId: key.id,
        quantity: 1,
        price: itemPrice,
        subtotal: itemPrice
      }]);
    }
  };

  const updateQuantity = (keyId: string, change: number) => {
    setSaleItems(items => items.map(item => {
      if (item.keyId === keyId) {
        const key = keys.find(k => k.id === keyId);
        if (!key) return item;
        
        const newQuantity = item.quantity + change;
        if (newQuantity <= 0) return item;
        if (newQuantity > key.currentStock) {
          setStatusMessage('Cannot exceed available stock');
          return item;
        }
        
        const itemPrice = key.sellingPrice || 0;
        return {
          ...item,
          quantity: newQuantity,
          subtotal: newQuantity * itemPrice
        };
      }
      return item;
    }));
  };

  const removeSaleItem = (keyId: string) => {
    setSaleItems(items => items.filter(item => item.keyId !== keyId));
  };

  const calculateTotal = () => {
    const subtotal = saleItems.reduce((sum, item) => sum + item.subtotal, 0);
    const tax = subtotal * 0.15; // 15% tax
    return { subtotal, tax, total: subtotal + tax };
  };

  const handleSaleComplete = () => {
    const { total, tax } = calculateTotal();
    const sale: InventorySale = {
      id: crypto.randomUUID(),
      customer: 'Walk-in', // Default customer name
      status: 'completed',
      total,
      tax,
      date: new Date(),
      paymentStatus: paymentMethod === 'pay_later' ? 'pending' : 'paid',
      paymentMethod,
      items: saleItems,
      salesperson: user?.name || 'Unknown'
    };

    // Update inventory
    saleItems.forEach(item => {
      keyInventoryService.updateStock(item.keyId, -item.quantity);
      keyInventoryService.recordSale(item.keyId, item.quantity, item.price);
    });

    // Save sale
    const updatedSales = [...sales, sale];
    setSales(updatedSales);
    setStorageItem(STORAGE_KEYS.INVENTORY_SALES, updatedSales);

    // Reset form
    setSaleItems([]);
    setPaymentMethod('cash');
    setShowSaleModal(false);
    setStatusMessage('Sale completed successfully');

    // Refresh keys
    setKeys(keyInventoryService.getAllKeys() || []);
  };

  const prepareSalesData = () => {
    if (!salesHistory) return [];

    const last7Days = Object.entries(salesHistory.salesByPeriod.daily)
      .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
      .slice(0, 7)
      .map(([date, quantity]) => ({
        date: new Date(date).toLocaleDateString(),
        quantity
      }))
      .reverse();

    return last7Days;
  };

  return (
    <div className="container mx-auto p-4">
      <div className="mb-8 flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Key Inventory</h1>
        <button
          onClick={() => setShowSaleModal(true)}
          className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
        >
          New Sale
        </button>
      </div>

      {statusMessage && (
        <div className="mb-4 p-4 rounded-md bg-blue-50 text-blue-700">
          {statusMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Keys List */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {keys.map(key => (
                <li
                  key={key.id}
                  className="px-4 py-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedKey(key.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{key.name}</h3>
                      <p className="text-sm text-gray-500">
                        Type: {key.specifications?.type || 'N/A'} | Material: {key.specifications?.material || 'N/A'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-semibold ${
                        key.currentStock <= (key.reorderPoint || 0) ? 'text-red-600' : 'text-green-600'
                      }`}>
                        Stock: {key.currentStock || 0}
                      </p>
                      <p className="text-sm text-gray-500">
                        Reorder at: {key.reorderPoint || 0}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Sales History */}
        <div className="lg:col-span-1">
          {selectedKey && salesHistory ? (
            <div className="bg-white shadow sm:rounded-lg p-4">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Sales History</h2>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Total Quantity Sold</p>
                  <p className="text-2xl font-semibold">{salesHistory.totalQuantitySold}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Total Revenue</p>
                  <p className="text-2xl font-semibold">{formatPrice(salesHistory.totalRevenue)}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Average Price</p>
                  <p className="text-2xl font-semibold">{formatPrice(salesHistory.averagePrice)}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Last Sale</p>
                  <p className="text-lg">{new Date(salesHistory.lastSaleDate).toLocaleDateString()}</p>
                </div>

                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Last 7 Days Sales</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={prepareSalesData()}>
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="quantity" fill="#4f46e5" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
              <p className="text-gray-500">Select a key to view sales history</p>
            </div>
          )}
        </div>
      </div>

      {/* Sale Modal */}
      {showSaleModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">New Key Sale</h2>
                <button
                  onClick={() => setShowSaleModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Keys List */}
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-4">Available Keys</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {keys.map(key => (
                    <div
                      key={key.id}
                      className="border rounded-lg p-4 cursor-pointer hover:border-indigo-500"
                      onClick={() => addSaleItem(key)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">{key.name}</h4>
                          <p className="text-sm text-gray-500">
                            Stock: {key.currentStock || 0}
                          </p>
                        </div>
                        <p className="text-lg font-semibold">
                          {formatPrice(key.sellingPrice || 0)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Selected Items */}
              {saleItems.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-4">Selected Items</h3>
                  <div className="space-y-4">
                    {saleItems.map(item => {
                      const key = keys.find(k => k.id === item.keyId);
                      if (!key) return null;
                      return (
                        <div key={item.keyId} className="flex items-center justify-between border-b pb-4">
                          <div>
                            <h4 className="font-medium">{key.name}</h4>
                            <p className="text-sm text-gray-500">
                              {formatPrice(key.sellingPrice || 0)} × {item.quantity}
                            </p>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => updateQuantity(item.keyId, -1)}
                                className="p-1 rounded-full hover:bg-gray-100"
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              <span>{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.keyId, 1)}
                                className="p-1 rounded-full hover:bg-gray-100"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                            <button
                              onClick={() => removeSaleItem(item.keyId)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Payment Method */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'card' | 'pay_later')}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="pay_later">Pay Later</option>
                </select>
              </div>

              {/* Total */}
              {saleItems.length > 0 && (
                <div className="border-t pt-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Subtotal</span>
                    <span>{formatPrice(calculateTotal().subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Tax (15%)</span>
                    <span>{formatPrice(calculateTotal().tax)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total</span>
                    <span>{formatPrice(calculateTotal().total)}</span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="mt-6 flex justify-end space-x-4">
                <button
                  onClick={() => setShowSaleModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaleComplete}
                  disabled={saleItems.length === 0}
                  className={clsx(
                    "px-4 py-2 rounded-md text-white",
                    saleItems.length === 0
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-indigo-600 hover:bg-indigo-700"
                  )}
                >
                  Complete Sale
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
