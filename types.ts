import React from 'react';

export interface SalesData {
  id: string | number; // Changed to support UUIDs or timestamps
  日期: string;
  類別: string;
  品名: string;
  數量: number;
  銷售金額: number;
  timestamp: number;
}

export interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'outline' | 'ghost' | 'gold';
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export interface DateRange {
  start: string;
  end: string;
}

// Augment window to include XLSX from the CDN script
declare global {
  interface Window {
    XLSX: any;
  }
}