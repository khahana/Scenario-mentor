import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateId } from '@/lib/utils/helpers';

// ============ PAPER POSITION ============

export interface PaperPosition {
  id: string;
  battleCardId: string;
  scenarioType: 'A' | 'B' | 'C' | 'D';
  scenarioName: string;
  instrument: string;
  timeframe: string;
  direction: 'long' | 'short';
  thesis: string;
  leverage?: number;
  
  // Entry
  entryPrice: number;
  entryTime: Date;
  openedAt: Date;
  size: number;
  
  // Levels
  stopLoss: number;
  target1: number;
  target2?: number;
  target3?: number;
  
  // Status
  status: 'open' | 'closed';
  exitPrice?: number;
  exitTime?: Date;
  exitReason?: 'stop_hit' | 'target1_hit' | 'target2_hit' | 'target3_hit' | 'invalidation' | 'manual';
  
  // P&L
  realizedPnl?: number;
  realizedPnlPercent?: number;
  rMultiple?: number;
}

// ============ JOURNAL ENTRY ============

export interface JournalEntry {
  id: string;
  date: Date;
  instrument: string;
  timeframe: string;
  direction: 'long' | 'short';
  scenarioType: 'A' | 'B' | 'C' | 'D';
  scenarioName: string;
  thesis: string;
  
  entryPrice: number;
  exitPrice: number;
  stopLoss: number;
  target: number;
  size: number;
  leverage: number;
  
  outcome: 'win' | 'loss' | 'breakeven';
  pnl: number;
  pnlPercent: number;
  rMultiple: number;
  
  entryTime: Date;
  exitTime: Date;
  holdingPeriod: string;
  exitReason: string;
  
  // NEW: Track which scenario actually played out
  actualScenario?: 'A' | 'B' | 'C' | 'D';
  actualScenarioName?: string;
  scenarioNotes?: string;
  
  lessonsLearned?: string;
}

// ============ SETTINGS ============

export interface PaperTradingSettings {
  enabled: boolean;
  defaultSize: number;
  leverage: number;
  autoExecuteOnTrigger: boolean;
  autoExitOnTarget: boolean;
  autoExitOnStop: boolean;
  soundAlerts: boolean;
  startingBalance: number;
}

// ============ STORE ============

interface PaperTradingState {
  positions: PaperPosition[];
  journal: JournalEntry[];
  settings: PaperTradingSettings;
  
  balance: number;
  totalTrades: number;
  winCount: number;
  lossCount: number;
  winRate: number;
  totalPnl: number;
  avgRMultiple: number;
  
  openPosition: (data: Omit<PaperPosition, 'id' | 'status' | 'entryTime'>) => string;
  closePosition: (id: string, exitPrice: number, exitReason: PaperPosition['exitReason']) => void;
  closePositionWithScenario: (
    id: string, 
    exitPrice: number, 
    exitReason: PaperPosition['exitReason'],
    actualScenario: 'A' | 'B' | 'C' | 'D',
    actualScenarioName: string,
    scenarioNotes: string
  ) => void;
  updatePosition: (id: string, updates: { stopLoss?: number; target1?: number; target2?: number; target3?: number }) => void;
  getOpenPosition: (battleCardId: string) => PaperPosition | undefined;
  getOpenPositions: () => PaperPosition[];
  addJournalNote: (entryId: string, note: string) => void;
  updateSettings: (settings: Partial<PaperTradingSettings>) => void;
  calculateLivePnl: (position: PaperPosition, currentPrice: number) => { 
    pnl: number; 
    pnlPercent: number; 
    rMultiple: number;
    leverage: number;
  };
  recalculateStats: () => void;
  resetAccount: () => void;
}

function formatHoldingPeriod(entryTime: Date, exitTime: Date): string {
  const ms = new Date(exitTime).getTime() - new Date(entryTime).getTime();
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
  }
  return `${hours}h ${minutes}m`;
}

export const usePaperTradingStore = create<PaperTradingState>()(
  persist(
    (set, get) => ({
      positions: [],
      journal: [],
      settings: {
        enabled: true,
        defaultSize: 100,
        leverage: 10,
        autoExecuteOnTrigger: true,
        autoExitOnTarget: true,
        autoExitOnStop: true,
        soundAlerts: true,
        startingBalance: 10000,
      },
      
      balance: 10000,
      totalTrades: 0,
      winCount: 0,
      lossCount: 0,
      winRate: 0,
      totalPnl: 0,
      avgRMultiple: 0,

      openPosition: (data) => {
        const id = generateId();
        const position: PaperPosition = {
          ...data,
          id,
          status: 'open',
          entryTime: new Date(),
        };
        
        set((state) => ({
          positions: [...state.positions, position],
        }));
        
        return id;
      },

      closePosition: (id, exitPrice, exitReason) => {
        const state = get();
        const position = state.positions.find(p => p.id === id);
        if (!position || position.status === 'closed') return;
        
        const { pnl, pnlPercent, rMultiple, leverage } = state.calculateLivePnl(position, exitPrice);
        const exitTime = new Date();
        
        let outcome: 'win' | 'loss' | 'breakeven' = 'breakeven';
        if (pnl > 0) outcome = 'win';
        else if (pnl < 0) outcome = 'loss';
        
        const journalEntry: JournalEntry = {
          id: generateId(),
          date: exitTime,
          instrument: position.instrument,
          timeframe: position.timeframe,
          direction: position.direction,
          scenarioType: position.scenarioType,
          scenarioName: position.scenarioName,
          thesis: position.thesis,
          entryPrice: position.entryPrice,
          exitPrice: exitPrice,
          stopLoss: position.stopLoss,
          target: position.target1,
          size: position.size,
          leverage,
          outcome,
          pnl,
          pnlPercent,
          rMultiple,
          entryTime: position.entryTime,
          exitTime,
          holdingPeriod: formatHoldingPeriod(position.entryTime, exitTime),
          exitReason: exitReason === 'stop_hit' ? 'Stop Loss Hit' :
                      exitReason === 'target1_hit' ? 'Target 1 Hit' :
                      exitReason === 'target2_hit' ? 'Target 2 Hit' :
                      exitReason === 'target3_hit' ? 'Target 3 Hit' : 
                      exitReason === 'invalidation' ? 'Setup Invalidated' : 'Manual Close',
        };
        
        const updatedPositions = state.positions.map(p => 
          p.id === id
            ? {
                ...p,
                status: 'closed' as const,
                exitPrice,
                exitTime,
                exitReason,
                realizedPnl: pnl,
                realizedPnlPercent: pnlPercent,
                rMultiple,
              }
            : p
        );
        
        set({
          positions: updatedPositions,
          journal: [journalEntry, ...state.journal],
        });
        
        get().recalculateStats();
      },

      closePositionWithScenario: (id, exitPrice, exitReason, actualScenario, actualScenarioName, scenarioNotes) => {
        const state = get();
        const position = state.positions.find(p => p.id === id);
        if (!position || position.status === 'closed') return;
        
        const { pnl, pnlPercent, rMultiple, leverage } = state.calculateLivePnl(position, exitPrice);
        const exitTime = new Date();
        
        let outcome: 'win' | 'loss' | 'breakeven' = 'breakeven';
        if (pnl > 0) outcome = 'win';
        else if (pnl < 0) outcome = 'loss';
        
        // Determine exit reason text based on which scenario played out
        let exitReasonText = '';
        if (actualScenario === 'D') {
          exitReasonText = `🚫 Scenario D: ${actualScenarioName}`;
        } else if (actualScenario === 'C') {
          exitReasonText = `⚡ Scenario C: ${actualScenarioName}`;
        } else if (exitReason === 'target1_hit') {
          exitReasonText = `🎯 Target Hit - Scenario ${actualScenario}: ${actualScenarioName}`;
        } else if (exitReason === 'stop_hit') {
          exitReasonText = `🛑 Stop Hit`;
        } else {
          exitReasonText = exitReason === 'invalidation' ? 'Setup Invalidated' : 'Manual Close';
        }
        
        const journalEntry: JournalEntry = {
          id: generateId(),
          date: exitTime,
          instrument: position.instrument,
          timeframe: position.timeframe,
          direction: position.direction,
          scenarioType: position.scenarioType, // Original entry scenario
          scenarioName: position.scenarioName,
          thesis: position.thesis,
          entryPrice: position.entryPrice,
          exitPrice: exitPrice,
          stopLoss: position.stopLoss,
          target: position.target1,
          size: position.size,
          leverage,
          outcome,
          pnl,
          pnlPercent,
          rMultiple,
          entryTime: position.entryTime,
          exitTime,
          holdingPeriod: formatHoldingPeriod(position.entryTime, exitTime),
          exitReason: exitReasonText,
          actualScenario,
          actualScenarioName,
          scenarioNotes,
        };
        
        const updatedPositions = state.positions.map(p => 
          p.id === id
            ? {
                ...p,
                status: 'closed' as const,
                exitPrice,
                exitTime,
                exitReason,
                realizedPnl: pnl,
                realizedPnlPercent: pnlPercent,
                rMultiple,
              }
            : p
        );
        
        set({
          positions: updatedPositions,
          journal: [journalEntry, ...state.journal],
        });
        
        get().recalculateStats();
      },

      getOpenPosition: (battleCardId) => {
        return get().positions.find(p => p.battleCardId === battleCardId && p.status === 'open');
      },

      getOpenPositions: () => {
        return get().positions.filter(p => p.status === 'open');
      },

      updatePosition: (id, updates) => {
        set((state) => ({
          positions: state.positions.map(p => 
            p.id === id ? { ...p, ...updates } : p
          ),
        }));
      },

      addJournalNote: (entryId, note) => {
        set((state) => ({
          journal: state.journal.map(j => 
            j.id === entryId ? { ...j, lessonsLearned: note } : j
          ),
        }));
      },

      updateSettings: (newSettings) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        }));
      },

      calculateLivePnl: (position, currentPrice) => {
        const { settings } = get();
        const leverage = settings.leverage || 1;
        
        const priceDiff = currentPrice - position.entryPrice;
        const pnlPercent = (priceDiff / position.entryPrice) * 100;
        
        const multiplier = position.direction === 'long' ? 1 : -1;
        const adjustedPnlPercent = pnlPercent * multiplier;
        
        // Apply leverage to P&L
        const leveragedPnlPercent = adjustedPnlPercent * leverage;
        const pnl = (position.size * leveragedPnlPercent) / 100;
        
        const riskAmount = Math.abs(position.entryPrice - position.stopLoss);
        const riskPercent = (riskAmount / position.entryPrice) * 100;
        const rMultiple = riskPercent > 0 ? adjustedPnlPercent / riskPercent : 0;
        
        return { pnl, pnlPercent: leveragedPnlPercent, rMultiple, leverage };
      },

      recalculateStats: () => {
        const state = get();
        const closedPositions = state.positions.filter(p => p.status === 'closed');
        
        const winCount = closedPositions.filter(p => (p.realizedPnl || 0) > 0).length;
        const lossCount = closedPositions.filter(p => (p.realizedPnl || 0) < 0).length;
        const totalTrades = closedPositions.length;
        const winRate = totalTrades > 0 ? (winCount / totalTrades) * 100 : 0;
        const totalPnl = closedPositions.reduce((sum, p) => sum + (p.realizedPnl || 0), 0);
        const avgRMultiple = totalTrades > 0 
          ? closedPositions.reduce((sum, p) => sum + (p.rMultiple || 0), 0) / totalTrades 
          : 0;
        const balance = state.settings.startingBalance + totalPnl;
        
        set({
          balance,
          totalTrades,
          winCount,
          lossCount,
          winRate,
          totalPnl,
          avgRMultiple,
        });
      },

      resetAccount: () => {
        const startingBalance = get().settings.startingBalance;
        set({
          positions: [],
          journal: [],
          balance: startingBalance,
          totalTrades: 0,
          winCount: 0,
          lossCount: 0,
          winRate: 0,
          totalPnl: 0,
          avgRMultiple: 0,
        });
      },
    }),
    {
      name: 'paper-trading-storage',
      onRehydrateStorage: () => (state) => {
        // Recalculate stats when loading from localStorage
        if (state) {
          setTimeout(() => {
            state.recalculateStats();
          }, 0);
        }
      },
    }
  )
);
