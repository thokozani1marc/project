import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { WashingMachine, AlertCircle } from 'lucide-react';
import { getStorageItem, setStorageItem } from '../utils/storage';

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

export function Login() {
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [role, setRole] = useState<'admin' | 'employee'>('employee');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [hasAdmin, setHasAdmin] = useState<boolean | null>(null);
  const [signupForm, setSignupForm] = useState({
    firstName: '',
    lastName: '',
    gender: 'male' as const,
    phone: '',
    employeeNumber: '',
    password: '',
    status: 'employee' as 'admin' | 'employee'
  });
  
  const { signIn, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if there are any admin users
    const staffMembers = getStorageItem<StaffMember[]>('staff_members', []);
    const adminExists = staffMembers.some(member => member.status === 'admin');
    setHasAdmin(adminExists);

    // If no admin exists, set the signup form status to admin
    if (!adminExists) {
      setSignupForm(prev => ({ ...prev, status: 'admin' }));
    }
  }, []);

  useEffect(() => {
    if (user) {
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [user, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!employeeNumber) {
        throw new Error('Please enter your employee number');
      }

      await signIn(employeeNumber.trim(), role);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Invalid credentials. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!signupForm.firstName || !signupForm.lastName || !signupForm.phone || 
          !signupForm.employeeNumber || !signupForm.password) {
        throw new Error('Please fill in all fields');
      }

      const staffMembers = getStorageItem<StaffMember[]>('staff_members', []);
      
      // Check if employee number already exists
      if (staffMembers.some(member => member.employeeNumber === signupForm.employeeNumber)) {
        throw new Error('Employee number already exists');
      }

      // For first admin signup, force status to be admin
      const status = !hasAdmin ? 'admin' : signupForm.status;

      const newStaffMember: StaffMember = {
        id: `staff_${Math.random().toString(36).substr(2, 9)}`,
        firstName: signupForm.firstName,
        lastName: signupForm.lastName,
        gender: signupForm.gender,
        phone: signupForm.phone,
        employeeNumber: signupForm.employeeNumber,
        status,
        password: signupForm.password
      };

      const updatedStaffMembers = [...staffMembers, newStaffMember];
      setStorageItem('staff_members', updatedStaffMembers);
      setHasAdmin(updatedStaffMembers.some(member => member.status === 'admin'));
      await signIn(signupForm.employeeNumber, status);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to create account');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state while checking for admin
  if (hasAdmin === null) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <WashingMachine className="h-12 w-12 text-indigo-600 animate-spin mx-auto" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!hasAdmin) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <div className="flex justify-center">
              <WashingMachine className="h-12 w-12 text-indigo-600" />
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Create Admin Account
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Set up your first admin account to get started
            </p>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
          )}

          <form className="mt-8 space-y-6" onSubmit={handleSignup}>
            <div className="rounded-md shadow-sm space-y-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                  First Name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={signupForm.firstName}
                  onChange={(e) => setSignupForm({ ...signupForm, firstName: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                  Last Name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={signupForm.lastName}
                  onChange={(e) => setSignupForm({ ...signupForm, lastName: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="gender" className="block text-sm font-medium text-gray-700">
                  Gender
                </label>
                <select
                  id="gender"
                  name="gender"
                  required
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  value={signupForm.gender}
                  onChange={(e) => setSignupForm({ ...signupForm, gender: e.target.value as 'male' | 'female' | 'other' })}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Phone Number
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={signupForm.phone}
                  onChange={(e) => setSignupForm({ ...signupForm, phone: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="employeeNumber" className="block text-sm font-medium text-gray-700">
                  Employee Number
                </label>
                <input
                  id="employeeNumber"
                  name="employeeNumber"
                  type="text"
                  required
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={signupForm.employeeNumber}
                  onChange={(e) => setSignupForm({ ...signupForm, employeeNumber: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={signupForm.password}
                  onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {isLoading ? 'Creating account...' : 'Create Admin Account'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (showSignup) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <div className="flex justify-center">
              <WashingMachine className="h-12 w-12 text-indigo-600" />
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Create Account
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Sign up as a new staff member
            </p>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
          )}

          <form className="mt-8 space-y-6" onSubmit={handleSignup}>
            <div className="rounded-md shadow-sm space-y-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                  First Name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={signupForm.firstName}
                  onChange={(e) => setSignupForm({ ...signupForm, firstName: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                  Last Name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={signupForm.lastName}
                  onChange={(e) => setSignupForm({ ...signupForm, lastName: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="gender" className="block text-sm font-medium text-gray-700">
                  Gender
                </label>
                <select
                  id="gender"
                  name="gender"
                  required
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  value={signupForm.gender}
                  onChange={(e) => setSignupForm({ ...signupForm, gender: e.target.value as 'male' | 'female' | 'other' })}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Phone Number
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={signupForm.phone}
                  onChange={(e) => setSignupForm({ ...signupForm, phone: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="employeeNumber" className="block text-sm font-medium text-gray-700">
                  Employee Number
                </label>
                <input
                  id="employeeNumber"
                  name="employeeNumber"
                  type="text"
                  required
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={signupForm.employeeNumber}
                  onChange={(e) => setSignupForm({ ...signupForm, employeeNumber: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={signupForm.password}
                  onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                  Account Type
                </label>
                <select
                  id="status"
                  name="status"
                  required
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  value={signupForm.status}
                  onChange={(e) => setSignupForm({ ...signupForm, status: e.target.value as 'admin' | 'employee' })}
                >
                  <option value="employee">Employee</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col space-y-3">
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {isLoading ? 'Creating account...' : 'Create Account'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSignup(false);
                  setError('');
                  setSignupForm({
                    firstName: '',
                    lastName: '',
                    gender: 'male',
                    phone: '',
                    employeeNumber: '',
                    password: '',
                    status: 'employee'
                  });
                }}
                className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Back to Login
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <WashingMachine className="h-12 w-12 text-indigo-600" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to Laundry POS
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {role === 'admin' ? 'Admin Login' : 'Employee Login'}
          </p>
        </div>

        <div className="flex justify-center space-x-4">
          <button
            type="button"
            onClick={() => {
              setRole('employee');
              setError('');
              setEmployeeNumber('');
            }}
            className={`px-4 py-2 rounded-md transition-colors ${
              role === 'employee'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Employee
          </button>
          <button
            type="button"
            onClick={() => {
              setRole('admin');
              setError('');
              setEmployeeNumber('');
            }}
            className={`px-4 py-2 rounded-md transition-colors ${
              role === 'admin'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Admin
          </button>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}
          
          <div>
            <label htmlFor="employee-number" className="sr-only">
              Employee Number
            </label>
            <input
              id="employee-number"
              name="employee-number"
              type="text"
              required
              className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="Enter Employee Number"
              value={employeeNumber}
              onChange={(e) => setEmployeeNumber(e.target.value)}
            />
          </div>

          <div className="flex flex-col space-y-3">
            <button
              type="submit"
              disabled={isLoading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                isLoading 
                  ? 'bg-indigo-400 cursor-not-allowed' 
                  : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
              }`}
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>

            <button
              type="button"
              onClick={() => {
                setShowSignup(true);
                setError('');
                setSignupForm({
                  firstName: '',
                  lastName: '',
                  gender: 'male',
                  phone: '',
                  employeeNumber: '',
                  password: '',
                  status: 'employee'
                });
              }}
              className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Create Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}