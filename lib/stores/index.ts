import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { 
  BattleCard, 
  Scenario, 
  PriceData, 
  AIMessage, 
  AIMode,
  BattleCardStatus,
  SpinAnalysis 
} from '@/types';
import { generateId } from '@/lib/utils/helpers';

// Re-export paper trading store
export { usePaperTradingStore } from './paperTradingStore';
export type { PaperPosition, JournalEntry, PaperTradingSettings } from './paperTradingStore';

// ============ BATTLE CARD STORE ============

interface BattleCardState {
  // Current battle card being edited
  currentCard: Partial<BattleCard> | null;
  editingStep: 'capture' | 'spin' | 'challenger' | 'scenarios' | 'review';
  
  // All battle cards
  battleCards: BattleCard[];
  
  // Actions
  setCurrentCard: (card: Partial<BattleCard> | null) => void;
  updateCurrentCard: (updates: Partial<BattleCard>) => void;
  setEditingStep: (step: BattleCardState['editingStep']) => void;
  
  createBattleCard: () => string;
  saveBattleCard: (card: BattleCard) => void;
  updateBattleCard: (id: string, updates: Partial<BattleCard>) => void;
  deleteBattleCard: (id: string) => void;
  
  // Scenario actions
  updateScenario: (cardId: string, scenarioId: string, updates: Partial<Scenario>) => void;
  updateScenarioProbabilities: (cardId: string, probabilities: Record<string, number>) => void;
  activateScenario: (cardId: string, scenarioId: string) => void;
}

export const useBattleCardStore = create<BattleCardState>()(
  persist(
    (set, get) => ({
      currentCard: null,
      editingStep: 'capture',
      battleCards: [],
      
      setCurrentCard: (card) => set({ currentCard: card }),
      
      updateCurrentCard: (updates) => set((state) => ({
        currentCard: state.currentCard 
          ? { ...state.currentCard, ...updates }
          : updates
      })),
      
      setEditingStep: (step) => set({ editingStep: step }),
      
      createBattleCard: () => {
        const id = generateId();
        const newCard: Partial<BattleCard> = {
          id,
          status: 'draft',
          challengerScore: 5,
          scenarios: [
            { id: generateId(), type: 'A', name: 'Primary', probability: 40, isActive: false } as Scenario,
            { id: generateId(), type: 'B', name: 'Secondary', probability: 30, isActive: false } as Scenario,
            { id: generateId(), type: 'C', name: 'Chaos', probability: 20, isActive: false } as Scenario,
            { id: generateId(), type: 'D', name: 'Invalidation', probability: 10, isActive: false } as Scenario,
          ],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        set({ currentCard: newCard, editingStep: 'capture' });
        return id;
      },
      
      saveBattleCard: (card) => set((state) => ({
        battleCards: [...state.battleCards.filter(c => c.id !== card.id), card],
        currentCard: null,
        editingStep: 'capture',
      })),
      
      updateBattleCard: (id, updates) => set((state) => ({
        battleCards: state.battleCards.map(card => 
          card.id === id ? { ...card, ...updates, updatedAt: new Date() } : card
        ),
      })),
      
      deleteBattleCard: (id) => set((state) => ({
        battleCards: state.battleCards.filter(card => card.id !== id),
      })),
      
      updateScenario: (cardId, scenarioId, updates) => set((state) => ({
        battleCards: state.battleCards.map(card => 
          card.id === cardId 
            ? {
                ...card,
                scenarios: card.scenarios.map(s => 
                  s.id === scenarioId ? { ...s, ...updates } : s
                ),
                updatedAt: new Date(),
              }
            : card
        ),
      })),
      
      updateScenarioProbabilities: (cardId, probabilities) => set((state) => ({
        battleCards: state.battleCards.map(card => 
          card.id === cardId 
            ? {
                ...card,
                scenarios: card.scenarios.map(s => ({
                  ...s,
                  probability: probabilities[s.id] ?? s.probability,
                })),
                updatedAt: new Date(),
              }
            : card
        ),
      })),
      
      activateScenario: (cardId, scenarioId) => set((state) => ({
        battleCards: state.battleCards.map(card => 
          card.id === cardId 
            ? {
                ...card,
                activeScenario: scenarioId,
                scenarios: card.scenarios.map(s => ({
                  ...s,
                  isActive: s.id === scenarioId,
                  triggeredAt: s.id === scenarioId ? new Date() : s.triggeredAt,
                })),
                status: 'monitoring' as BattleCardStatus,
                updatedAt: new Date(),
              }
            : card
        ),
      })),
    }),
    {
      name: 'battle-cards-storage',
    }
  )
);

// ============ MARKET DATA STORE ============

export type AssetType = 'crypto' | 'forex' | 'index';

export interface WatchlistAsset {
  symbol: string;
  displayName: string;
  type: AssetType;
  source: 'binance-futures' | 'manual';
}

// Binance Perpetual Futures Assets
export const BINANCE_FUTURES_ASSETS: WatchlistAsset[] = [
  // Major cryptos
  { symbol: 'BTCUSDT', displayName: 'BTC/USDT', type: 'crypto', source: 'binance-futures' },
  { symbol: 'ETHUSDT', displayName: 'ETH/USDT', type: 'crypto', source: 'binance-futures' },
  { symbol: 'BNBUSDT', displayName: 'BNB/USDT', type: 'crypto', source: 'binance-futures' },
  { symbol: 'SOLUSDT', displayName: 'SOL/USDT', type: 'crypto', source: 'binance-futures' },
  { symbol: 'XRPUSDT', displayName: 'XRP/USDT', type: 'crypto', source: 'binance-futures' },
  { symbol: 'ADAUSDT', displayName: 'ADA/USDT', type: 'crypto', source: 'binance-futures' },
  { symbol: 'AVAXUSDT', displayName: 'AVAX/USDT', type: 'crypto', source: 'binance-futures' },
  { symbol: 'DOGEUSDT', displayName: 'DOGE/USDT', type: 'crypto', source: 'binance-futures' },
  { symbol: 'DOTUSDT', displayName: 'DOT/USDT', type: 'crypto', source: 'binance-futures' },
  { symbol: 'LINKUSDT', displayName: 'LINK/USDT', type: 'crypto', source: 'binance-futures' },
  // L1s & L2s
  { symbol: 'ATOMUSDT', displayName: 'ATOM/USDT', type: 'crypto', source: 'binance-futures' },
  { symbol: 'NEARUSDT', displayName: 'NEAR/USDT', type: 'crypto', source: 'binance-futures' },
  { symbol: 'ARBUSDT', displayName: 'ARB/USDT', type: 'crypto', source: 'binance-futures' },
  { symbol: 'OPUSDT', displayName: 'OP/USDT', type: 'crypto', source: 'binance-futures' },
  { symbol: 'APTUSDT', displayName: 'APT/USDT', type: 'crypto', source: 'binance-futures' },
  { symbol: 'SUIUSDT', displayName: 'SUI/USDT', type: 'crypto', source: 'binance-futures' },
  { symbol: 'SEIUSDT', displayName: 'SEI/USDT', type: 'crypto', source: 'binance-futures' },
  { symbol: 'TIAUSDT', displayName: 'TIA/USDT', type: 'crypto', source: 'binance-futures' },
  // AI & Meme
  { symbol: 'INJUSDT', displayName: 'INJ/USDT', type: 'crypto', source: 'binance-futures' },
  { symbol: 'FETUSDT', displayName: 'FET/USDT', type: 'crypto', source: 'binance-futures' },
  { symbol: 'WIFUSDT', displayName: 'WIF/USDT', type: 'crypto', source: 'binance-futures' },
  { symbol: 'RENDERUSDT', displayName: 'RENDER/USDT', type: 'crypto', source: 'binance-futures' },
  { symbol: 'PEPEUSDT', displayName: 'PEPE/USDT', type: 'crypto', source: 'binance-futures' },
  { symbol: 'BONKUSDT', displayName: 'BONK/USDT', type: 'crypto', source: 'binance-futures' },
  { symbol: 'FLOKIUSDT', displayName: 'FLOKI/USDT', type: 'crypto', source: 'binance-futures' },
  // DeFi & Gaming
  { symbol: 'AAVEUSDT', displayName: 'AAVE/USDT', type: 'crypto', source: 'binance-futures' },
  { symbol: 'UNIUSDT', displayName: 'UNI/USDT', type: 'crypto', source: 'binance-futures' },
  { symbol: 'MKRUSDT', displayName: 'MKR/USDT', type: 'crypto', source: 'binance-futures' },
  { symbol: 'LDOUSDT', displayName: 'LDO/USDT', type: 'crypto', source: 'binance-futures' },
  { symbol: 'GRTUSDT', displayName: 'GRT/USDT', type: 'crypto', source: 'binance-futures' },
  // Others
  { symbol: 'LTCUSDT', displayName: 'LTC/USDT', type: 'crypto', source: 'binance-futures' },
  { symbol: 'BCHUSDT', displayName: 'BCH/USDT', type: 'crypto', source: 'binance-futures' },
  { symbol: 'ETCUSDT', displayName: 'ETC/USDT', type: 'crypto', source: 'binance-futures' },
  { symbol: 'FILUSDT', displayName: 'FIL/USDT', type: 'crypto', source: 'binance-futures' },
  { symbol: 'ICPUSDT', displayName: 'ICP/USDT', type: 'crypto', source: 'binance-futures' },
  { symbol: 'RUNEUSDT', displayName: 'RUNE/USDT', type: 'crypto', source: 'binance-futures' },
  { symbol: 'STXUSDT', displayName: 'STX/USDT', type: 'crypto', source: 'binance-futures' },
  { symbol: 'ORDIUSDT', displayName: 'ORDI/USDT', type: 'crypto', source: 'binance-futures' },
  { symbol: 'BASUSDT', displayName: 'BAS/USDT', type: 'crypto', source: 'binance-futures' },
];

// Simple watchlist - just symbol strings
const DEFAULT_WATCHLIST = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT'];

interface MarketDataState {
  prices: Record<string, PriceData>;
  watchlist: string[];
  isConnected: boolean;
  
  updatePrice: (symbol: string, data: PriceData) => void;
  updatePrices: (prices: Record<string, PriceData>) => void;
  addToWatchlist: (symbol: string) => void;
  removeFromWatchlist: (symbol: string) => void;
  setConnected: (connected: boolean) => void;
}

export const useMarketDataStore = create<MarketDataState>()(
  persist(
    (set, get) => ({
      prices: {},
      watchlist: DEFAULT_WATCHLIST,
      isConnected: false,
      
      updatePrice: (symbol, data) => set((state) => ({
        prices: { ...state.prices, [symbol]: data },
      })),
      
      updatePrices: (prices) => set((state) => ({
        prices: { ...state.prices, ...prices },
      })),
      
      addToWatchlist: (symbol) => set((state) => {
        // Normalize symbol: uppercase, remove .P suffix, ensure USDT
        let normalized = symbol.toUpperCase().trim();
        // Remove TradingView perpetual suffix (.P)
        normalized = normalized.replace(/\.P$/i, '');
        // Remove any PERP suffix
        normalized = normalized.replace(/PERP$/i, '');
        // Ensure USDT suffix
        if (!normalized.endsWith('USDT')) {
          normalized = normalized + 'USDT';
        }
        
        return {
          watchlist: state.watchlist.includes(normalized)
            ? state.watchlist 
            : [...state.watchlist, normalized],
        };
      }),
      
      removeFromWatchlist: (symbol) => set((state) => ({
        watchlist: state.watchlist.filter(s => s !== symbol),
      })),
      
      setConnected: (connected) => set({ isConnected: connected }),
    }),
    {
      name: 'market-data-storage',
      partialize: (state) => ({ watchlist: state.watchlist }),
    }
  )
);

// ============ AI MENTOR STORE ============

interface AIMentorState {
  mode: AIMode;
  messages: AIMessage[];
  isLoading: boolean;
  contextCardId: string | null;
  
  setMode: (mode: AIMode) => void;
  addMessage: (message: AIMessage) => void;
  setMessages: (messages: AIMessage[]) => void;
  clearMessages: () => void;
  setLoading: (loading: boolean) => void;
  setContextCard: (cardId: string | null) => void;
}

export const useAIMentorStore = create<AIMentorState>((set) => ({
  mode: 'builder',
  messages: [],
  isLoading: false,
  contextCardId: null,
  
  setMode: (mode) => set({ mode }),
  
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message],
  })),
  
  setMessages: (messages) => set({ messages }),
  
  clearMessages: () => set({ messages: [] }),
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  setContextCard: (cardId) => set({ contextCardId: cardId }),
}));

// ============ UI STORE ============

interface UIState {
  sidebarOpen: boolean;
  activeView: 'dashboard' | 'scanner' | 'battle-card' | 'journal' | 'chat' | 'settings';
  showAIChat: boolean;
  showAlerts: boolean;
  showTour: boolean;
  hasSeenTour: boolean;
  prefillSymbol: string | null; // For scanner -> battle card flow
  
  toggleSidebar: () => void;
  setActiveView: (view: UIState['activeView']) => void;
  toggleAIChat: () => void;
  toggleAlerts: () => void;
  setShowTour: (show: boolean) => void;
  completeTour: () => void;
  setPrefillSymbol: (symbol: string | null) => void;
}

// Check localStorage for tour status
const getInitialTourState = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('scenario_tour_completed') === 'true';
  }
  return false;
};

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  activeView: 'dashboard',
  showAIChat: false,
  showAlerts: false,
  showTour: false,
  hasSeenTour: false,
  prefillSymbol: null,
  
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setActiveView: (view) => set({ activeView: view }),
  toggleAIChat: () => set((state) => ({ showAIChat: !state.showAIChat })),
  toggleAlerts: () => set((state) => ({ showAlerts: !state.showAlerts })),
  setShowTour: (show) => set({ showTour: show }),
  completeTour: () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('scenario_tour_completed', 'true');
    }
    set({ showTour: false, hasSeenTour: true });
  },
  setPrefillSymbol: (symbol) => set({ prefillSymbol: symbol }),
}));

// ============ ALERTS STORE ============

interface AlertItem {
  id: string;
  type: 'info' | 'success' | 'warning' | 'danger';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  battleCardId?: string;
  scenarioType?: 'A' | 'B' | 'C' | 'D';
}

interface AlertsState {
  alerts: AlertItem[];
  
  addAlert: (alert: Omit<AlertItem, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeAlert: (id: string) => void;
  clearAlerts: () => void;
}

export const useAlertsStore = create<AlertsState>((set) => ({
  alerts: [],
  
  addAlert: (alert) => set((state) => ({
    alerts: [
      {
        ...alert,
        id: generateId(),
        timestamp: new Date(),
        read: false,
      },
      ...state.alerts,
    ].slice(0, 50), // Keep only last 50 alerts
  })),
  
  markAsRead: (id) => set((state) => ({
    alerts: state.alerts.map(a => 
      a.id === id ? { ...a, read: true } : a
    ),
  })),
  
  markAllAsRead: () => set((state) => ({
    alerts: state.alerts.map(a => ({ ...a, read: true })),
  })),
  
  removeAlert: (id) => set((state) => ({
    alerts: state.alerts.filter(a => a.id !== id),
  })),
  
  clearAlerts: () => set({ alerts: [] }),
}));

// ============ SCANNER STORE ============

export interface ScannerResult {
  symbol: string;
  price: number;
  change24h: number;
  score: number;
  signals: Array<{
    type: 'bullish' | 'bearish' | 'neutral';
    name: string;
    description: string;
    weight: number;
  }>;
  setupType: 'breakout' | 'reversal' | 'continuation' | 'range' | 'none';
  direction: 'long' | 'short' | 'neutral';
  keyLevels: {
    support: number;
    resistance: number;
  };
  volatility: 'low' | 'medium' | 'high';
  fundingRate?: number;
  openInterest?: number;
  oiChange24h?: number;
}

interface ScannerState {
  results: ScannerResult[];
  lastUpdated: Date | null;
  isScanning: boolean;
  
  setResults: (results: ScannerResult[]) => void;
  setScanning: (scanning: boolean) => void;
  clearResults: () => void;
}

export const useScannerStore = create<ScannerState>((set) => ({
  results: [],
  lastUpdated: null,
  isScanning: false,
  
  setResults: (results) => set({ 
    results, 
    lastUpdated: new Date(),
    isScanning: false 
  }),
  
  setScanning: (scanning) => set({ isScanning: scanning }),
  
  clearResults: () => set({ results: [], lastUpdated: null }),
}));
