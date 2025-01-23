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

// Get the next order number
export function getNextOrderNumber(): string {
  const lastOrderNumber = getStorageItem<number>('last_order_number', 0);
  const nextNumber = lastOrderNumber + 1;
  setStorageItem('last_order_number', nextNumber);
  return `INV${nextNumber.toString().padStart(6, '0')}`;
}