import React, { useState, useEffect } from 'react';
import { Users, Settings as SettingsIcon, AlertCircle, X, MessageSquare } from 'lucide-react';
import { getStorageItem, setStorageItem } from '../utils/storage';
import { clsx } from 'clsx';

interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  gender: 'male' | 'female' | 'other';
  phone: string;
  employeeNumber: string;
  status: 'employee' | 'admin';
  password?: string;
}

interface CompanySettings {
  companyName: string;
  storeName: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  enableTax: boolean;
  taxNumber: string;
  vatPercentage: string;
  logo?: string;
  smsTemplates: {
    pending: string;
    ready: string;
    completed: string;
  };
}

export function Settings() {
  const [activeTab, setActiveTab] = useState<'staff' | 'company' | 'sms'>('staff');
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [companySettings, setCompanySettings] = useState<CompanySettings>({
    companyName: '',
    storeName: '',
    phone: '',
    email: '',
    website: '',
    address: '',
    enableTax: false,
    taxNumber: '',
    vatPercentage: '15',
    logo: '',
    smsTemplates: {
      pending: 'Dear {customer}, your order #{orderId} has been received and is pending processing.',
      ready: 'Dear {customer}, your order #{orderId} is ready for collection.',
      completed: 'Dear {customer}, thank you for collecting your order #{orderId}. We appreciate your business!'
    }
  });
  
  const [staffForm, setStaffForm] = useState<Partial<StaffMember>>({
    firstName: '',
    lastName: '',
    gender: 'male',
    phone: '',
    employeeNumber: '',
    status: 'employee',
    password: ''
  });
  const [employeeNumberError, setEmployeeNumberError] = useState('');

  // Check if employee number is unique
  const isEmployeeNumberUnique = (employeeNumber: string) => {
    return !staffMembers.some(staff => 
      staff.employeeNumber === employeeNumber && staff.id !== selectedStaff?.id
    );
  };

  const handleEmployeeNumberChange = (employeeNumber: string) => {
    setStaffForm({ ...staffForm, employeeNumber });
    if (employeeNumber && !isEmployeeNumberUnique(employeeNumber)) {
      setEmployeeNumberError('This employee number is already in use');
    } else {
      setEmployeeNumberError('');
    }
  };

  useEffect(() => {
    const defaultSettings: CompanySettings = {
      companyName: '',
      storeName: '',
      phone: '',
      email: '',
      website: '',
      address: '',
      enableTax: false,
      taxNumber: '',
      vatPercentage: '15',
      logo: '',
      smsTemplates: {
        pending: 'Dear {customer}, your order #{orderId} has been received and is pending processing.',
        ready: 'Dear {customer}, your order #{orderId} is ready for collection.',
        completed: 'Dear {customer}, thank you for collecting your order #{orderId}. We appreciate your business!'
      }
    };

    const savedStaffMembers = getStorageItem<StaffMember[]>('staff_members', []);
    const savedSettings = getStorageItem<CompanySettings>('company_settings', defaultSettings);
    
    // Ensure smsTemplates exists in saved settings
    const mergedSettings = {
      ...defaultSettings,
      ...savedSettings,
      smsTemplates: {
        ...defaultSettings.smsTemplates,
        ...(savedSettings.smsTemplates || {})
      }
    };

    setStaffMembers(savedStaffMembers);
    setCompanySettings(mergedSettings);
  }, []);

  const showMessage = (message: string) => {
    setStatusMessage(message);
    setTimeout(() => setStatusMessage(''), 3000);
  };

  const resetStaffForm = () => {
    setStaffForm({
      firstName: '',
      lastName: '',
      gender: 'male',
      phone: '',
      employeeNumber: '',
      status: 'employee',
      password: ''
    });
    setSelectedStaff(null);
  };

  const handleStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!staffForm.firstName || !staffForm.lastName || !staffForm.phone || !staffForm.employeeNumber) {
      showMessage('Please fill in all required fields');
      return;
    }

    if (!selectedStaff && !staffForm.password) {
      showMessage('Password is required for new staff members');
      return;
    }

    if (!isEmployeeNumberUnique(staffForm.employeeNumber!)) {
      showMessage('Employee number must be unique');
      return;
    }

    const newStaffMember: StaffMember = {
      id: selectedStaff?.id || `staff_${Math.random().toString(36).substr(2, 9)}`,
      firstName: staffForm.firstName!,
      lastName: staffForm.lastName!,
      gender: staffForm.gender as 'male' | 'female' | 'other',
      phone: staffForm.phone!,
      employeeNumber: staffForm.employeeNumber!,
      status: staffForm.status as 'employee' | 'admin',
      ...(staffForm.password ? { password: staffForm.password } : {})
    };

    if (selectedStaff) {
      setStaffMembers(staffMembers.map(s => s.id === selectedStaff.id ? newStaffMember : s));
      setStorageItem('staff_members', staffMembers.map(s => s.id === selectedStaff.id ? newStaffMember : s));
      showMessage('Staff member updated successfully');
    } else {
      setStaffMembers([...staffMembers, newStaffMember]);
      setStorageItem('staff_members', [...staffMembers, newStaffMember]);
      showMessage('Staff member added successfully');
    }

    setIsModalOpen(false);
    resetStaffForm();
  };

  const handleDeleteStaff = (id: string) => {
    if (window.confirm('Are you sure you want to delete this staff member?')) {
      const updatedStaffMembers = staffMembers.filter(s => s.id !== id);
      setStaffMembers(updatedStaffMembers);
      setStorageItem('staff_members', updatedStaffMembers);
      showMessage('Staff member deleted successfully');
    }
  };

  const handleCompanySettingsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!companySettings.companyName || !companySettings.storeName) {
      showMessage('Company Name and Store Name are required');
      return;
    }

    if (companySettings.enableTax && !companySettings.taxNumber) {
      showMessage('Tax Number is required when tax is enabled');
      return;
    }

    setStorageItem('company_settings', companySettings);
    showMessage('Company settings updated successfully');
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompanySettings(prev => ({
          ...prev,
          logo: reader.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        {activeTab === 'staff' && (
          <button
            onClick={() => {
              setIsModalOpen(true);
              resetStaffForm();
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Add Staff Member
          </button>
        )}
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

      <div className="mb-6">
        <nav className="flex space-x-4">
          <button
            onClick={() => setActiveTab('staff')}
            className={clsx(
              'px-3 py-2 text-sm font-medium rounded-md',
              activeTab === 'staff'
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <Users className="h-5 w-5 inline-block mr-2" />
            Staff Management
          </button>
          <button
            onClick={() => setActiveTab('company')}
            className={clsx(
              'px-3 py-2 text-sm font-medium rounded-md',
              activeTab === 'company'
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <SettingsIcon className="h-5 w-5 inline-block mr-2" />
            Company Settings
          </button>
          <button
            onClick={() => setActiveTab('sms')}
            className={clsx(
              'px-3 py-2 text-sm font-medium rounded-md',
              activeTab === 'sms'
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <MessageSquare className="h-5 w-5 inline-block mr-2" />
            SMS Templates
          </button>
        </nav>
      </div>

      {activeTab === 'staff' ? (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {staffMembers.map((staff) => (
                <tr key={staff.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {staff.firstName} {staff.lastName}
                    </div>
                    <div className="text-sm text-gray-500 capitalize">
                      {staff.gender}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {staff.employeeNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={clsx(
                      'px-2 inline-flex text-xs leading-5 font-semibold rounded-full',
                      staff.status === 'admin'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-green-100 text-green-800'
                    )}>
                      {staff.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {staff.phone}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => {
                        setSelectedStaff(staff);
                        setStaffForm({
                          firstName: staff.firstName,
                          lastName: staff.lastName,
                          gender: staff.gender,
                          phone: staff.phone,
                          employeeNumber: staff.employeeNumber,
                          status: staff.status
                        });
                        setIsModalOpen(true);
                      }}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteStaff(staff.id)}
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
      ) : activeTab === 'company' ? (
        <div className="bg-white shadow-md rounded-lg p-6">
          <form onSubmit={handleCompanySettingsSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {/* Logo Upload Section */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Logo
                </label>
                <div className="flex items-center space-x-4">
                  {companySettings.logo && (
                    <div className="relative w-32 h-32">
                      <img
                        src={companySettings.logo}
                        alt="Company Logo"
                        className="object-contain w-full h-full"
                      />
                      <button
                        type="button"
                        onClick={() => setCompanySettings(prev => ({ ...prev, logo: '' }))}
                        className="absolute -top-2 -right-2 bg-red-100 rounded-full p-1 text-red-600 hover:bg-red-200"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  <div className="flex-1">
                    <label
                      htmlFor="logo-upload"
                      className="relative cursor-pointer rounded-md bg-white font-medium text-indigo-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 hover:text-indigo-500"
                    >
                      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                        <div className="space-y-1 text-center">
                          <svg
                            className="mx-auto h-12 w-12 text-gray-400"
                            stroke="currentColor"
                            fill="none"
                            viewBox="0 0 48 48"
                            aria-hidden="true"
                          >
                            <path
                              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          <div className="flex text-sm text-gray-600">
                            <span>Upload a file</span>
                            <input
                              id="logo-upload"
                              name="logo-upload"
                              type="file"
                              accept="image/*"
                              className="sr-only"
                              onChange={handleLogoUpload}
                            />
                          </div>
                          <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
                  Company Name *
                </label>
                <input
                  type="text"
                  id="companyName"
                  value={companySettings.companyName}
                  onChange={(e) => setCompanySettings({
                    ...companySettings,
                    companyName: e.target.value
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  required
                />
              </div>

              <div>
                <label htmlFor="storeName" className="block text-sm font-medium text-gray-700">
                  Store Name *
                </label>
                <input
                  type="text"
                  id="storeName"
                  value={companySettings.storeName}
                  onChange={(e) => setCompanySettings({
                    ...companySettings,
                    storeName: e.target.value
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  required
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={companySettings.phone}
                  onChange={(e) => setCompanySettings({
                    ...companySettings,
                    phone: e.target.value
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={companySettings.email}
                  onChange={(e) => setCompanySettings({
                    ...companySettings,
                    email: e.target.value
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="website" className="block text-sm font-medium text-gray-700">
                  Website Address
                </label>
                <input
                  type="text"
                  id="website"
                  value={companySettings.website}
                  onChange={(e) => setCompanySettings({
                    ...companySettings,
                    website: e.target.value
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                  Address
                </label>
                <textarea
                  id="address"
                  value={companySettings.address}
                  onChange={(e) => setCompanySettings({
                    ...companySettings,
                    address: e.target.value
                  })}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div className="border-t pt-6">
              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  id="enableTax"
                  checked={companySettings.enableTax}
                  onChange={(e) => setCompanySettings({
                    ...companySettings,
                    enableTax: e.target.checked,
                    // Reset tax fields if tax is disabled
                    ...(e.target.checked ? {} : { taxNumber: '', vatPercentage: '15' })
                  })}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="enableTax" className="ml-2 block text-sm text-gray-900">
                  Enable VAT/Tax
                </label>
              </div>

              {companySettings.enableTax && (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label htmlFor="taxNumber" className="block text-sm font-medium text-gray-700">
                      Tax Number *
                    </label>
                    <input
                      type="text"
                      id="taxNumber"
                      value={companySettings.taxNumber}
                      onChange={(e) => setCompanySettings({
                        ...companySettings,
                        taxNumber: e.target.value
                      })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      required={companySettings.enableTax}
                    />
                  </div>

                  <div>
                    <label htmlFor="vatPercentage" className="block text-sm font-medium text-gray-700">
                      VAT Percentage
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <input
                        type="number"
                        id="vatPercentage"
                        value={companySettings.vatPercentage}
                        onChange={(e) => setCompanySettings({
                          ...companySettings,
                          vatPercentage: e.target.value
                        })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        min="0"
                        max="100"
                        step="0.1"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">%</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Save Settings
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-6">SMS Templates</h2>
          <form onSubmit={(e) => {
            e.preventDefault();
            setStorageItem('company_settings', companySettings);
            showMessage('SMS templates saved successfully');
          }}>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Order Pending Template
                </label>
                <textarea
                  value={companySettings.smsTemplates.pending}
                  onChange={(e) => setCompanySettings({
                    ...companySettings,
                    smsTemplates: {
                      ...companySettings.smsTemplates,
                      pending: e.target.value
                    }
                  })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Template for pending orders..."
                />
                <p className="mt-1 text-sm text-gray-500">
                  Available variables: {'{customer}'}, {'{orderId}'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Order Ready Template
                </label>
                <textarea
                  value={companySettings.smsTemplates.ready}
                  onChange={(e) => setCompanySettings({
                    ...companySettings,
                    smsTemplates: {
                      ...companySettings.smsTemplates,
                      ready: e.target.value
                    }
                  })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Template for ready orders..."
                />
                <p className="mt-1 text-sm text-gray-500">
                  Available variables: {'{customer}'}, {'{orderId}'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Order Completed Template
                </label>
                <textarea
                  value={companySettings.smsTemplates.completed}
                  onChange={(e) => setCompanySettings({
                    ...companySettings,
                    smsTemplates: {
                      ...companySettings.smsTemplates,
                      completed: e.target.value
                    }
                  })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Template for completed orders..."
                />
                <p className="mt-1 text-sm text-gray-500">
                  Available variables: {'{customer}'}, {'{orderId}'}
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Save Templates
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Staff Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                {selectedStaff ? 'Edit Staff Member' : 'Add Staff Member'}
              </h2>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  resetStaffForm();
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleStaffSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">First Name</label>
                <input
                  type="text"
                  value={staffForm.firstName}
                  onChange={(e) => setStaffForm({ ...staffForm, firstName: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Last Name</label>
                <input
                  type="text"
                  value={staffForm.lastName}
                  onChange={(e) => setStaffForm({ ...staffForm, lastName: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Gender</label>
                <select
                  value={staffForm.gender}
                  onChange={(e) => setStaffForm({ ...staffForm, gender: e.target.value as 'male' | 'female' | 'other' })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <input
                  type="tel"
                  value={staffForm.phone}
                  onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Employee Number</label>
                <input
                  type="text"
                  value={staffForm.employeeNumber}
                  onChange={(e) => handleEmployeeNumberChange(e.target.value)}
                  className={clsx(
                    "mt-1 block w-full rounded-md shadow-sm focus:ring-indigo-500 sm:text-sm",
                    employeeNumberError
                      ? "border-red-300 focus:border-red-500"
                      : "border-gray-300 focus:border-indigo-500"
                  )}
                  required
                />
                {employeeNumberError && (
                  <p className="mt-1 text-sm text-red-600">{employeeNumberError}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <select
                  value={staffForm.status}
                  onChange={(e) => setStaffForm({ ...staffForm, status: e.target.value as 'employee' | 'admin' })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="employee">Employee</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <input
                  type="password"
                  value={staffForm.password || ''}
                  onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  required={!selectedStaff}
                  placeholder={selectedStaff ? '(Leave blank to keep current password)' : ''}
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    resetStaffForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium"
                >
                  {selectedStaff ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}