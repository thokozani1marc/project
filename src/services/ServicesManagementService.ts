import { getStorageItem, setStorageItem } from '../utils/storage';

export interface Brand {
  id: string;
  name: string;
  description?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
}

export interface Service {
  id: string;
  name: string;
  price: number;
  description: string;
  categoryId: string;
  brands?: string[];
  requiredKeys?: string[];
}

const STORAGE_KEYS = {
  SERVICES: 'services',
  CATEGORIES: 'categories',
  BRANDS: 'brands',
} as const;

class ServicesManagementService {
  private static instance: ServicesManagementService;
  private services: Map<string, Service>;
  private categories: Map<string, Category>;
  private brands: Map<string, Brand>;

  private constructor() {
    this.services = new Map(
      Object.entries(getStorageItem<Record<string, Service>>(STORAGE_KEYS.SERVICES, {}))
    );
    this.categories = new Map(
      Object.entries(getStorageItem<Record<string, Category>>(STORAGE_KEYS.CATEGORIES, {}))
    );
    this.brands = new Map(
      Object.entries(getStorageItem<Record<string, Brand>>(STORAGE_KEYS.BRANDS, {}))
    );
  }

  static getInstance(): ServicesManagementService {
    if (!ServicesManagementService.instance) {
      ServicesManagementService.instance = new ServicesManagementService();
    }
    return ServicesManagementService.instance;
  }

  private persistServices(): void {
    const servicesObject = Object.fromEntries(this.services);
    setStorageItem(STORAGE_KEYS.SERVICES, servicesObject);
  }

  private persistCategories(): void {
    const categoriesObject = Object.fromEntries(this.categories);
    setStorageItem(STORAGE_KEYS.CATEGORIES, categoriesObject);
  }

  private persistBrands(): void {
    const brandsObject = Object.fromEntries(this.brands);
    setStorageItem(STORAGE_KEYS.BRANDS, brandsObject);
  }

  // Service Methods
  getAllServices(): Service[] {
    return Array.from(this.services.values());
  }

  getService(id: string): Service | undefined {
    return this.services.get(id);
  }

  addService(data: Omit<Service, 'id'>): Service {
    const id = crypto.randomUUID();
    const service: Service = { id, ...data };
    
    if (!this.categories.has(service.categoryId)) {
      throw new Error('Invalid category ID');
    }

    if (service.brands?.some(brandId => !this.brands.has(brandId))) {
      throw new Error('One or more invalid brand IDs');
    }

    this.services.set(id, service);
    this.persistServices();
    return service;
  }

  updateService(id: string, data: Partial<Omit<Service, 'id'>>): Service {
    const existing = this.services.get(id);
    if (!existing) {
      throw new Error('Service not found');
    }

    if (data.categoryId && !this.categories.has(data.categoryId)) {
      throw new Error('Invalid category ID');
    }

    if (data.brands?.some(brandId => !this.brands.has(brandId))) {
      throw new Error('One or more invalid brand IDs');
    }

    const updated: Service = { ...existing, ...data };
    this.services.set(id, updated);
    this.persistServices();
    return updated;
  }

  deleteService(id: string): void {
    if (!this.services.delete(id)) {
      throw new Error('Service not found');
    }
    this.persistServices();
  }

  // Category Methods
  getAllCategories(): Category[] {
    return Array.from(this.categories.values());
  }

  getCategory(id: string): Category | undefined {
    return this.categories.get(id);
  }

  addCategory(data: Omit<Category, 'id'>): Category {
    const id = crypto.randomUUID();
    const category: Category = { id, ...data };
    this.categories.set(id, category);
    this.persistCategories();
    return category;
  }

  updateCategory(id: string, data: Partial<Omit<Category, 'id'>>): Category {
    const existing = this.categories.get(id);
    if (!existing) {
      throw new Error('Category not found');
    }

    const updated: Category = { ...existing, ...data };
    this.categories.set(id, updated);
    this.persistCategories();
    return updated;
  }

  deleteCategory(id: string): void {
    if (Array.from(this.services.values()).some(s => s.categoryId === id)) {
      throw new Error('Cannot delete category with existing services');
    }

    if (!this.categories.delete(id)) {
      throw new Error('Category not found');
    }
    this.persistCategories();
  }

  // Brand Methods
  getAllBrands(): Brand[] {
    return Array.from(this.brands.values());
  }

  getBrand(id: string): Brand | undefined {
    return this.brands.get(id);
  }

  addBrand(data: Omit<Brand, 'id'>): Brand {
    const id = crypto.randomUUID();
    const brand: Brand = { id, ...data };
    this.brands.set(id, brand);
    this.persistBrands();
    return brand;
  }

  updateBrand(id: string, data: Partial<Omit<Brand, 'id'>>): Brand {
    const existing = this.brands.get(id);
    if (!existing) {
      throw new Error('Brand not found');
    }

    const updated: Brand = { ...existing, ...data };
    this.brands.set(id, updated);
    this.persistBrands();
    return updated;
  }

  deleteBrand(id: string): void {
    // Update services to remove this brand
    for (const service of this.services.values()) {
      if (service.brands?.includes(id)) {
        const updated = {
          ...service,
          brands: service.brands.filter(b => b !== id)
        };
        this.services.set(service.id, updated);
      }
    }
    this.persistServices();

    if (!this.brands.delete(id)) {
      throw new Error('Brand not found');
    }
    this.persistBrands();
  }
}

export const servicesManagementService = ServicesManagementService.getInstance();
