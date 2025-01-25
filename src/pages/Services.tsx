import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Key } from 'lucide-react';
import { clsx } from 'clsx';
import { keyInventoryService } from '../services/KeyInventoryService';
import { stockOperationsService } from '../services/StockOperationsService';
import { servicesManagementService, Service, Category, Brand } from '../services/ServicesManagementService';
import { KeyInventoryItem, StockOperationType, AdjustmentReason } from '../models/KeyInventory';

const formatPrice = (amount: number) => `R${amount.toFixed(2)}`;

export function Services() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [keys, setKeys] = useState<KeyInventoryItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'category' | 'service' | 'brand' | 'key'>('service');
  const [selectedItem, setSelectedItem] = useState<Service | Category | Brand | KeyInventoryItem | null>(null);
  const [statusMessage, setStatusMessage] = useState({ text: '', error: false });
  const [stockHistory, setStockHistory] = useState<any[]>([]);
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedKeyForStock, setSelectedKeyForStock] = useState<KeyInventoryItem | null>(null);
  const [stockOperation, setStockOperation] = useState({
    type: 'INTAKE' as StockOperationType,
    quantity: 0,
    notes: '',
    reason: 'DAMAGE' as AdjustmentReason,
    supplierId: '',
    unitCost: 0,
    fromLocationId: '',
    toLocationId: '',
  });

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    categoryId: '',
    brands: [] as string[],
    requiredKeys: [] as string[],
    type: '',
    material: '',
    currentStock: 0,
    reorderPoint: 0,
    costPrice: 0,
    sellingPrice: 0,
    supplierId: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setCategories(servicesManagementService.getAllCategories());
    setServices(servicesManagementService.getAllServices());
    setBrands(servicesManagementService.getAllBrands());
    setKeys(keyInventoryService.getAllKeys());
  };

  const showMessage = (text: string, error = false) => {
    setStatusMessage({ text, error });
    setTimeout(() => setStatusMessage({ text: '', error: false }), 3000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (modalType === 'key') {
        const keyData = {
          name: formData.name,
          specifications: {
            type: formData.type,
            brand: '',
            material: formData.material,
            description: formData.description
          },
          currentStock: formData.currentStock,
          reorderPoint: formData.reorderPoint,
          costPrice: formData.costPrice,
          sellingPrice: formData.sellingPrice,
          supplierId: formData.supplierId
        };

        if (selectedItem) {
          const updatedKey = keyInventoryService.updateKey(selectedItem.id, keyData);
          setKeys(prev => prev.map(k => k.id === updatedKey.id ? updatedKey : k));
        } else {
          const newKey = keyInventoryService.addKey(keyData);
          setKeys(prev => [...prev, newKey]);
        }
      } else {
        const commonData = {
          name: formData.name,
          description: formData.description
        };

        if (modalType === 'service') {
          const serviceData = {
            ...commonData,
            price: parseFloat(formData.price),
            categoryId: formData.categoryId,
            brands: formData.brands,
            requiredKeys: formData.requiredKeys
          };

          if (selectedItem) {
            const updated = servicesManagementService.updateService(selectedItem.id, serviceData);
            setServices(prev => prev.map(s => s.id === updated.id ? updated : s));
          } else {
            const newService = servicesManagementService.addService(serviceData);
            setServices(prev => [...prev, newService]);
          }
        } else if (modalType === 'category') {
          if (selectedItem) {
            const updated = servicesManagementService.updateCategory(selectedItem.id, commonData);
            setCategories(prev => prev.map(c => c.id === updated.id ? updated : c));
          } else {
            const newCategory = servicesManagementService.addCategory(commonData);
            setCategories(prev => [...prev, newCategory]);
          }
        } else {
          if (selectedItem) {
            const updated = servicesManagementService.updateBrand(selectedItem.id, commonData);
            setBrands(prev => prev.map(b => b.id === updated.id ? updated : b));
          } else {
            const newBrand = servicesManagementService.addBrand(commonData);
            setBrands(prev => [...prev, newBrand]);
          }
        }
      }

      setIsModalOpen(false);
      showMessage(`${modalType} ${selectedItem ? 'updated' : 'created'} successfully`);
      resetForm();
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'Error processing request', true);
    }
  };

  const handleDelete = (type: 'category' | 'service' | 'brand' | 'key', id: string) => {
    try {
      if (type === 'key') {
        keyInventoryService.deleteKey(id);
        setKeys(prev => prev.filter(k => k.id !== id));
      } else if (type === 'service') {
        servicesManagementService.deleteService(id);
        setServices(prev => prev.filter(s => s.id !== id));
      } else if (type === 'category') {
        servicesManagementService.deleteCategory(id);
        setCategories(prev => prev.filter(c => c.id !== id));
      } else {
        servicesManagementService.deleteBrand(id);
        setBrands(prev => prev.filter(b => b.id !== id));
      }
      showMessage(`${type} deleted successfully`);
    } catch (error) {
      showMessage(error instanceof Error ? error.message : `Error deleting ${type}`, true);
    }
  };

  const handleStockOperation = async () => {
    if (!selectedKeyForStock) return;

    try {
      if (stockOperation.type === 'INTAKE') {
        await stockOperationsService.createIntake({
          keyId: selectedKeyForStock.id,
          quantity: stockOperation.quantity,
          supplierId: stockOperation.supplierId,
          unitCost: stockOperation.unitCost,
          notes: stockOperation.notes,
          performedBy: 'USER'
        });
      } else if (stockOperation.type === 'ADJUSTMENT') {
        await stockOperationsService.adjustStock(
          selectedKeyForStock.id,
          stockOperation.quantity,
          stockOperation.reason,
          stockOperation.notes,
          'USER'
        );
      } else if (stockOperation.type === 'TRANSFER') {
        await stockOperationsService.initiateTransfer(
          selectedKeyForStock.id,
          stockOperation.quantity,
          stockOperation.toLocationId,
          stockOperation.notes,
          'USER'
        );
      }

      loadData();
      setShowStockModal(false);
      showMessage('Stock operation completed successfully');
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'Error processing stock operation', true);
    }
  };

  const openStockModal = (key: KeyInventoryItem) => {
    setSelectedKeyForStock(key);
    const history = stockOperationsService.getOperationsByKeyId(key.id);
    setStockHistory(history);
    setShowStockModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      categoryId: '',
      brands: [],
      requiredKeys: [],
      type: '',
      material: '',
      currentStock: 0,
      reorderPoint: 0,
      costPrice: 0,
      sellingPrice: 0,
      supplierId: ''
    });
    setSelectedItem(null);
  };

  const openModal = (type: 'category' | 'service' | 'brand' | 'key', item?: Service | Category | Brand | KeyInventoryItem) => {
    setModalType(type);
    setSelectedItem(item || null);
    
    if (item) {
      if (type === 'service' && 'price' in item) {
        setFormData({
          ...formData,
          name: item.name,
          description: item.description,
          price: item.price.toString(),
          categoryId: item.categoryId,
          brands: item.brands || [],
          requiredKeys: item.requiredKeys || []
        });
      } else if (type === 'key' && 'specifications' in item) {
        setFormData({
          ...formData,
          name: item.name,
          description: item.specifications.description || '',
          type: item.specifications.type,
          material: item.specifications.material,
          currentStock: item.currentStock,
          reorderPoint: item.reorderPoint,
          costPrice: item.costPrice,
          sellingPrice: item.sellingPrice,
          supplierId: item.supplierId
        });
      } else if ('description' in item) {
        setFormData({
          ...formData,
          name: item.name,
          description: item.description || ''
        });
      } else {
        setFormData({
          ...formData,
          name: item.name,
          description: ''
        });
      }
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Services Management</h1>
          <div className="space-x-2">
            <button
              onClick={() => openModal('service')}
              className="btn btn-primary"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Service
            </button>
            <button
              onClick={() => openModal('category')}
              className="btn btn-secondary"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Category
            </button>
            <button
              onClick={() => openModal('brand')}
              className="btn btn-secondary"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Brand
            </button>
            <button
              onClick={() => openModal('key')}
              className="btn btn-secondary"
            >
              <Key className="w-4 h-4 mr-2" />
              Add Key
            </button>
          </div>
        </div>

        {/* Status Message */}
        {statusMessage.text && (
          <div className="mb-4 p-2 bg-yellow-100 text-yellow-800 rounded">
            {statusMessage.text}
          </div>
        )}

        {/* Services List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map(service => (
            <div key={service.id} className="border rounded-lg p-4 shadow">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{service.name}</h3>
                  <p className="text-sm text-gray-600">{service.description}</p>
                  <p className="text-lg font-bold mt-2">{formatPrice(service.price)}</p>
                  {service.requiredKeys && service.requiredKeys.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-semibold">Required Keys:</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {service.requiredKeys.map(keyId => {
                          const key = keys.find(k => k.id === keyId);
                          return (
                            <span key={keyId} className="text-xs bg-gray-100 px-2 py-1 rounded">
                              {key?.name || 'Unknown Key'}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => openModal('service', service)}
                    className="p-1 hover:text-blue-600"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete('service', service.id)}
                    className="p-1 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Keys List */}
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Key Inventory</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {keys.map(key => (
              <div key={key.id} className="border rounded-lg p-4 shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{key.name}</h3>
                    {key.specifications && (
                      <>
                        <p className="text-sm text-gray-600">Type: {key.specifications.type}</p>
                        <p className="text-sm text-gray-600">Material: {key.specifications.material}</p>
                      </>
                    )}
                    <p className="text-sm mt-2">
                      Stock: <span className={clsx(
                        "font-semibold",
                        key.currentStock <= key.reorderPoint && "text-red-600"
                      )}>
                        {key.currentStock}
                      </span>
                    </p>
                    <p className="text-lg font-bold mt-2">{formatPrice(key.sellingPrice)}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => openModal('key', key)}
                      className="p-1 hover:text-blue-600"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openStockModal(key)}
                      className="p-1 hover:text-green-600"
                    >
                      <Key className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete('key', key.id)}
                      className="p-1 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {selectedItem ? 'Edit' : 'Add'} {modalType === 'category' ? 'Category' : modalType === 'brand' ? 'Brand' : modalType === 'key' ? 'Key' : 'Service'}
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
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              {modalType === 'service' && (
                <>
                  <div>
                    <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                      Price
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">R</span>
                      </div>
                      <input
                        type="number"
                        id="price"
                        step="0.01"
                        min="0"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        className="mt-1 block w-full pl-7 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                      Category
                    </label>
                    <select
                      id="category"
                      value={formData.categoryId}
                      onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      required
                    >
                      <option value="">Select a category</option>
                      {categories.map(category => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Supported Brands (Optional)
                    </label>
                    <div className="mt-2 space-y-2">
                      {brands.map(brand => (
                        <label key={brand.id} className="inline-flex items-center mr-4">
                          <input
                            type="checkbox"
                            checked={formData.brands.includes(brand.id)}
                            onChange={(e) => {
                              const newBrands = e.target.checked
                                ? [...formData.brands, brand.id]
                                : formData.brands.filter(id => id !== brand.id);
                              setFormData({ ...formData, brands: newBrands });
                            }}
                            className="form-checkbox h-4 w-4 text-indigo-600 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">{brand.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Required Keys (Optional)
                    </label>
                    <div className="mt-2 space-y-2">
                      {keys.map(key => (
                        <label key={key.id} className="inline-flex items-center mr-4">
                          <input
                            type="checkbox"
                            checked={formData.requiredKeys.includes(key.id)}
                            onChange={(e) => {
                              const newRequiredKeys = e.target.checked
                                ? [...formData.requiredKeys, key.id]
                                : formData.requiredKeys.filter(id => id !== key.id);
                              setFormData({ ...formData, requiredKeys: newRequiredKeys });
                            }}
                            className="form-checkbox h-4 w-4 text-indigo-600 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">{key.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {modalType === 'key' && (
                <>
                  <div>
                    <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                      Type
                    </label>
                    <input
                      type="text"
                      id="type"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="material" className="block text-sm font-medium text-gray-700">
                      Material
                    </label>
                    <input
                      type="text"
                      id="material"
                      value={formData.material}
                      onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="currentStock" className="block text-sm font-medium text-gray-700">
                      Current Stock
                    </label>
                    <input
                      type="number"
                      id="currentStock"
                      value={formData.currentStock}
                      onChange={(e) => setFormData({ ...formData, currentStock: parseInt(e.target.value) })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="reorderPoint" className="block text-sm font-medium text-gray-700">
                      Reorder Point
                    </label>
                    <input
                      type="number"
                      id="reorderPoint"
                      value={formData.reorderPoint}
                      onChange={(e) => setFormData({ ...formData, reorderPoint: parseInt(e.target.value) })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="costPrice" className="block text-sm font-medium text-gray-700">
                      Cost Price
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">R</span>
                      </div>
                      <input
                        type="number"
                        id="costPrice"
                        step="0.01"
                        min="0"
                        value={formData.costPrice}
                        onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) })}
                        className="mt-1 block w-full pl-7 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="sellingPrice" className="block text-sm font-medium text-gray-700">
                      Selling Price
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">R</span>
                      </div>
                      <input
                        type="number"
                        id="sellingPrice"
                        step="0.01"
                        min="0"
                        value={formData.sellingPrice}
                        onChange={(e) => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) })}
                        className="mt-1 block w-full pl-7 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="supplierId" className="block text-sm font-medium text-gray-700">
                      Supplier ID
                    </label>
                    <input
                      type="text"
                      id="supplierId"
                      value={formData.supplierId}
                      onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      required
                    />
                  </div>
                </>
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
                  {selectedItem ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Operations Modal */}
      {showStockModal && selectedKeyForStock && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Stock Operations - {selectedKeyForStock.name}</h2>
              <button onClick={() => setShowStockModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Operation Type</label>
                <select
                  className="w-full border rounded p-2"
                  value={stockOperation.type}
                  onChange={e => setStockOperation(prev => ({ ...prev, type: e.target.value as StockOperationType }))}
                >
                  <option value="INTAKE">Intake</option>
                  <option value="ADJUSTMENT">Adjustment</option>
                  <option value="TRANSFER">Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Quantity</label>
                <input
                  type="number"
                  className="w-full border rounded p-2"
                  value={stockOperation.quantity}
                  onChange={e => setStockOperation(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                />
              </div>

              {stockOperation.type === 'ADJUSTMENT' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Reason</label>
                  <select
                    className="w-full border rounded p-2"
                    value={stockOperation.reason}
                    onChange={e => setStockOperation(prev => ({ ...prev, reason: e.target.value as AdjustmentReason }))}
                  >
                    <option value="DAMAGE">Damage</option>
                    <option value="LOSS">Loss</option>
                    <option value="THEFT">Theft</option>
                    <option value="RETURN">Return</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              )}

              {stockOperation.type === 'TRANSFER' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">From Location</label>
                    <input
                      type="text"
                      className="w-full border rounded p-2"
                      value={stockOperation.fromLocationId}
                      onChange={e => setStockOperation(prev => ({ ...prev, fromLocationId: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">To Location</label>
                    <input
                      type="text"
                      className="w-full border rounded p-2"
                      value={stockOperation.toLocationId}
                      onChange={e => setStockOperation(prev => ({ ...prev, toLocationId: e.target.value }))}
                    />
                  </div>
                </>
              )}

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  className="w-full border rounded p-2"
                  value={stockOperation.notes}
                  onChange={e => setStockOperation(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex justify-between items-center">
              <button
                onClick={handleStockOperation}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Process Operation
              </button>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Stock History</h3>
              <div className="max-h-60 overflow-y-auto">
                <table className="min-w-full">
                  <thead>
                    <tr>
                      <th className="text-left">Date</th>
                      <th className="text-left">Type</th>
                      <th className="text-left">Quantity</th>
                      <th className="text-left">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockHistory.map(operation => (
                      <tr key={operation.id} className="border-t">
                        <td className="py-2">{new Date(operation.date).toLocaleDateString()}</td>
                        <td>{operation.type}</td>
                        <td>{operation.quantity}</td>
                        <td>{operation.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Key Management Section */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Key Inventory</h2>
          <button
            onClick={() => openModal('key')}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex items-center"
          >
            <Plus size={20} className="mr-2" />
            Add Key
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead>
              <tr>
                <th className="text-left py-3 px-4 border-b">Name</th>
                <th className="text-left py-3 px-4 border-b">Type</th>
                <th className="text-left py-3 px-4 border-b">Material</th>
                <th className="text-right py-3 px-4 border-b">Stock</th>
                <th className="text-right py-3 px-4 border-b">Reorder Point</th>
                <th className="text-right py-3 px-4 border-b">Price</th>
                <th className="text-center py-3 px-4 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {keys.map(key => (
                <tr key={key.id} className="border-b hover:bg-gray-50">
                  <td className="py-2 px-4">{key.name}</td>
                  <td className="py-2 px-4">{key.specifications?.type}</td>
                  <td className="py-2 px-4">{key.specifications?.material}</td>
                  <td className={clsx(
                    "py-2 px-4 text-right",
                    key.currentStock <= key.reorderPoint && "text-red-500 font-bold"
                  )}>
                    {key.currentStock}
                  </td>
                  <td className="py-2 px-4 text-right">{key.reorderPoint}</td>
                  <td className="py-2 px-4 text-right">{formatPrice(key.sellingPrice)}</td>
                  <td className="py-2 px-4">
                    <div className="flex justify-center space-x-2">
                      <button
                        onClick={() => openModal('key', key)}
                        className="text-blue-500 hover:text-blue-700"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => openStockModal(key)}
                        className="text-green-500 hover:text-green-700"
                      >
                        <Key size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete('key', key.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
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