'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Target, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Trash2,
  Zap,
  Eye,
  DollarSign,
  Activity,
  LogOut,
  Edit3,
  Brain,
  AlertCircle
} from 'lucide-react';
import { useBattleCardStore, useMarketDataStore } from '@/lib/stores';
import { usePaperTradingStore } from '@/lib/stores/paperTradingStore';
import { usePriceMonitor } from '@/lib/hooks/usePriceMonitor';
import { cn, getScenarioColor, formatPrice, timeAgo } from '@/lib/utils/helpers';
import { TradingChart } from '@/components/charts/TradingChart';
import type { BattleCard, Scenario } from '@/types';

// AI reassessment cooldown
const AI_REASSESS_COOLDOWN = 15 * 60 * 1000; // 15 minutes

interface LiveBattleCardProps {
  card: BattleCard;
  onClose?: () => void;
}

export function LiveBattleCard({ card, onClose }: LiveBattleCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [showChart, setShowChart] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'exit' | 'delete' | null>(null);
  const [editingPosition, setEditingPosition] = useState(false);
  const [editStopLoss, setEditStopLoss] = useState<string>('');
  const [editTarget, setEditTarget] = useState<string>('');
  
  // Re-assessment state (AI only)
  const [isAIReassessing, setIsAIReassessing] = useState(false);
  const [reassessmentResult, setReassessmentResult] = useState<string | null>(null);
  const [aiCooldown, setAICooldown] = useState(0);
  
  const { updateBattleCard, deleteBattleCard } = useBattleCardStore();
  const prices = useMarketDataStore(state => state.prices);
  const { getCardTriggerStatus, getClosestScenario } = usePriceMonitor();
  
  // Paper trading
  const getOpenPosition = usePaperTradingStore(state => state.getOpenPosition);
  const closePosition = usePaperTradingStore(state => state.closePosition);
  const calculateLivePnl = usePaperTradingStore(state => state.calculateLivePnl);
  const updatePosition = usePaperTradingStore(state => state.updatePosition);

  const symbol = card.instrument.replace('/USDT', 'USDT').replace('/', '');
  const currentPrice = prices[symbol]?.price;
  const priceChange = prices[symbol]?.changePercent24h;
  
  const triggerStatuses = getCardTriggerStatus(card);
  const closestScenario = getClosestScenario(card);
  
  // Get active paper position for this card
  const position = getOpenPosition(card.id);
  const livePnl = position && currentPrice 
    ? calculateLivePnl(position, currentPrice)
    : null;

  // Check if position is on highest probability scenario
  const highestProbScenario = card.scenarios?.reduce((highest, current) => 
    (current.probability > highest.probability) ? current : highest
  , card.scenarios[0]);
  const isNonPrimaryTrigger = position && highestProbScenario && 
    position.scenarioType !== highestProbScenario.type;

  // Calculate AI cooldown
  useEffect(() => {
    const updateCooldowns = () => {
      const now = Date.now();
      
      // AI cooldown only
      if (card.lastAIReassess) {
        const aiElapsed = now - new Date(card.lastAIReassess).getTime();
        const aiRemaining = Math.max(0, AI_REASSESS_COOLDOWN - aiElapsed);
        setAICooldown(aiRemaining);
      } else {
        setAICooldown(0);
      }
    };
    
    updateCooldowns();
    const interval = setInterval(updateCooldowns, 1000);
    return () => clearInterval(interval);
  }, [card.lastAIReassess]);

  // AI Reassessment - Deep analysis with AI (calls Anthropic directly)
  const runAIReassessment = useCallback(async () => {
    if (!currentPrice || aiCooldown > 0) return;
    
    const apiKey = localStorage.getItem('anthropic_api_key');
    if (!apiKey) {
      setReassessmentResult('⚠️ Add API key in Settings for AI analysis');
      return;
    }
    
    setIsAIReassessing(true);
    setReassessmentResult(null);
    
    try {
      // Fetch fresh market data for context
      const interval = card.timeframe === '4H' ? '4h' : card.timeframe.toLowerCase();
      const [tickerRes, klinesRes] = await Promise.all([
        fetch(`/api/market?symbol=${symbol}&type=ticker`),
        fetch(`/api/market?symbol=${symbol}&type=klines&interval=${interval}&limit=20`)
      ]);
      
      const tickerData = await tickerRes.json();
      const klines = await klinesRes.json();
      
      // Calculate recent price action summary
      let priceContext = '';
      if (Array.isArray(klines) && klines.length > 0) {
        const highs = klines.map((c: any) => c.high);
        const lows = klines.map((c: any) => c.low);
        priceContext = `Recent ${klines.length} candles: High $${formatPrice(Math.max(...highs))}, Low $${formatPrice(Math.min(...lows))}`;
      }
      
      // Prepare scenario summary
      const scenarioSummary = card.scenarios.map(s => 
        `${s.type} (${s.name}): Entry $${s.entryPrice ? formatPrice(s.entryPrice) : 'N/A'}, ` +
        `TP $${s.target1 ? formatPrice(s.target1) : 'N/A'}, SL $${s.stopLoss ? formatPrice(s.stopLoss) : 'N/A'}, Prob ${s.probability}%`
      ).join('\n');
      
      // Call server API route (avoids CORS)
      const response = await fetch('/api/ai/reassess', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey,
          instrument: card.instrument,
          timeframe: card.timeframe,
          currentPrice: formatPrice(currentPrice),
          change24h: tickerData.changePercent24h?.toFixed(2),
          priceContext,
          thesis: card.thesis,
          scenarios: scenarioSummary
        })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'API request failed');
      }
      
      const analysis = data.analysis || 'No response from AI';
      
      // Update card with AI reassessment
      updateBattleCard(card.id, {
        lastAIReassess: new Date(),
        reassessmentNotes: analysis
      });
      
      setReassessmentResult(analysis);
    } catch (error) {
      console.error('AI reassessment error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setReassessmentResult(`❌ AI analysis failed: ${errorMsg}`);
    } finally {
      setIsAIReassessing(false);
    }
  }, [card, currentPrice, symbol, aiCooldown, updateBattleCard]);

  // Format cooldown time
  const formatCooldown = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getStatusColor = () => {
    if (position) return 'border-accent shadow-accent/20 shadow-lg'; // Has position
    if (!closestScenario) return 'border-border';
    switch (closestScenario.status) {
      case 'at_trigger': return 'border-success shadow-success/20 shadow-lg';
      case 'approaching': return 'border-warning shadow-warning/10 shadow-md';
      default: return 'border-border';
    }
  };

  const handleCloseCard = (outcome: 'completed' | 'closed') => {
    // If has position, close it first
    if (position && currentPrice) {
      closePosition(position.id, currentPrice, 'manual');
    }
    updateBattleCard(card.id, { status: outcome });
    setConfirmAction(null);
    onClose?.();
  };

  const handleDeleteCard = () => {
    if (position && currentPrice) {
      closePosition(position.id, currentPrice, 'manual');
    }
    deleteBattleCard(card.id);
    setConfirmAction(null);
  };

  // Update scenario levels (Entry, TP, SL)
  const handleUpdateScenario = (scenarioType: string, updates: { entryPrice?: number; target1?: number; stopLoss?: number }) => {
    const updatedScenarios = card.scenarios.map(s => 
      s.type === scenarioType ? { ...s, ...updates } : s
    );
    updateBattleCard(card.id, { scenarios: updatedScenarios });
  };

  return (
    <div 
      className={cn(
        'rounded-xl border-2 transition-all duration-300 p-3 md:p-4 overflow-hidden w-full max-w-full',
        getStatusColor()
      )}
      style={{ backgroundColor: '#080810' }}
    >
      {/* Header */}
      <div className="overflow-hidden">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1 overflow-hidden">
            <div className={cn(
              'w-9 h-9 md:w-12 md:h-12 rounded-xl flex items-center justify-center flex-shrink-0',
              position 
                ? 'bg-accent/20' 
                : closestScenario?.status === 'at_trigger' 
                  ? 'bg-success/20 animate-pulse' 
                  : closestScenario?.status === 'approaching'
                    ? 'bg-warning/20'
                    : 'bg-accent/10'
            )}>
              {position ? (
                <Activity className="w-5 h-5 md:w-6 md:h-6 text-accent" />
              ) : (
                <Target className={cn(
                  'w-5 h-5 md:w-6 md:h-6',
                  closestScenario?.status === 'at_trigger' ? 'text-success' 
                  : closestScenario?.status === 'approaching' ? 'text-warning'
                  : 'text-accent'
                )} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
                <h3 className="font-bold text-base md:text-lg text-foreground">{card.instrument}</h3>
                <span className="text-xs md:text-sm text-foreground-muted">{card.timeframe}</span>
                {position && (
                  <span className={cn(
                    'badge text-[10px] md:text-xs',
                    position.direction === 'long' ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'
                  )}>
                    {position.direction.toUpperCase()}
                  </span>
                )}
              </div>
              {card.thesis && (
                <p className="text-xs md:text-sm text-foreground-secondary mt-1 line-clamp-2">
                  <span className="text-accent font-medium">Thesis:</span> {card.thesis}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
            {/* Live Price */}
            {currentPrice && (
              <div className="text-right">
                <p className="font-mono font-bold text-sm md:text-lg text-foreground">
                  ${formatPrice(currentPrice)}
                </p>
                {priceChange !== undefined && (
                  <p className={cn(
                    'text-[10px] md:text-xs font-mono',
                    priceChange >= 0 ? 'text-success' : 'text-danger'
                  )}>
                    {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                  </p>
                )}
              </div>
            )}
            
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 md:p-2 hover:bg-background-tertiary rounded-lg transition-colors"
            >
              {expanded ? (
                <ChevronUp className="w-4 h-4 md:w-5 md:h-5 text-foreground-muted" />
              ) : (
                <ChevronDown className="w-4 h-4 md:w-5 md:h-5 text-foreground-muted" />
              )}
            </button>
          </div>
        </div>

        {/* RE-ASSESSMENT PANEL - Only show when no position */}
        {!position && expanded && (
          <div className="mt-3 md:mt-4 p-2 md:p-3 rounded-xl border border-border/50 bg-background-secondary/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-400" />
                <span className="text-xs md:text-sm font-medium text-foreground">Setup Validation</span>
                {card.lastAIReassess && (
                  <span className="text-[10px] md:text-xs text-foreground-muted">
                    {timeAgo(new Date(card.lastAIReassess))}
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {/* AI Reassess Button */}
                <button
                  onClick={runAIReassessment}
                  disabled={isAIReassessing || aiCooldown > 0}
                  className={cn(
                    'btn btn-xs flex items-center gap-1.5',
                    aiCooldown > 0 
                      ? 'btn-secondary opacity-60' 
                      : 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
                  )}
                  title={aiCooldown > 0 ? `Available in ${formatCooldown(aiCooldown)}` : 'AI-powered analysis (15min cooldown)'}
                >
                  <Brain className={cn('w-3.5 h-3.5', isAIReassessing && 'animate-pulse')} />
                  <span className="hidden sm:inline">{isAIReassessing ? 'Analyzing...' : aiCooldown > 0 ? formatCooldown(aiCooldown) : 'AI Reassess'}</span>
                  <span className="sm:hidden">{isAIReassessing ? '...' : aiCooldown > 0 ? formatCooldown(aiCooldown) : 'Reassess'}</span>
                </button>
              </div>
            </div>
            
            {/* Reassessment Result */}
            {reassessmentResult && (
              <div className={cn(
                'mt-2 p-2 rounded-lg text-[10px] md:text-xs',
                reassessmentResult.includes('❌') || reassessmentResult.includes('INVALIDATE')
                  ? 'bg-danger/10 border border-danger/30 text-danger'
                  : reassessmentResult.includes('⚠️') || reassessmentResult.includes('ADJUST')
                    ? 'bg-warning/10 border border-warning/30 text-warning'
                    : 'bg-success/10 border border-success/30 text-success'
              )}>
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0 mt-0.5" />
                  <p className="leading-relaxed whitespace-pre-wrap">{reassessmentResult}</p>
                </div>
              </div>
            )}
            
            {/* Show stored notes if available and no fresh result */}
            {!reassessmentResult && card.reassessmentNotes && (
              <div className="mt-2 p-2 rounded-lg bg-background-tertiary/50 text-[10px] md:text-xs text-foreground-secondary">
                <p className="leading-relaxed whitespace-pre-wrap">{card.reassessmentNotes}</p>
              </div>
            )}
          </div>
        )}

        {/* POSITION STATUS BANNER */}
        {position && livePnl && (
          <div className={cn(
            'mt-3 md:mt-4 p-3 md:p-4 rounded-xl border',
            livePnl.pnl >= 0 
              ? 'bg-success/10 border-success/30' 
              : 'bg-danger/10 border-danger/30'
          )}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-start md:items-center gap-2 md:gap-3">
                <DollarSign className={cn(
                  'w-5 h-5 md:w-6 md:h-6 flex-shrink-0',
                  livePnl.pnl >= 0 ? 'text-success' : 'text-danger'
                )} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
                    <p className="text-xs md:text-sm font-medium text-foreground">Open Position</p>
                    <span 
                      className="text-[10px] md:text-xs font-bold px-1.5 md:px-2 py-0.5 rounded"
                      style={{ 
                        backgroundColor: `${getScenarioColor(position.scenarioType)}20`,
                        color: getScenarioColor(position.scenarioType)
                      }}
                    >
                      {position.scenarioType}
                    </span>
                    <span className={cn(
                      'text-[10px] md:text-xs font-semibold px-1.5 md:px-2 py-0.5 rounded',
                      position.direction === 'long' 
                        ? 'bg-success/20 text-success' 
                        : 'bg-danger/20 text-danger'
                    )}>
                      {position.direction === 'long' ? '↑ LONG' : '↓ SHORT'}
                    </span>
                    {livePnl.leverage > 1 && (
                      <span className="text-[10px] md:text-xs font-bold px-1.5 md:px-2 py-0.5 rounded bg-warning/20 text-warning">
                        {livePnl.leverage}x
                      </span>
                    )}
                  </div>
                  <p className="text-xs md:text-sm text-foreground-secondary mt-0.5 truncate">
                    {position.scenarioName}
                  </p>
                  <p className="text-[10px] md:text-xs text-foreground-muted">
                    Entry: ${formatPrice(position.entryPrice)} | Size: ${position.size}
                  </p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className={cn(
                  'font-mono font-bold text-lg md:text-xl',
                  livePnl.pnl >= 0 ? 'text-success' : 'text-danger'
                )}>
                  {livePnl.pnl >= 0 ? '+' : ''}${livePnl.pnl.toFixed(2)}
                </p>
                <p className={cn(
                  'text-xs md:text-sm font-mono',
                  livePnl.pnl >= 0 ? 'text-success' : 'text-danger'
                )}>
                  {livePnl.pnlPercent >= 0 ? '+' : ''}{livePnl.pnlPercent.toFixed(2)}% | {livePnl.rMultiple >= 0 ? '+' : ''}{livePnl.rMultiple.toFixed(1)}R
                </p>
              </div>
            </div>
            
            {/* Professional Stop/Target Display */}
            <div className="mt-3 relative">
              {/* Visual Bar */}
              <div className="h-8 flex items-center relative">
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-gradient-to-r from-danger via-foreground-muted/30 to-success" />
                {/* Current position indicator */}
                <div 
                  className="absolute top-1/2 -translate-y-1/2 z-10"
                  style={{
                    left: `${Math.min(95, Math.max(5, ((currentPrice - position.stopLoss) / (position.target1 - position.stopLoss)) * 100))}%`
                  }}
                >
                  <div className="w-3 h-3 rounded-full bg-accent ring-2 ring-background shadow-lg shadow-accent/40" />
                </div>
              </div>
              
              {/* Labels / Edit Mode */}
              {editingPosition ? (
                <div className="mt-2 p-3 bg-background-tertiary rounded-lg">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="flex-1">
                      <label className="text-[10px] text-danger font-medium mb-1 block">STOP LOSS</label>
                      <input
                        type="number"
                        step="any"
                        value={editStopLoss}
                        onChange={(e) => setEditStopLoss(e.target.value)}
                        className="input input-sm w-full font-mono text-sm"
                        placeholder={formatPrice(position.stopLoss)}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] text-success font-medium mb-1 block">TARGET</label>
                      <input
                        type="number"
                        step="any"
                        value={editTarget}
                        onChange={(e) => setEditTarget(e.target.value)}
                        className="input input-sm w-full font-mono text-sm"
                        placeholder={formatPrice(position.target1)}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => {
                        setEditingPosition(false);
                        setEditStopLoss('');
                        setEditTarget('');
                      }}
                      className="btn btn-xs btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        const updates: { stopLoss?: number; target1?: number } = {};
                        if (editStopLoss && !isNaN(parseFloat(editStopLoss))) {
                          updates.stopLoss = parseFloat(editStopLoss);
                        }
                        if (editTarget && !isNaN(parseFloat(editTarget))) {
                          updates.target1 = parseFloat(editTarget);
                        }
                        if (Object.keys(updates).length > 0) {
                          updatePosition(position.id, updates);
                        }
                        setEditingPosition(false);
                        setEditStopLoss('');
                        setEditTarget('');
                      }}
                      className="btn btn-xs btn-primary"
                    >
                      <Check className="w-3 h-3" />
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-start mt-1">
                  <div className="text-left">
                    <p className="text-[10px] text-danger font-medium">STOP LOSS</p>
                    <p className="font-mono text-sm font-bold text-danger">${formatPrice(position.stopLoss)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-foreground-muted font-medium">CURRENT</p>
                    <p className="font-mono text-sm font-bold text-accent">${formatPrice(currentPrice)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-success font-medium">TARGET</p>
                    <p className="font-mono text-sm font-bold text-success">${formatPrice(position.target1)}</p>
                  </div>
                  <button
                    onClick={() => {
                      setEditStopLoss(position.stopLoss.toString());
                      setEditTarget(position.target1.toString());
                      setEditingPosition(true);
                    }}
                    className="ml-2 p-1.5 rounded-lg hover:bg-background-tertiary text-foreground-muted hover:text-foreground transition-colors"
                    title="Edit Stop Loss & Target"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
            
            {/* Warning for non-primary scenario trigger */}
            {isNonPrimaryTrigger && highestProbScenario && (
              <div className="mt-3 p-2 bg-warning/10 border border-warning/30 rounded-lg">
                <p className="text-xs text-warning flex items-center gap-1">
                  <span>⚠️</span>
                  <span>
                    Scenario {position.scenarioType} triggered ({position.scenarioName}) — 
                    Primary Scenario {highestProbScenario.type} ({highestProbScenario.probability}%) still available
                  </span>
                </p>
              </div>
            )}
          </div>
        )}

        {/* TRIGGER ALERT (when no position yet) */}
        {!position && closestScenario && closestScenario.status !== 'far' && (
          <div className={cn(
            'mt-3 md:mt-4 p-2 md:p-3 rounded-xl flex items-center gap-2 md:gap-3 overflow-hidden',
            closestScenario.status === 'at_trigger' 
              ? 'bg-success/10 border border-success/30' 
              : 'bg-warning/10 border border-warning/30'
          )}>
            <Zap className={cn(
              'w-4 h-4 md:w-5 md:h-5 flex-shrink-0',
              closestScenario.status === 'at_trigger' ? 'text-success' : 'text-warning'
            )} />
            <div className="flex-1 min-w-0">
              <p className={cn(
                'font-medium text-xs md:text-sm truncate',
                closestScenario.status === 'at_trigger' ? 'text-success' : 'text-warning'
              )}>
                {closestScenario.status === 'at_trigger' 
                  ? `🎯 SCENARIO ${closestScenario.scenario.type} - ENTRY!`
                  : `⚡ SCENARIO ${closestScenario.scenario.type} - ${closestScenario.distance.toFixed(1)}% away`
                }
              </p>
              <p className="text-[10px] md:text-xs text-foreground-muted truncate">{closestScenario.message}</p>
            </div>
          </div>
        )}
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-border overflow-hidden">
          {/* Primary Scenarios (A & B) */}
          <div className="p-3 md:p-4 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            {triggerStatuses
              .filter(({ scenario }) => scenario.type === 'A' || scenario.type === 'B')
              .map(({ scenario, status, distance }) => (
                <ScenarioStatusCard
                  key={scenario.type}
                  scenario={scenario}
                  status={status}
                  distance={distance}
                  currentPrice={currentPrice}
                  isActiveScenario={position?.scenarioType === scenario.type}
                  canEdit={!position}
                  onUpdateScenario={handleUpdateScenario}
                />
              ))}
          </div>
          
          {/* Secondary Scenarios (C & D) - Compact Row */}
          {triggerStatuses.some(({ scenario }) => scenario.type === 'C' || scenario.type === 'D') && (
            <div className="px-3 md:px-4 pb-3 overflow-hidden">
              <div className="flex items-center gap-2 p-2 bg-background-tertiary/50 rounded-lg overflow-x-auto">
                <span className="text-[10px] md:text-xs text-foreground-muted flex-shrink-0">Alt:</span>
                {triggerStatuses
                  .filter(({ scenario }) => scenario.type === 'C' || scenario.type === 'D')
                  .map(({ scenario, status, distance }) => {
                    const color = getScenarioColor(scenario.type);
                    return (
                      <div 
                        key={scenario.type}
                        className="flex items-center gap-1.5 md:gap-2 px-2 py-1 md:py-1.5 rounded-md bg-background-tertiary flex-shrink-0"
                        style={{ borderLeft: `3px solid ${color}` }}
                      >
                        <span className="text-[10px] md:text-xs font-bold" style={{ color }}>{scenario.type}</span>
                        <span className="text-[10px] md:text-xs text-foreground-secondary max-w-[80px] md:max-w-none truncate">{scenario.name}</span>
                        <span className="text-[10px] md:text-xs text-foreground-muted">{scenario.probability}%</span>
                        {status !== 'far' && (
                          <span className={cn(
                            'text-[9px] md:text-[10px] px-1 py-0.5 rounded',
                            status === 'at_trigger' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
                          )}>
                            {distance.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Chart Toggle */}
          <div className="px-3 md:px-4 pb-4">
            <button
              onClick={() => setShowChart(!showChart)}
              className="w-full btn btn-secondary text-sm"
            >
              <Eye className="w-4 h-4" />
              {showChart ? 'Hide Chart' : 'Show Chart with Levels'}
            </button>
          </div>

          {/* Chart */}
          {showChart && (
            <div className="px-4 pb-4">
              <div className="rounded-xl overflow-hidden border border-border">
                <TradingChart
                  symbol={symbol}
                  interval={card.timeframe}
                  scenarios={card.scenarios}
                  height={300}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="p-4 bg-background-tertiary flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-foreground-muted">
              <Clock className="w-4 h-4" />
              <span>Created {timeAgo(new Date(card.createdAt))}</span>
            </div>

            {confirmAction ? (
              <div className="flex items-center gap-2 animate-fade-in">
                <span className="text-sm text-foreground-muted">
                  {confirmAction === 'exit' ? 'Exit trade?' : 'Delete card?'}
                </span>
                <button
                  onClick={() => {
                    if (confirmAction === 'exit') {
                      // Close position and determine outcome based on P&L
                      if (position && currentPrice) {
                        closePosition(position.id, currentPrice, 'manual');
                      }
                      // Mark card as completed or closed based on position P&L
                      const outcome = position && livePnl?.pnl && livePnl.pnl >= 0 ? 'completed' : 'closed';
                      updateBattleCard(card.id, { status: outcome });
                      setConfirmAction(null);
                      onClose?.();
                    } else {
                      handleDeleteCard();
                    }
                  }}
                  className={cn(
                    'btn btn-sm',
                    confirmAction === 'exit' ? 'bg-accent text-white' : 'bg-foreground-muted text-background'
                  )}
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setConfirmAction(null)}
                  className="btn btn-sm btn-secondary"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {position && (
                  <button
                    onClick={() => setConfirmAction('exit')}
                    className="btn btn-sm bg-accent/20 text-accent hover:bg-accent/30"
                  >
                    <LogOut className="w-4 h-4" />
                    Exit Trade
                  </button>
                )}
                <button
                  onClick={() => setConfirmAction('delete')}
                  className="btn btn-sm btn-secondary"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Scenario Status Card
interface ScenarioStatusCardProps {
  scenario: Scenario;
  status: 'far' | 'approaching' | 'at_trigger' | 'triggered';
  distance: number;
  currentPrice?: number;
  isActiveScenario?: boolean;
  canEdit?: boolean;
  onUpdateScenario?: (scenarioType: string, updates: { entryPrice?: number; target1?: number; stopLoss?: number }) => void;
}

function ScenarioStatusCard({ scenario, status, distance, currentPrice, isActiveScenario, canEdit, onUpdateScenario }: ScenarioStatusCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editEntry, setEditEntry] = useState('');
  const [editTarget, setEditTarget] = useState('');
  const [editStopLoss, setEditStopLoss] = useState('');
  
  const color = getScenarioColor(scenario.type);
  const isActive = status === 'at_trigger' || status === 'approaching';
  
  // Calculate direction from entry vs stop
  const direction = scenario.entryPrice && scenario.stopLoss
    ? (scenario.entryPrice > scenario.stopLoss ? 'long' : 'short')
    : null;
  
  const startEditing = () => {
    setEditEntry(scenario.entryPrice?.toString() || '');
    setEditTarget(scenario.target1?.toString() || '');
    setEditStopLoss(scenario.stopLoss?.toString() || '');
    setIsEditing(true);
  };
  
  const saveEdits = () => {
    if (onUpdateScenario) {
      const updates: { entryPrice?: number; target1?: number; stopLoss?: number } = {};
      if (editEntry && !isNaN(parseFloat(editEntry))) {
        updates.entryPrice = parseFloat(editEntry);
      }
      if (editTarget && !isNaN(parseFloat(editTarget))) {
        updates.target1 = parseFloat(editTarget);
      }
      if (editStopLoss && !isNaN(parseFloat(editStopLoss))) {
        updates.stopLoss = parseFloat(editStopLoss);
      }
      if (Object.keys(updates).length > 0) {
        onUpdateScenario(scenario.type, updates);
      }
    }
    setIsEditing(false);
  };
  
  const cancelEditing = () => {
    setIsEditing(false);
    setEditEntry('');
    setEditTarget('');
    setEditStopLoss('');
  };
  
  return (
    <div 
      className={cn(
        'p-2 md:p-3 rounded-xl border transition-all overflow-hidden',
        isActiveScenario && 'ring-2 ring-accent',
        status === 'at_trigger' && !isActiveScenario && 'ring-2 ring-success animate-pulse',
        status === 'approaching' && !isActiveScenario && 'ring-1 ring-warning'
      )}
      style={{ 
        backgroundColor: '#0a0a0e',
        borderColor: isActive ? color : `${color}40`
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 md:gap-2">
          <span 
            className="w-7 h-7 md:w-9 md:h-9 rounded-lg flex items-center justify-center font-bold text-white text-sm md:text-base flex-shrink-0"
            style={{ backgroundColor: color }}
          >
            {scenario.type}
          </span>
          {direction && (
            <span className={cn(
              'text-[10px] md:text-xs font-bold px-1 md:px-1.5 py-0.5 rounded',
              direction === 'long' 
                ? 'bg-success/20 text-success' 
                : 'bg-danger/20 text-danger'
            )}>
              {direction === 'long' ? '↑' : '↓'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canEdit && !isEditing && scenario.entryPrice && (
            <button
              onClick={startEditing}
              className="p-1 rounded hover:bg-background-tertiary text-foreground-muted hover:text-foreground transition-colors"
              title="Edit levels"
            >
              <Edit3 className="w-3 h-3 md:w-3.5 md:h-3.5" />
            </button>
          )}
          <span className="text-sm md:text-base font-bold" style={{ color }}>
            {scenario.probability}%
          </span>
        </div>
      </div>
      
      {/* Scenario Name */}
      <p className="text-xs md:text-sm font-semibold text-foreground mb-1 truncate">
        {scenario.name}
      </p>
      
      {/* Scenario Thesis/Description - More Prominent */}
      {scenario.description && (
        <div className="mb-2 md:mb-3 p-1.5 md:p-2 rounded-lg bg-background/50 border border-border/30">
          <p className="text-[9px] md:text-[10px] text-foreground-muted uppercase tracking-wider mb-0.5">Thesis</p>
          <p className="text-[10px] md:text-xs text-foreground-secondary leading-relaxed line-clamp-3 md:line-clamp-none">
            {scenario.description}
          </p>
        </div>
      )}
      
      {isEditing ? (
        /* Edit Mode */
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] text-success font-semibold uppercase mb-1 block">Take Profit</label>
              <input
                type="number"
                step="any"
                value={editTarget}
                onChange={(e) => setEditTarget(e.target.value)}
                className="input input-sm w-full font-mono text-xs"
                placeholder="Target"
              />
            </div>
            <div>
              <label className="text-[10px] text-foreground-muted font-semibold uppercase mb-1 block">Entry</label>
              <input
                type="number"
                step="any"
                value={editEntry}
                onChange={(e) => setEditEntry(e.target.value)}
                className="input input-sm w-full font-mono text-xs"
                placeholder="Entry"
              />
            </div>
            <div>
              <label className="text-[10px] text-danger font-semibold uppercase mb-1 block">Stop Loss</label>
              <input
                type="number"
                step="any"
                value={editStopLoss}
                onChange={(e) => setEditStopLoss(e.target.value)}
                className="input input-sm w-full font-mono text-xs"
                placeholder="Stop"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={cancelEditing} className="btn btn-xs btn-secondary">
              <X className="w-3 h-3" /> Cancel
            </button>
            <button onClick={saveEdits} className="btn btn-xs btn-primary">
              <Check className="w-3 h-3" /> Save
            </button>
          </div>
        </div>
      ) : scenario.entryPrice ? (
        <div className="space-y-2 md:space-y-3">
          {/* Professional Trade Levels Grid - Horizontal row on mobile */}
          <div className="flex gap-1.5 md:gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
            {/* Take Profit */}
            <div className="relative overflow-hidden rounded-lg bg-success/5 border border-success/20 p-1.5 md:p-2 flex-1 min-w-[70px] md:min-w-[90px]">
              <div className="absolute top-0 left-0 w-1 h-full bg-success" />
              <p className="text-[8px] md:text-[10px] text-success/70 font-semibold uppercase tracking-wider mb-0.5">TP</p>
              <p className="text-[11px] md:text-sm font-mono font-bold text-success">${formatPrice(scenario.target1 || 0)}</p>
              {scenario.target1 && (
                <p className="text-[8px] md:text-[10px] font-mono text-success/60">
                  +{((scenario.target1 - scenario.entryPrice) / scenario.entryPrice * 100).toFixed(1)}%
                </p>
              )}
            </div>
            
            {/* Entry Price */}
            <div className={cn(
              "relative overflow-hidden rounded-lg p-1.5 md:p-2 border flex-1 min-w-[70px] md:min-w-[90px]",
              status === 'at_trigger' 
                ? 'bg-accent/10 border-accent/40' 
                : 'bg-foreground-muted/5 border-border/30'
            )}>
              <div className={cn(
                "absolute top-0 left-0 w-1 h-full",
                status === 'at_trigger' ? 'bg-accent animate-pulse' : 'bg-foreground-muted/30'
              )} />
              <p className={cn(
                "text-[8px] md:text-[10px] font-semibold uppercase tracking-wider mb-0.5",
                status === 'at_trigger' ? 'text-accent' : 'text-foreground-muted'
              )}>Entry</p>
              <p className={cn(
                "text-[11px] md:text-sm font-mono font-bold",
                status === 'at_trigger' ? 'text-accent' : 'text-foreground'
              )}>
                ${formatPrice(scenario.entryPrice)}
              </p>
              <p className="text-[7px] md:text-[9px] text-foreground-muted/60">±0.1%</p>
            </div>
            
            {/* Stop Loss */}
            <div className="relative overflow-hidden rounded-lg bg-danger/5 border border-danger/20 p-1.5 md:p-2 flex-1 min-w-[70px] md:min-w-[90px]">
              <div className="absolute top-0 left-0 w-1 h-full bg-danger" />
              <p className="text-[8px] md:text-[10px] text-danger/70 font-semibold uppercase tracking-wider mb-0.5">SL</p>
              <p className="text-[11px] md:text-sm font-mono font-bold text-danger">${formatPrice(scenario.stopLoss || 0)}</p>
              {scenario.stopLoss && (
                <p className="text-[8px] md:text-[10px] font-mono text-danger/60">
                  {((scenario.stopLoss - scenario.entryPrice) / scenario.entryPrice * 100).toFixed(1)}%
                </p>
              )}
            </div>
          </div>
          
          {/* Visual Price Progress Bar */}
          {currentPrice && scenario.stopLoss && scenario.target1 && (
            <div className="relative h-2 rounded-full bg-gradient-to-r from-danger/30 via-foreground-muted/20 to-success/30 overflow-hidden">
              {/* Current Price Marker */}
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-accent ring-2 ring-background shadow-lg shadow-accent/40 z-10"
                style={{
                  left: `${Math.min(96, Math.max(4, ((currentPrice - scenario.stopLoss) / (scenario.target1 - scenario.stopLoss)) * 100))}%`,
                  transform: 'translate(-50%, -50%)'
                }}
              />
              {/* Entry marker */}
              <div 
                className="absolute top-0 w-0.5 h-full bg-foreground-muted/50"
                style={{
                  left: `${((scenario.entryPrice - scenario.stopLoss) / (scenario.target1 - scenario.stopLoss)) * 100}%`
                }}
              />
            </div>
          )}
          
          {/* Stats Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/30">
            <div className="flex flex-wrap items-center gap-2 md:gap-4">
              {/* R:R Ratio */}
              {scenario.stopLoss && scenario.target1 && (
                <div className="flex items-center gap-1">
                  <span className="text-[9px] md:text-[10px] text-foreground-muted uppercase">R:R</span>
                  <span className="text-[10px] md:text-xs font-mono font-bold text-accent">
                    1:{(Math.abs(scenario.target1 - scenario.entryPrice) / Math.abs(scenario.entryPrice - scenario.stopLoss)).toFixed(1)}
                  </span>
                </div>
              )}
              {/* Risk % */}
              {scenario.stopLoss && (
                <div className="flex items-center gap-1">
                  <span className="text-[9px] md:text-[10px] text-foreground-muted uppercase">Risk</span>
                  <span className="text-[10px] md:text-xs font-mono font-bold text-danger">
                    {(Math.abs(scenario.entryPrice - scenario.stopLoss) / scenario.entryPrice * 100).toFixed(1)}%
                  </span>
                </div>
              )}
              {/* Reward % */}
              {scenario.target1 && (
                <div className="flex items-center gap-1">
                  <span className="text-[9px] md:text-[10px] text-foreground-muted uppercase">Reward</span>
                  <span className="text-[10px] md:text-xs font-mono font-bold text-success">
                    +{(Math.abs(scenario.target1 - scenario.entryPrice) / scenario.entryPrice * 100).toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
            
            {/* Distance Badge */}
            <div className={cn(
              'text-[10px] md:text-xs font-mono font-semibold px-1.5 md:px-2 py-0.5 rounded',
              status === 'at_trigger' ? 'bg-success/20 text-success' :
              status === 'approaching' ? 'bg-warning/20 text-warning' :
              'bg-background-tertiary text-foreground-muted'
            )}>
              {distance < 100 ? `${distance.toFixed(1)}% away` : '—'}
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-foreground-muted italic">No trade levels set</p>
      )}
    </div>
  );
}
