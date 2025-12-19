'use client';

import { useState } from 'react';
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
  Activity
} from 'lucide-react';
import { useBattleCardStore, useMarketDataStore } from '@/lib/stores';
import { usePaperTradingStore } from '@/lib/stores/paperTradingStore';
import { usePriceMonitor } from '@/lib/hooks/usePriceMonitor';
import { cn, getScenarioColor, formatPrice, timeAgo } from '@/lib/utils/helpers';
import { TradingChart } from '@/components/charts/TradingChart';
import type { BattleCard, Scenario } from '@/types';

interface LiveBattleCardProps {
  card: BattleCard;
  onClose?: () => void;
}

export function LiveBattleCard({ card, onClose }: LiveBattleCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [showChart, setShowChart] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'win' | 'loss' | 'delete' | null>(null);
  
  const { updateBattleCard, deleteBattleCard } = useBattleCardStore();
  const prices = useMarketDataStore(state => state.prices);
  const { getCardTriggerStatus, getClosestScenario } = usePriceMonitor();
  
  // Paper trading
  const getOpenPosition = usePaperTradingStore(state => state.getOpenPosition);
  const closePosition = usePaperTradingStore(state => state.closePosition);
  const calculateLivePnl = usePaperTradingStore(state => state.calculateLivePnl);

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

  return (
    <div className={cn(
      'card border-2 transition-all duration-300',
      getStatusColor()
    )}>
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center',
              position 
                ? 'bg-accent/20' 
                : closestScenario?.status === 'at_trigger' 
                  ? 'bg-success/20 animate-pulse' 
                  : closestScenario?.status === 'approaching'
                    ? 'bg-warning/20'
                    : 'bg-accent/10'
            )}>
              {position ? (
                <Activity className="w-6 h-6 text-accent" />
              ) : (
                <Target className={cn(
                  'w-6 h-6',
                  closestScenario?.status === 'at_trigger' ? 'text-success' 
                  : closestScenario?.status === 'approaching' ? 'text-warning'
                  : 'text-accent'
                )} />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-foreground">{card.instrument}</h3>
                <span className="text-sm text-foreground-muted">{card.timeframe}</span>
                {position && (
                  <span className={cn(
                    'badge text-xs',
                    position.direction === 'long' ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'
                  )}>
                    {position.direction.toUpperCase()}
                  </span>
                )}
              </div>
              {card.thesis && (
                <p className="text-sm text-foreground-secondary mt-1 line-clamp-2">
                  <span className="text-accent font-medium">Thesis:</span> {card.thesis}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Live Price */}
            {currentPrice && (
              <div className="text-right">
                <p className="font-mono font-bold text-lg text-foreground">
                  ${formatPrice(currentPrice)}
                </p>
                {priceChange !== undefined && (
                  <p className={cn(
                    'text-xs font-mono',
                    priceChange >= 0 ? 'text-success' : 'text-danger'
                  )}>
                    {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                  </p>
                )}
              </div>
            )}
            
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-2 hover:bg-background-tertiary rounded-lg transition-colors"
            >
              {expanded ? (
                <ChevronUp className="w-5 h-5 text-foreground-muted" />
              ) : (
                <ChevronDown className="w-5 h-5 text-foreground-muted" />
              )}
            </button>
          </div>
        </div>

        {/* POSITION STATUS BANNER */}
        {position && livePnl && (
          <div className={cn(
            'mt-4 p-4 rounded-xl border',
            livePnl.pnl >= 0 
              ? 'bg-success/10 border-success/30' 
              : 'bg-danger/10 border-danger/30'
          )}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <DollarSign className={cn(
                  'w-6 h-6',
                  livePnl.pnl >= 0 ? 'text-success' : 'text-danger'
                )} />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">Open Position</p>
                    <span 
                      className="text-xs font-bold px-2 py-0.5 rounded"
                      style={{ 
                        backgroundColor: `${getScenarioColor(position.scenarioType)}20`,
                        color: getScenarioColor(position.scenarioType)
                      }}
                    >
                      Scenario {position.scenarioType}
                    </span>
                    <span className={cn(
                      'text-xs font-semibold px-2 py-0.5 rounded',
                      position.direction === 'long' 
                        ? 'bg-success/20 text-success' 
                        : 'bg-danger/20 text-danger'
                    )}>
                      {position.direction === 'long' ? '↑ LONG' : '↓ SHORT'}
                    </span>
                    {livePnl.leverage > 1 && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-warning/20 text-warning">
                        {livePnl.leverage}x
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-foreground-secondary mt-0.5">
                    {position.scenarioName}
                  </p>
                  <p className="text-xs text-foreground-muted">
                    Entry: ${formatPrice(position.entryPrice)} | Size: ${position.size} {livePnl.leverage > 1 && `× ${livePnl.leverage}`}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={cn(
                  'font-mono font-bold text-xl',
                  livePnl.pnl >= 0 ? 'text-success' : 'text-danger'
                )}>
                  {livePnl.pnl >= 0 ? '+' : ''}${livePnl.pnl.toFixed(2)}
                </p>
                <p className={cn(
                  'text-sm font-mono',
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
              
              {/* Labels */}
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
              </div>
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
            'mt-4 p-3 rounded-xl flex items-center gap-3',
            closestScenario.status === 'at_trigger' 
              ? 'bg-success/10 border border-success/30' 
              : 'bg-warning/10 border border-warning/30'
          )}>
            <Zap className={cn(
              'w-5 h-5',
              closestScenario.status === 'at_trigger' ? 'text-success' : 'text-warning'
            )} />
            <div className="flex-1">
              <p className={cn(
                'font-medium text-sm',
                closestScenario.status === 'at_trigger' ? 'text-success' : 'text-warning'
              )}>
                {closestScenario.status === 'at_trigger' 
                  ? `🎯 SCENARIO ${closestScenario.scenario.type} - ENTRY!`
                  : `⚡ SCENARIO ${closestScenario.scenario.type} - ${closestScenario.distance.toFixed(1)}% away`
                }
              </p>
              <p className="text-xs text-foreground-muted">{closestScenario.message}</p>
            </div>
          </div>
        )}
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-border">
          {/* Primary Scenarios (A & B) */}
          <div className="p-4 grid grid-cols-2 gap-4">
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
                />
              ))}
          </div>
          
          {/* Secondary Scenarios (C & D) - Compact Row */}
          {triggerStatuses.some(({ scenario }) => scenario.type === 'C' || scenario.type === 'D') && (
            <div className="px-4 pb-3">
              <div className="flex items-center gap-3 p-2 bg-background-tertiary/50 rounded-lg flex-wrap">
                <span className="text-xs text-foreground-muted">Alt:</span>
                {triggerStatuses
                  .filter(({ scenario }) => scenario.type === 'C' || scenario.type === 'D')
                  .map(({ scenario, status, distance }) => {
                    const color = getScenarioColor(scenario.type);
                    return (
                      <div 
                        key={scenario.type}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-background-tertiary flex-1 min-w-[200px]"
                        style={{ borderLeft: `3px solid ${color}` }}
                      >
                        <span className="text-xs font-bold" style={{ color }}>{scenario.type}</span>
                        <span className="text-xs text-foreground-secondary flex-1">{scenario.name}</span>
                        <span className="text-xs text-foreground-muted">{scenario.probability}%</span>
                        {status !== 'far' && (
                          <span className={cn(
                            'text-[10px] px-1.5 py-0.5 rounded',
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
          <div className="px-4 pb-4">
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
                  {confirmAction === 'win' ? 'Mark win?' : confirmAction === 'loss' ? 'Mark loss?' : 'Delete?'}
                </span>
                <button
                  onClick={() => {
                    if (confirmAction === 'win') handleCloseCard('completed');
                    else if (confirmAction === 'loss') handleCloseCard('closed');
                    else handleDeleteCard();
                  }}
                  className={cn(
                    'btn btn-sm',
                    confirmAction === 'win' ? 'bg-success text-white' :
                    confirmAction === 'loss' ? 'bg-danger text-white' :
                    'bg-foreground-muted text-background'
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
                <button
                  onClick={() => setConfirmAction('win')}
                  className="btn btn-sm bg-success/20 text-success hover:bg-success/30"
                >
                  <TrendingUp className="w-4 h-4" />
                  Win
                </button>
                <button
                  onClick={() => setConfirmAction('loss')}
                  className="btn btn-sm bg-danger/20 text-danger hover:bg-danger/30"
                >
                  <TrendingDown className="w-4 h-4" />
                  Loss
                </button>
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
}

function ScenarioStatusCard({ scenario, status, distance, currentPrice, isActiveScenario }: ScenarioStatusCardProps) {
  const color = getScenarioColor(scenario.type);
  const isActive = status === 'at_trigger' || status === 'approaching';
  
  // Calculate direction from entry vs stop
  const direction = scenario.entryPrice && scenario.stopLoss
    ? (scenario.entryPrice > scenario.stopLoss ? 'long' : 'short')
    : null;
  
  return (
    <div 
      className={cn(
        'p-3 rounded-xl border transition-all',
        isActiveScenario && 'ring-2 ring-accent',
        status === 'at_trigger' && !isActiveScenario && 'ring-2 ring-success animate-pulse',
        status === 'approaching' && !isActiveScenario && 'ring-1 ring-warning'
      )}
      style={{ 
        backgroundColor: `${color}10`,
        borderColor: isActive ? color : `${color}30`
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span 
            className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-white text-base"
            style={{ backgroundColor: color }}
          >
            {scenario.type}
          </span>
          {direction && (
            <span className={cn(
              'text-xs font-bold px-1.5 py-0.5 rounded',
              direction === 'long' 
                ? 'bg-success/20 text-success' 
                : 'bg-danger/20 text-danger'
            )}>
              {direction === 'long' ? '↑' : '↓'}
            </span>
          )}
        </div>
        <span className="text-base font-bold" style={{ color }}>
          {scenario.probability}%
        </span>
      </div>
      
      {/* Scenario Name */}
      <p className="text-sm font-semibold text-foreground mb-1">
        {scenario.name}
      </p>
      
      {/* Scenario Thesis/Description - More Prominent */}
      {scenario.description && (
        <div className="mb-3 p-2 rounded-lg bg-background/50 border border-border/30">
          <p className="text-[10px] text-foreground-muted uppercase tracking-wider mb-0.5">Thesis</p>
          <p className="text-xs text-foreground-secondary leading-relaxed">
            {scenario.description}
          </p>
        </div>
      )}
      
      {scenario.entryPrice ? (
        <div className="space-y-3">
          {/* Professional Trade Levels Grid */}
          <div className="grid grid-cols-3 gap-2">
            {/* Take Profit */}
            <div className="relative overflow-hidden rounded-lg bg-success/5 border border-success/20 p-2">
              <div className="absolute top-0 left-0 w-1 h-full bg-success" />
              <p className="text-[10px] text-success/70 font-semibold uppercase tracking-wider mb-0.5">Take Profit</p>
              <p className="text-sm font-mono font-bold text-success">${formatPrice(scenario.target1 || 0)}</p>
              {scenario.target1 && (
                <p className="text-[10px] font-mono text-success/60">
                  +{((scenario.target1 - scenario.entryPrice) / scenario.entryPrice * 100).toFixed(1)}%
                </p>
              )}
            </div>
            
            {/* Entry Zone */}
            <div className={cn(
              "relative overflow-hidden rounded-lg p-2 border",
              status === 'at_trigger' 
                ? 'bg-accent/10 border-accent/40' 
                : 'bg-foreground-muted/5 border-border/30'
            )}>
              <div className={cn(
                "absolute top-0 left-0 w-1 h-full",
                status === 'at_trigger' ? 'bg-accent animate-pulse' : 'bg-foreground-muted/30'
              )} />
              <p className={cn(
                "text-[10px] font-semibold uppercase tracking-wider mb-0.5",
                status === 'at_trigger' ? 'text-accent' : 'text-foreground-muted'
              )}>Entry Zone</p>
              <p className={cn(
                "text-sm font-mono font-bold",
                status === 'at_trigger' ? 'text-accent' : 'text-foreground'
              )}>
                ${formatPrice(scenario.entryPrice * 0.9985)} - ${formatPrice(scenario.entryPrice * 1.0015)}
              </p>
            </div>
            
            {/* Stop Loss */}
            <div className="relative overflow-hidden rounded-lg bg-danger/5 border border-danger/20 p-2">
              <div className="absolute top-0 left-0 w-1 h-full bg-danger" />
              <p className="text-[10px] text-danger/70 font-semibold uppercase tracking-wider mb-0.5">Stop Loss</p>
              <p className="text-sm font-mono font-bold text-danger">${formatPrice(scenario.stopLoss || 0)}</p>
              {scenario.stopLoss && (
                <p className="text-[10px] font-mono text-danger/60">
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
          <div className="flex items-center justify-between pt-2 border-t border-border/30">
            <div className="flex items-center gap-4">
              {/* R:R Ratio */}
              {scenario.stopLoss && scenario.target1 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-foreground-muted uppercase">R:R</span>
                  <span className="text-xs font-mono font-bold text-accent">
                    1:{(Math.abs(scenario.target1 - scenario.entryPrice) / Math.abs(scenario.entryPrice - scenario.stopLoss)).toFixed(1)}
                  </span>
                </div>
              )}
              {/* Risk % */}
              {scenario.stopLoss && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-foreground-muted uppercase">Risk</span>
                  <span className="text-xs font-mono font-bold text-danger">
                    {(Math.abs(scenario.entryPrice - scenario.stopLoss) / scenario.entryPrice * 100).toFixed(1)}%
                  </span>
                </div>
              )}
              {/* Reward % */}
              {scenario.target1 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-foreground-muted uppercase">Reward</span>
                  <span className="text-xs font-mono font-bold text-success">
                    +{(Math.abs(scenario.target1 - scenario.entryPrice) / scenario.entryPrice * 100).toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
            
            {/* Distance Badge */}
            <div className={cn(
              'text-xs font-mono font-semibold px-2 py-0.5 rounded',
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
