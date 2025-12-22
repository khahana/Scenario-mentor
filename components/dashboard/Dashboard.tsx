'use client';

import { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  DollarSign,
  BarChart3,
  Activity,
  Clock,
  ChevronRight,
  Plus,
  Zap,
  X,
  Trash2,
  Brain,
  Settings,
  Search,
  HelpCircle,
  Sparkles,
  BookOpen,
  MessageSquare
} from 'lucide-react';
import { useBattleCardStore, useMarketDataStore, useUIStore } from '@/lib/stores';
import { usePaperTradingStore } from '@/lib/stores/paperTradingStore';
import { formatPrice, formatPercent, timeAgo, cn, getScenarioColor } from '@/lib/utils/helpers';
import { ProbabilityGauge } from '@/components/ui/ProbabilityGauge';
import { MiniChart } from '@/components/charts/MiniChart';
import { LiveBattleCard } from '@/components/battle-card/LiveBattleCard';

export function Dashboard() {
  const battleCards = useBattleCardStore(state => state.battleCards);
  const prices = useMarketDataStore(state => state.prices);
  const { setActiveView, setShowTour } = useUIStore();
  const setCurrentCard = useBattleCardStore(state => state.setCurrentCard);
  const createBattleCard = useBattleCardStore(state => state.createBattleCard);
  
  // Paper trading stats and settings
  const { balance, totalPnl, winRate, totalTrades, winCount, lossCount, avgRMultiple, settings } = usePaperTradingStore();

  const activeCards = battleCards.filter(c => c.status === 'active' || c.status === 'monitoring');
  const draftCards = battleCards.filter(c => c.status === 'draft');
  
  // Show quick start guide for new users (no trades and no active cards)
  const showQuickStart = totalTrades === 0 && activeCards.length === 0;

  const handleCardClick = (card: any) => {
    setCurrentCard(card);
    setActiveView('battle-card');
  };

  const handleNewCard = () => {
    createBattleCard();
    setActiveView('battle-card');
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in overflow-x-hidden max-w-full">
      {/* Trading Settings Quick View */}
      <div className="flex flex-col md:flex-row md:items-center justify-between p-3 bg-background-secondary rounded-xl border border-border gap-3 overflow-hidden">
        <div className="grid grid-cols-2 md:flex md:items-center gap-3 md:gap-6">
          <div className="flex items-center gap-1.5 md:gap-2">
            <DollarSign className="w-3.5 h-3.5 md:w-4 md:h-4 text-accent" />
            <span className="text-xs md:text-sm text-foreground-muted">Fund:</span>
            <span className="text-xs md:text-sm font-bold text-foreground">${balance.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2">
            <span className="text-xs md:text-sm text-foreground-muted">Position:</span>
            <span className="text-xs md:text-sm font-bold text-foreground">${settings.defaultSize}</span>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2">
            <span className="text-xs md:text-sm text-foreground-muted">Leverage:</span>
            <span className="text-xs md:text-sm font-bold text-warning">{settings.leverage}x</span>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2">
            <span className="text-xs md:text-sm text-foreground-muted">Auto:</span>
            <span className={cn(
              'text-xs md:text-sm font-bold',
              settings.autoExecuteOnTrigger ? 'text-success' : 'text-foreground-muted'
            )}>
              {settings.autoExecuteOnTrigger ? 'ON' : 'OFF'}
            </span>
          </div>
        </div>
        <button 
          onClick={() => {/* Would need to pass setShowSettings callback */}}
          className="text-xs text-foreground-muted hover:text-accent flex items-center gap-1 self-end md:self-auto"
        >
          <Settings className="w-3 h-3" />
          <span className="hidden md:inline">Edit in Settings</span>
          <span className="md:hidden">Settings</span>
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Balance"
          value={`$${balance.toLocaleString()}`}
          subtitle={`${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(0)} P&L`}
          icon={DollarSign}
          color={totalPnl >= 0 ? 'success' : 'danger'}
        />
        <StatCard
          title="Win Rate"
          value={totalTrades > 0 ? `${winRate.toFixed(0)}%` : '—'}
          subtitle={totalTrades > 0 ? `${winCount}W / ${lossCount}L` : 'No trades yet'}
          icon={Target}
          color="accent"
        />
        <StatCard
          title="Avg R"
          value={totalTrades > 0 ? `${avgRMultiple >= 0 ? '+' : ''}${avgRMultiple.toFixed(2)}R` : '—'}
          subtitle="Risk Multiple"
          icon={BarChart3}
          color={avgRMultiple >= 0 ? 'success' : 'danger'}
        />
        <StatCard
          title="Active Setups"
          value={activeCards.length.toString()}
          subtitle={`${totalTrades} total trades`}
          icon={Activity}
          color="info"
        />
      </div>

      {/* Main Content */}
      <div className="space-y-4">
        {/* Top Bar: Market Watch (horizontal) + Quick Actions */}
        <div className="flex items-center gap-4 p-3 bg-background-secondary rounded-xl border border-border">
          {/* Market Watch - Horizontal Ticker */}
          <div className="flex items-center gap-4 flex-1 overflow-x-auto">
            <div className="flex items-center gap-1 text-xs text-foreground-muted whitespace-nowrap">
              <Activity className="w-3 h-3 text-accent" />
              <span>LIVE</span>
            </div>
            {Object.entries(prices).slice(0, 6).map(([symbol, data]) => (
              <div key={symbol} className="flex items-center gap-2 whitespace-nowrap">
                <span className="text-xs font-semibold text-foreground">{symbol.replace('USDT', '')}</span>
                <span className="text-xs font-mono text-foreground-muted">${formatPrice(data.price)}</span>
                <span className={cn(
                  'text-xs font-mono',
                  data.changePercent24h >= 0 ? 'text-success' : 'text-danger'
                )}>
                  {data.changePercent24h >= 0 ? '+' : ''}{data.changePercent24h?.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
          
          {/* Quick Actions - Compact */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button 
              onClick={handleNewCard}
              className="btn btn-sm btn-primary text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              New Card
            </button>
            <button 
              onClick={() => setActiveView('scanner')}
              className="btn btn-sm bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 text-xs"
            >
              <Search className="w-3.5 h-3.5" />
              Scanner
            </button>
          </div>
        </div>

        {/* Quick Start Guide - Show for new users */}
        {showQuickStart && (
          <div className="card p-6 bg-gradient-to-br from-accent/5 to-purple-500/5 border-accent/20">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-6 h-6 text-accent" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground mb-1">Welcome to Scenario Trading! 🎯</h3>
                <p className="text-sm text-foreground-secondary mb-4">
                  Think in probabilities, not predictions. Here's how to get started:
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <button 
                    onClick={() => setActiveView('scanner')}
                    className="p-4 rounded-xl bg-background-secondary/50 hover:bg-background-secondary border border-border hover:border-accent/30 transition-all text-left group"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Search className="w-5 h-5 text-warning" />
                      <span className="font-semibold text-foreground">1. Scan Market</span>
                    </div>
                    <p className="text-xs text-foreground-muted">
                      Find high-potential setups with technical analysis, funding rates & OI
                    </p>
                  </button>
                  
                  <button 
                    onClick={handleNewCard}
                    className="p-4 rounded-xl bg-background-secondary/50 hover:bg-background-secondary border border-border hover:border-accent/30 transition-all text-left group"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-5 h-5 text-success" />
                      <span className="font-semibold text-foreground">2. Create Battle Card</span>
                    </div>
                    <p className="text-xs text-foreground-muted">
                      AI generates 4 scenarios with entry, stop & targets
                    </p>
                  </button>
                  
                  <button 
                    onClick={() => setActiveView('journal')}
                    className="p-4 rounded-xl bg-background-secondary/50 hover:bg-background-secondary border border-border hover:border-accent/30 transition-all text-left group"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <BookOpen className="w-5 h-5 text-info" />
                      <span className="font-semibold text-foreground">3. Paper Trade</span>
                    </div>
                    <p className="text-xs text-foreground-muted">
                      Practice your scenarios risk-free and track performance
                    </p>
                  </button>
                </div>
                
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setShowTour(true)}
                    className="text-sm text-accent hover:text-accent/80 flex items-center gap-1"
                  >
                    <HelpCircle className="w-4 h-4" />
                    Take the full tour
                  </button>
                  <span className="text-foreground-muted">|</span>
                  <button 
                    onClick={() => setActiveView('chat')}
                    className="text-sm text-foreground-muted hover:text-foreground flex items-center gap-1"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Ask AI Mentor
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Active Battle Cards - Full Width */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">Active Battle Cards</h2>
            <span className="text-sm text-foreground-muted">{activeCards.length} active</span>
          </div>

          {activeCards.length === 0 ? (
            <div className="card card-hover p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-accent/10 flex items-center justify-center">
                <Target className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No Active Setups</h3>
              <p className="text-foreground-secondary mb-4">
                Create your first Battle Card to start tracking scenarios
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button onClick={handleNewCard} className="btn btn-primary">
                  <Plus className="w-4 h-4" />
                  Create Battle Card
                </button>
                <button 
                  onClick={() => setActiveView('scanner')}
                  className="btn btn-secondary"
                >
                  <Search className="w-4 h-4" />
                  Find Setups in Scanner
                </button>
              </div>
              
              {/* Scenario Quick Reference */}
              <div className="mt-6 pt-6 border-t border-border">
                <p className="text-xs text-foreground-muted mb-3">The 4 Scenarios Framework:</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-success/10 text-success">
                    A: Primary (40-50%)
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-info/10 text-info">
                    B: Secondary (25-35%)
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-warning/10 text-warning">
                    C: Chaos (10-20%)
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-danger/10 text-danger">
                    D: Invalidation (5-15%)
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 md:gap-4 overflow-hidden">
              {activeCards.map((card) => (
                <LiveBattleCard 
                  key={card.id} 
                  card={card}
                />
              ))}
            </div>
          )}

          {/* Draft Cards */}
          {draftCards.length > 0 && (
            <>
              <h3 className="text-base md:text-lg font-medium text-foreground-secondary mt-4 md:mt-6">Drafts</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 overflow-hidden">
                {draftCards.slice(0, 3).map((card) => (
                  <div 
                    key={card.id}
                    onClick={() => handleCardClick(card)}
                    className="card card-hover cursor-pointer opacity-70 hover:opacity-100"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">{card.instrument || 'Untitled'}</p>
                        <p className="text-sm text-foreground-muted">{card.thesis?.slice(0, 40) || 'No thesis yet'}...</p>
                      </div>
                      <span className="badge bg-foreground-muted/20 text-foreground-muted">Draft</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Sub-components

interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: any;
  color: 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
  trend?: number;
}

function StatCard({ title, value, subtitle, icon: Icon, color, trend }: StatCardProps) {
  const colorClasses = {
    accent: 'bg-accent/10 text-accent',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-danger/10 text-danger',
    info: 'bg-info/10 text-info',
    purple: 'bg-purple-500/10 text-purple-400',
  };

  return (
    <div className="card card-hover">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-foreground-secondary">{title}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
          <p className="text-xs text-foreground-muted mt-1">{subtitle}</p>
        </div>
        <div className={cn('p-3 rounded-xl', colorClasses[color])}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {trend !== undefined && (
        <div className={cn(
          'mt-3 flex items-center gap-1 text-sm',
          trend >= 0 ? 'text-success' : 'text-danger'
        )}>
          {trend >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          <span>{formatPercent(trend)} vs last period</span>
        </div>
      )}
    </div>
  );
}

interface BattleCardPreviewProps {
  card: any;
  price?: number;
  onClick: () => void;
}

function BattleCardPreview({ card, price, onClick }: BattleCardPreviewProps) {
  const [showActions, setShowActions] = useState(false);
  const updateBattleCard = useBattleCardStore(state => state.updateBattleCard);
  const deleteBattleCard = useBattleCardStore(state => state.deleteBattleCard);
  
  const scenarios = card.scenarios || [];

  const handleClose = (e: React.MouseEvent, outcome: 'completed' | 'closed') => {
    e.stopPropagation();
    updateBattleCard(card.id, { status: outcome });
    setShowActions(false);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteBattleCard(card.id);
  };
  
  return (
    <div 
      className="card card-hover cursor-pointer group relative"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4" onClick={onClick}>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground">{card.instrument}</h3>
            <span className="text-xs text-foreground-muted">{card.timeframe}</span>
          </div>
          <p className="text-sm text-foreground-secondary mt-1 line-clamp-2">
            {card.thesis}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            'badge',
            card.status === 'monitoring' ? 'badge-scenario-a' : 'bg-accent/20 text-accent'
          )}>
            {card.status === 'monitoring' ? '● Live' : 'Active'}
          </span>
        </div>
      </div>

      {/* Scenario Probabilities */}
      <div className="flex items-center gap-2 mb-4" onClick={onClick}>
        {scenarios.map((scenario: any) => (
          <div 
            key={scenario.id}
            className="flex-1 relative"
          >
            <div className="h-2 rounded-full bg-background-tertiary overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-500"
                style={{ 
                  width: `${scenario.probability}%`,
                  backgroundColor: getScenarioColor(scenario.type)
                }}
              />
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-foreground-muted">{scenario.type}</span>
              <span className="text-xs font-mono text-foreground-secondary">{scenario.probability}%</span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer with Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex items-center gap-2 text-sm text-foreground-muted">
          <Clock className="w-4 h-4" />
          <span>{timeAgo(new Date(card.createdAt))}</span>
        </div>
        {price && (
          <div className="text-sm font-mono text-foreground">
            ${formatPrice(price)}
          </div>
        )}
        
        {/* Close Actions */}
        <div className="flex items-center gap-1">
          {!showActions ? (
            <button
              onClick={(e) => { e.stopPropagation(); setShowActions(true); }}
              className="p-1.5 rounded-lg hover:bg-background-tertiary transition-colors"
              title="Close Card"
            >
              <X className="w-4 h-4 text-foreground-muted" />
            </button>
          ) : (
            <div className="flex items-center gap-1 animate-fade-in">
              <button
                onClick={(e) => handleClose(e, 'completed')}
                className="p-1.5 rounded-lg bg-success/20 hover:bg-success/30 transition-colors"
                title="Mark as Win"
              >
                <TrendingUp className="w-4 h-4 text-success" />
              </button>
              <button
                onClick={(e) => handleClose(e, 'closed')}
                className="p-1.5 rounded-lg bg-danger/20 hover:bg-danger/30 transition-colors"
                title="Mark as Loss"
              >
                <TrendingDown className="w-4 h-4 text-danger" />
              </button>
              <button
                onClick={handleDelete}
                className="p-1.5 rounded-lg bg-foreground-muted/20 hover:bg-foreground-muted/30 transition-colors"
                title="Delete"
              >
                <Trash2 className="w-4 h-4 text-foreground-muted" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setShowActions(false); }}
                className="p-1.5 rounded-lg hover:bg-background-tertiary transition-colors"
              >
                <X className="w-3 h-3 text-foreground-muted" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface MarketItemProps {
  symbol: string;
  data: any;
}

function MarketItem({ symbol, data }: MarketItemProps) {
  const isPositive = data.changePercent24h >= 0;
  
  // Handle 1000SHIB format → SHIB
  let displaySymbol = symbol.replace('USDT', '');
  if (displaySymbol.startsWith('1000')) {
    displaySymbol = displaySymbol.replace('1000', '');
  }
  
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-background-tertiary flex items-center justify-center text-xs font-bold text-foreground">
          {displaySymbol.slice(0, 4)}
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{displaySymbol}/USDT</p>
          <p className="text-xs text-foreground-muted">Vol: {(data.volume24h / 1e6).toFixed(1)}M</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-mono font-medium text-foreground">${formatPrice(data.price)}</p>
        <p className={cn(
          'text-xs font-mono',
          isPositive ? 'text-success' : 'text-danger'
        )}>
          {formatPercent(data.changePercent24h)}
        </p>
      </div>
    </div>
  );
}
