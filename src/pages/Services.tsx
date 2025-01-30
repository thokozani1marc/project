import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, AlertCircle } from 'lucide-react';
import { getStorageItem, setStorageItem } from '../utils/storage';
import { clsx } from 'clsx';

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
  brands?: string[]; // Array of brand IDs that this service supports
}

const formatPrice = (amount: number) => `R${amount.toFixed(2)}`;

export function Services() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'category' | 'service' | 'brand'>('service');
  const [selectedItem, setSelectedItem] = useState<Service | Category | Brand | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    categoryId: '',
    brands: [] as string[]
  });

  useEffect(() => {
    const savedCategories = getStorageItem<Category[]>('categories', []);
    const savedServices = getStorageItem<Service[]>('services', []);
    const savedBrands = getStorageItem<Brand[]>('brands', []);
    setCategories(savedCategories);
    setServices(savedServices);
    setBrands(savedBrands);
  }, []);

  const showMessage = (message: string, isError = false) => {
    setStatusMessage(message);
    setTimeout(() => setStatusMessage(''), 3000);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      categoryId: '',
      brands: []
    });
    setSelectedItem(null);
  };

  const openModal = (type: 'category' | 'service' | 'brand', item?: Service | Category | Brand) => {
    setModalType(type);
    if (item) {
      setSelectedItem(item);
      if ('price' in item) { // Service
        setFormData({
          name: item.name,
          description: item.description || '',
          price: item.price.toString(),
          categoryId: item.categoryId,
          brands: item.brands || []
        });
      } else { // Category or Brand
        setFormData({
          name: item.name,
          description: item.description || '',
          price: '',
          categoryId: '',
          brands: []
        });
      }
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (modalType === 'category') {
      const category: Category = {
        id: selectedItem?.id || `cat_${Math.random().toString(36).substr(2, 9)}`,
        name: formData.name,
        description: formData.description
      };

      if (selectedItem) {
        setCategories(categories.map(c => c.id === category.id ? category : c));
      } else {
        setCategories([...categories, category]);
      }
      setStorageItem('categories', selectedItem 
        ? categories.map(c => c.id === category.id ? category : c)
        : [...categories, category]
      );
      showMessage(`Category ${selectedItem ? 'updated' : 'created'} successfully`);
    } else if (modalType === 'brand') {
      const brand: Brand = {
        id: selectedItem?.id || `brand_${Math.random().toString(36).substr(2, 9)}`,
        name: formData.name,
        description: formData.description
      };

      if (selectedItem) {
        setBrands(brands.map(b => b.id === brand.id ? brand : b));
      } else {
        setBrands([...brands, brand]);
      }
      setStorageItem('brands', selectedItem 
        ? brands.map(b => b.id === brand.id ? brand : b)
        : [...brands, brand]
      );
      showMessage(`Brand ${selectedItem ? 'updated' : 'created'} successfully`);
    } else {
      if (!formData.categoryId) {
        showMessage('Please select a category', true);
        return;
      }

      const service: Service = {
        id: selectedItem?.id || `srv_${Math.random().toString(36).substr(2, 9)}`,
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        categoryId: formData.categoryId,
        brands: formData.brands
      };

      if (selectedItem) {
        setServices(services.map(s => s.id === service.id ? service : s));
      } else {
        setServices([...services, service]);
      }
      setStorageItem('services', selectedItem 
        ? services.map(s => s.id === service.id ? service : s)
        : [...services, service]
      );
      showMessage(`Service ${selectedItem ? 'updated' : 'created'} successfully`);
    }

    setIsModalOpen(false);
    resetForm();
  };

  const handleDelete = (type: 'category' | 'service' | 'brand', id: string) => {
    if (type === 'category') {
      if (services.some(s => s.categoryId === id)) {
        showMessage('Cannot delete category with existing services', true);
        return;
      }
      const updatedCategories = categories.filter(c => c.id !== id);
      setCategories(updatedCategories);
      setStorageItem('categories', updatedCategories);
      showMessage('Category deleted successfully');
    } else if (type === 'brand') {
      // Update services to remove this brand
      const updatedServices = services.map(service => ({
        ...service,
        brands: service.brands?.filter(b => b !== id)
      }));
      setServices(updatedServices);
      setStorageItem('services', updatedServices);

      const updatedBrands = brands.filter(b => b.id !== id);
      setBrands(updatedBrands);
      setStorageItem('brands', updatedBrands);
      showMessage('Brand deleted successfully');
    } else {
      const updatedServices = services.filter(s => s.id !== id);
      setServices(updatedServices);
      setStorageItem('services', updatedServices);
      showMessage('Service deleted successfully');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Services & Categories</h1>
        <div className="space-x-4">
          <button
            onClick={() => openModal('brand')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Add Brand
          </button>
          <button
            onClick={() => openModal('category')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Add Category
          </button>
          <button
            onClick={() => openModal('service')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Add Service
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className={clsx(
          'p-4 rounded-md',
          statusMessage.includes('successfully') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        )}>
          <div className="flex">
            <AlertCircle className="h-5 w-5 mr-2" />
            <p>{statusMessage}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Brands Section */}
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Brands</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {brands.map(brand => (
              <div key={brand.id} className="p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">{brand.name}</h4>
                  {brand.description && (
                    <p className="text-sm text-gray-500">{brand.description}</p>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => openModal('brand', brand)}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    <Edit2 className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete('brand', brand.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
            {brands.length === 0 && (
              <div className="p-4 text-center text-gray-500">
                No brands yet. Add your first brand.
              </div>
            )}
          </div>
        </div>

        {/* Categories Section */}
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Categories</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {categories.map(category => (
              <div key={category.id} className="p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">{category.name}</h4>
                  {category.description && (
                    <p className="text-sm text-gray-500">{category.description}</p>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => openModal('category', category)}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    <Edit2 className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete('category', category.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
            {categories.length === 0 && (
              <div className="p-4 text-center text-gray-500">
                No categories yet. Add your first category.
              </div>
            )}
          </div>
        </div>

        {/* Services Section */}
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Services</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {services.map(service => (
              <div key={service.id} className="p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">{service.name}</h4>
                  <p className="text-sm text-gray-500">{service.description}</p>
                  <p className="text-sm font-medium text-indigo-600">
                    {formatPrice(service.price)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Category: {categories.find(c => c.id === service.categoryId)?.name}
                  </p>
                  {service.brands && service.brands.length > 0 && (
                    <p className="text-xs text-gray-500">
                      Brands: {service.brands.map(brandId => 
                        brands.find(b => b.id === brandId)?.name
                      ).filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => openModal('service', service)}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    <Edit2 className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete('service', service.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
            {services.length === 0 && (
              <div className="p-4 text-center text-gray-500">
                No services yet. Add your first service.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                {selectedItem ? 'Edit' : 'Add'} {modalType === 'category' ? 'Category' : modalType === 'brand' ? 'Brand' : 'Service'}
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
    </div>
  );
}