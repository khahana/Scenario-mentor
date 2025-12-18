import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Tailwind class merger
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format currency
export function formatCurrency(value: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

// Format crypto price with smart decimals based on price range
// > 1000: 0 decimals
// 100-1000: 1 decimal
// 10-100: 2 decimals
// 1-10: 3 decimals
// 0.001-1: 5 decimals
// 0.0001-0.001: 6 decimals
// < 0.0001: 8 decimals
export function formatPrice(price: number): string {
  if (price >= 1000) {
    return price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  } else if (price >= 100) {
    return price.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  } else if (price >= 10) {
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } else if (price >= 1) {
    return price.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  } else if (price >= 0.001) {
    return price.toLocaleString('en-US', { minimumFractionDigits: 5, maximumFractionDigits: 5 });
  } else if (price >= 0.0001) {
    return price.toLocaleString('en-US', { minimumFractionDigits: 6, maximumFractionDigits: 6 });
  } else {
    return price.toLocaleString('en-US', { minimumFractionDigits: 8, maximumFractionDigits: 8 });
  }
}

// Format price for display with $ prefix
export function formatPriceWithSymbol(price: number): string {
  return `$${formatPrice(price)}`;
}

// Format percentage
export function formatPercent(value: number, decimals: number = 2): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

// Format large numbers (K, M, B)
export function formatCompact(value: number): string {
  if (value >= 1e9) {
    return `${(value / 1e9).toFixed(2)}B`;
  } else if (value >= 1e6) {
    return `${(value / 1e6).toFixed(2)}M`;
  } else if (value >= 1e3) {
    return `${(value / 1e3).toFixed(2)}K`;
  }
  return value.toFixed(2);
}

// Format time ago
export function timeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  
  return date.toLocaleDateString();
}

// Format date
export function formatDate(date: Date, format: 'short' | 'long' | 'time' = 'short'): string {
  if (format === 'time') {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
  if (format === 'long') {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
}

// Calculate R:R ratio
export function calculateRR(entry: number, stop: number, target: number): number {
  const risk = Math.abs(entry - stop);
  const reward = Math.abs(target - entry);
  if (risk === 0) return 0;
  return reward / risk;
}

// Calculate position size
export function calculatePositionSize(
  accountSize: number,
  riskPercent: number,
  entry: number,
  stop: number
): { size: number; dollarRisk: number } {
  const dollarRisk = accountSize * (riskPercent / 100);
  const priceRisk = Math.abs(entry - stop);
  const size = dollarRisk / priceRisk;
  
  return { size, dollarRisk };
}

// Calculate PnL
export function calculatePnL(
  entry: number,
  exit: number,
  quantity: number,
  side: 'long' | 'short'
): { pnl: number; pnlPercent: number } {
  let pnl: number;
  
  if (side === 'long') {
    pnl = (exit - entry) * quantity;
  } else {
    pnl = (entry - exit) * quantity;
  }
  
  const pnlPercent = ((exit - entry) / entry) * 100 * (side === 'long' ? 1 : -1);
  
  return { pnl, pnlPercent };
}

// Validate price inputs
export function isValidPrice(price: string | number): boolean {
  const num = typeof price === 'string' ? parseFloat(price) : price;
  return !isNaN(num) && num > 0 && isFinite(num);
}

// Get scenario color
export function getScenarioColor(type: 'A' | 'B' | 'C' | 'D'): string {
  const colors = {
    A: '#10b981',
    B: '#3b82f6',
    C: '#f59e0b',
    D: '#ef4444',
  };
  return colors[type];
}

// Get scenario name
export function getScenarioName(type: 'A' | 'B' | 'C' | 'D'): string {
  const names = {
    A: 'Primary',
    B: 'Secondary',
    C: 'Chaos',
    D: 'Invalidation',
  };
  return names[type];
}

// Generate unique ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Debounce function
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle function
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Local storage helpers
export const storage = {
  get: <T>(key: string, defaultValue: T): T => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },
  
  set: <T>(key: string, value: T): void => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Handle storage errors silently
    }
  },
  
  remove: (key: string): void => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(key);
  },
};

// Copy to clipboard
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// Sleep utility
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Clamp value between min and max
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// Map value from one range to another
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}
