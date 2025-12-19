// Core Types for Scenario Trading Mentor

// ============ ENUMS ============

export type ScenarioType = 'A' | 'B' | 'C' | 'D';

export type BattleCardStatus = 'draft' | 'active' | 'monitoring' | 'closed' | 'completed' | 'archived';

export type AIMode = 'builder' | 'challenger' | 'coach' | 'debrief';

export type TradeSide = 'long' | 'short';

export type EmotionalState = 'calm' | 'focused' | 'anxious' | 'fomo' | 'revenge' | 'overconfident' | 'fearful';

export type VolatilityRegime = 'expansion' | 'contraction' | 'transition';

export type Timeframe = '1m' | '5m' | '15m' | '30m' | '1H' | '4H' | '1D' | '1W';

// ============ MARKET DATA ============

export interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  timestamp: number;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OrderBookLevel {
  price: number;
  quantity: number;
}

export interface OrderBook {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  timestamp: number;
}

// ============ SPIN ANALYSIS ============

export interface SpinAnalysis {
  id: string;
  battleCardId: string;
  
  // Situation
  htfTrend: string;
  volatilityRegime: VolatilityRegime;
  keyLevels: KeyLevel[];
  sessionContext: string;
  
  // Problem
  priceStuck: string;
  failedTests: string;
  effortVsResult: string;
  trappedWho: string;
  
  // Implication
  cascadeIfBreaks: string;
  stopClusters: string;
  forcedActions: string;
  nextDecision: string;
  
  // Need-Payoff
  rrRatio: number;
  positionSize: number;
  edgeDefinition: string;
  worthRisk: boolean;
}

export interface KeyLevel {
  price: number;
  type: 'support' | 'resistance' | 'pivot' | 'liquidation';
  strength: 'weak' | 'moderate' | 'strong';
  label?: string;
}

// ============ SCENARIO ============

export interface Scenario {
  id: string;
  battleCardId: string;
  type: ScenarioType;
  name: string;
  description: string;
  
  // Trigger
  triggerPrice: number | null;
  triggerCondition: string;
  
  // Trade params
  entryPrice: number | null;
  stopLoss: number | null;
  target1: number | null;
  target2: number | null;
  target3: number | null;
  positionSize: number | null;
  
  // For invalidation
  invalidationReason: string | null;
  lessonPrompt: string | null;
  
  // Status
  probability: number;
  isActive: boolean;
  triggeredAt: Date | null;
  
  // Cascade
  parentId: string | null;
  children: Scenario[];
}

export interface ScenarioConfig {
  type: ScenarioType;
  color: string;
  name: string;
  icon: string;
  description: string;
}

export const SCENARIO_CONFIGS: Record<ScenarioType, ScenarioConfig> = {
  A: {
    type: 'A',
    color: '#10b981',
    name: 'Primary',
    icon: '🎯',
    description: 'Highest probability scenario'
  },
  B: {
    type: 'B', 
    color: '#3b82f6',
    name: 'Secondary',
    icon: '🔄',
    description: 'Alternative path'
  },
  C: {
    type: 'C',
    color: '#f59e0b', 
    name: 'Chaos',
    icon: '⚡',
    description: 'Unexpected scenario'
  },
  D: {
    type: 'D',
    color: '#ef4444',
    name: 'Invalidation',
    icon: '🚫',
    description: 'Setup is dead'
  }
};

// ============ BATTLE CARD ============

export interface BattleCard {
  id: string;
  userId: string;
  
  // Setup
  instrument: string;
  timeframe: Timeframe;
  chartSnapshot: string | null;
  setupType: string;
  
  // Thesis
  thesis: string;
  narrative: string;
  contradiction: string;
  trappedParticipants: string;
  challengerScore: number;
  
  // Analysis
  spinAnalysis: SpinAnalysis | null;
  scenarios: Scenario[];
  
  // Status
  status: BattleCardStatus;
  activeScenario: string | null;
  
  // Re-assessment tracking
  lastTechnicalReassess?: Date | null;
  lastAIReassess?: Date | null;
  reassessmentNotes?: string;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  closedAt: Date | null;
}

export interface BattleCardSummary {
  id: string;
  instrument: string;
  timeframe: Timeframe;
  thesis: string;
  challengerScore: number;
  status: BattleCardStatus;
  scenarios: {
    type: ScenarioType;
    probability: number;
    isActive: boolean;
  }[];
  currentPrice?: number;
  proximityToTrigger?: number;
  createdAt: Date;
}

// ============ AI MENTOR ============

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    mode: AIMode;
    insights?: string[];
    suggestions?: string[];
    challengePoints?: string[];
  };
}

export interface AISession {
  id: string;
  mode: AIMode;
  battleCardId?: string;
  messages: AIMessage[];
  createdAt: Date;
}

export interface ChallengerResponse {
  challenge: string;
  weakPoints: string[];
  questions: string[];
  alternativePerspective: string;
  riskWarnings: string[];
}

// ============ TRADE ============

export interface Trade {
  id: string;
  battleCardId: string;
  scenarioId: string | null;
  
  entryPrice: number;
  exitPrice: number | null;
  quantity: number;
  side: TradeSide;
  
  pnl: number | null;
  pnlPercent: number | null;
  fees: number | null;
  
  followedPlan: boolean | null;
  emotionalState: EmotionalState | null;
  lessonsLearned: string | null;
  
  enteredAt: Date;
  exitedAt: Date | null;
}

// ============ PATTERN ============

export interface Pattern {
  id: string;
  userId: string;
  name: string;
  description: string;
  setupType: string;
  timeframes: Timeframe[];
  
  occurrences: number;
  winRate: number;
  avgRR: number;
  
  chartExample: string | null;
  
  createdAt: Date;
  updatedAt: Date;
}

// ============ ANALYTICS ============

export interface PerformanceMetrics {
  totalTrades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  avgRR: number;
  
  scenarioAccuracy: {
    A: number;
    B: number;
    C: number;
    D: number;
  };
  
  processCompliance: number;
  challengerCorrelation: number;
}

export interface DailyStats {
  date: string;
  trades: number;
  pnl: number;
  winRate: number;
  battleCardsCreated: number;
  avgChallengerScore: number;
}

// ============ UI STATE ============

export interface AppState {
  // Current view
  activeView: 'dashboard' | 'battle-card' | 'journal' | 'chat' | 'settings';
  
  // Battle card editor
  currentBattleCard: BattleCard | null;
  editingStep: 'capture' | 'spin' | 'challenger' | 'scenarios' | 'review';
  
  // AI
  aiMode: AIMode;
  aiSession: AISession | null;
  
  // Market data
  watchlist: string[];
  activePrices: Record<string, PriceData>;
  
  // Notifications
  alerts: Alert[];
}

export interface Alert {
  id: string;
  type: 'info' | 'success' | 'warning' | 'danger';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

// ============ CHART ANNOTATIONS ============

export interface ChartAnnotation {
  id: string;
  type: 'scenario-zone' | 'entry-line' | 'stop-line' | 'target-line' | 'label';
  scenarioType?: ScenarioType;
  price?: number;
  priceStart?: number;
  priceEnd?: number;
  timeStart?: number;
  timeEnd?: number;
  label?: string;
  color: string;
  style?: 'solid' | 'dashed' | 'dotted';
}

// ============ WEBSOCKET ============

export interface WSMessage {
  type: 'price' | 'orderbook' | 'trade' | 'alert' | 'scenario-trigger';
  data: any;
  timestamp: number;
}

export interface WSSubscription {
  channel: string;
  symbol: string;
}
