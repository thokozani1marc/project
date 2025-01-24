// Type-safe storage utilities
export function getStorageItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;
    
    const parsed = JSON.parse(item, (key, value) => {
      // Convert date strings back to Date objects
      if (typeof value === 'string') {
        const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
        if (dateRegex.test(value)) {
          const date = new Date(value);
          // Check if it's a valid date
          if (!isNaN(date.getTime())) {
            return date;
          }
        }
      }
      return value;
    });

    return parsed ?? defaultValue;
  } catch (error) {
    console.error(`Error reading from localStorage for key ${key}:`, error);
    return defaultValue;
  }
}

export function setStorageItem<T>(key: string, value: T): void {
  try {
    if (value === undefined) {
      console.warn(`Attempted to store undefined value for key ${key}`);
      return;
    }
    
    const serialized = JSON.stringify(value, (key, value) => {
      if (value instanceof Date) {
        return value.toISOString();
      }
      return value;
    });
    
    localStorage.setItem(key, serialized);
  } catch (error) {
    console.error(`Error writing to localStorage for key ${key}:`, error);
  }
}

export function removeStorageItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing item from localStorage for key ${key}:`, error);
  }
}

export function clearStorage(): void {
  try {
    localStorage.clear();
  } catch (error) {
    console.error('Error clearing localStorage:', error);
  }
}

// Initialize default services with categories
export function initializeDefaultServices(): void {
  const defaultServices = [
    {
      id: '1',
      name: 'Regular Wash & Iron',
      price: 75.00,
      description: 'Standard wash and iron service for everyday clothes',
      category: 'Wash & Iron'
    },
    {
      id: '2',
      name: 'Delicate Wash & Iron',
      price: 95.00,
      description: 'Gentle wash and iron for delicate fabrics',
      category: 'Wash & Iron'
    },
    {
      id: '3',
      name: 'Suit Dry Clean',
      price: 150.00,
      description: 'Professional dry cleaning for suits and formal wear',
      category: 'Dry Clean'
    },
    {
      id: '4',
      name: 'Dress Dry Clean',
      price: 120.00,
      description: 'Dry cleaning service for dresses and gowns',
      category: 'Dry Clean'
    },
    {
      id: '5',
      name: 'Button Repair',
      price: 25.00,
      description: 'Replace missing or broken buttons',
      category: 'Repairs'
    },
    {
      id: '6',
      name: 'Zipper Repair',
      price: 45.00,
      description: 'Fix or replace broken zippers',
      category: 'Repairs'
    },
    {
      id: '7',
      name: 'Leather Care',
      price: 200.00,
      description: 'Specialized cleaning and conditioning for leather items',
      category: 'Special Care'
    },
    {
      id: '8',
      name: 'Wedding Dress Care',
      price: 350.00,
      description: 'Premium cleaning and preservation for wedding dresses',
      category: 'Special Care'
    },
    {
      id: '9',
      name: 'Same Day Wash & Iron',
      price: 120.00,
      description: 'Express wash and iron service, ready in 8 hours',
      category: 'Express Services'
    },
    {
      id: '10',
      name: '2-Hour Dry Clean',
      price: 200.00,
      description: 'Ultra-fast dry cleaning service',
      category: 'Express Services'
    }
  ];

  const existingServices = getStorageItem<any[]>('services', []);
  if (existingServices.length === 0) {
    setStorageItem('services', defaultServices);
  } else {
    // Update existing services to include categories if they don't have them
    const updatedServices = existingServices.map(service => ({
      ...service,
      category: service.category || 'Wash & Iron' // Default category for existing services
    }));
    setStorageItem('services', updatedServices);
  }
}

// Get the next order number
export function getNextOrderNumber(): string {
  const lastOrderNumber = getStorageItem<number>('last_order_number', 0);
  const nextNumber = lastOrderNumber + 1;
  setStorageItem('last_order_number', nextNumber);
  return `INV${nextNumber.toString().padStart(6, '0')}`;
}