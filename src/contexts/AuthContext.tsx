import React, { createContext, useContext, useState, useEffect } from 'react';
import { getStorageItem, setStorageItem } from '../utils/storage';
import { format } from 'date-fns';

interface User {
  id: string;
  name: string;
  role: 'admin' | 'employee';
  employeeNumber: string;
  clockedIn?: boolean;
  lastClockIn?: Date;
}

interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  gender: 'male' | 'female' | 'other';
  phone: string;
  employeeNumber: string;
  status: 'employee' | 'admin';
}

interface TimeRecord {
  id: string;
  userId: string;
  userName: string;
  clockIn: Date;
  clockOut?: Date;
  totalHours?: number;
}

interface ShiftRecord {
  id: string;
  userId: string;
  userName: string;
  date: Date;
  confirmedAt: Date;
}

interface AuthContextType {
  user: User | null;
  signIn: (employeeNumber: string, role: 'admin' | 'employee') => Promise<void>;
  signOut: () => Promise<void>;
  clockIn: () => Promise<void>;
  clockOut: () => Promise<void>;
  verifyCredentials: (employeeNumber: string) => Promise<boolean>;
  isShiftEnded: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'laundry_auth_user';
const TIME_RECORDS_KEY = 'time_records';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const storedUser = localStorage.getItem(STORAGE_KEY);
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
      console.error('Error reading user from storage:', error);
      return null;
    }
  });

  const [isShiftEnded, setIsShiftEnded] = useState(false);

  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (error) {
      console.error('Error saving user to storage:', error);
    }
  }, [user]);

  useEffect(() => {
    // Check if shift is ended for today
    const shifts = getStorageItem<ShiftRecord[]>('shift_records', []);
    const today = new Date();
    const todayShift = shifts.find(shift => 
      format(new Date(shift.date), 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
    );
    setIsShiftEnded(!!todayShift);
  }, []);

  const verifyCredentials = async (employeeNumber: string): Promise<boolean> => {
    const staffMembers = getStorageItem<StaffMember[]>('staff_members', []);
    return staffMembers.some(s => s.employeeNumber === employeeNumber);
  };

  const getActiveSessions = () => {
    return getStorageItem<TimeRecord[]>(TIME_RECORDS_KEY, [])
      .filter(record => !record.clockOut);
  };

  const signIn = async (employeeNumber: string, role: 'admin' | 'employee') => {
    if (!employeeNumber) {
      throw new Error('Employee number is required');
    }

    // Check if shift is ended and user is not admin
    if (isShiftEnded && role !== 'admin') {
      throw new Error('Shift has ended for today. Only admin can access the system.');
    }

    const staffMembers = getStorageItem<StaffMember[]>('staff_members', []);
    const staffMember = staffMembers.find(
      staff => staff.employeeNumber === employeeNumber && staff.status === role
    );

    if (!staffMember) {
      throw new Error(role === 'admin' ? 'Invalid admin credentials' : 'Invalid employee number');
    }

    setUser({
      id: staffMember.id,
      name: `${staffMember.firstName} ${staffMember.lastName}`,
      role: staffMember.status,
      employeeNumber: staffMember.employeeNumber
    });

    // Check active sessions to determine if user is already clocked in
    const activeSessions = getActiveSessions();
    const existingSession = activeSessions.find(session => session.userId === employeeNumber);

    if (existingSession) {
      setUser(prev => prev ? {
        ...prev,
        clockedIn: true,
        lastClockIn: new Date(existingSession.clockIn)
      } : null);
    }
  };

  const signOut = async () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const clockIn = async () => {
    if (!user) return;

    const timeRecords = getStorageItem<TimeRecord[]>(TIME_RECORDS_KEY, []);
    const newRecord: TimeRecord = {
      id: `tr_${Math.random().toString(36).substr(2, 9)}`,
      userId: user.employeeNumber,
      userName: user.name,
      clockIn: new Date()
    };

    setStorageItem(TIME_RECORDS_KEY, [...timeRecords, newRecord]);
    setUser({ ...user, clockedIn: true, lastClockIn: new Date() });
  };

  const clockOut = async () => {
    if (!user) return;

    const timeRecords = getStorageItem<TimeRecord[]>(TIME_RECORDS_KEY, []);
    const activeRecord = timeRecords.find(
      record => record.userId === user.employeeNumber && !record.clockOut
    );

    if (activeRecord) {
      const clockOut = new Date();
      const clockIn = new Date(activeRecord.clockIn);
      const totalHours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);

      const updatedRecords = timeRecords.map(record =>
        record.id === activeRecord.id
          ? { ...record, clockOut, totalHours }
          : record
      );

      setStorageItem(TIME_RECORDS_KEY, updatedRecords);
      setUser({ ...user, clockedIn: false, lastClockIn: undefined });
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      signIn, 
      signOut, 
      clockIn, 
      clockOut, 
      verifyCredentials,
      isShiftEnded 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}