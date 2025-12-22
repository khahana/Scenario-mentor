'use client';

import { useState } from 'react';
import { 
  Bell, 
  Wifi, 
  WifiOff, 
  MessageSquare,
  Plus,
  Zap
} from 'lucide-react';
import { useMarketDataStore, useUIStore, useAlertsStore, useBattleCardStore } from '@/lib/stores';
import { formatPrice, formatPercent, cn } from '@/lib/utils/helpers';
import { AlertsPanel } from '@/components/alerts/AlertsPanel';

interface TopBarProps {
  isConnected: boolean;
}

export function TopBar({ isConnected }: TopBarProps) {
  const [alertsOpen, setAlertsOpen] = useState(false);
  const prices = useMarketDataStore(state => state.prices);
  const watchlist = useMarketDataStore(state => state.watchlist);
  const { toggleAIChat, showAIChat } = useUIStore();
  const alerts = useAlertsStore(state => state.alerts);
  const unreadAlerts = alerts.filter(a => !a.read).length;
  const createBattleCard = useBattleCardStore(state => state.createBattleCard);
  const setActiveView = useUIStore(state => state.setActiveView);

  const handleNewBattleCard = () => {
    createBattleCard();
    setActiveView('battle-card');
  };

  return (
    <>
      <header className="fixed top-0 left-0 md:left-64 right-0 h-14 md:h-16 bg-background-secondary/80 backdrop-blur-xl border-b border-border z-40">
        <div className="h-full px-3 md:px-6 flex items-center justify-between">
          {/* Mobile Logo */}
          <div className="flex md:hidden items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-cyan-500 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-foreground">Scenario</span>
          </div>
          
          {/* Price Ticker - Desktop: 4 items, Mobile: 2 items */}
          <div className="hidden md:flex items-center gap-6">
            {watchlist.slice(0, 4).map((symbol) => {
              const data = prices[symbol];
              const isPositive = data?.changePercent24h >= 0;
              
              return (
                <div key={symbol} className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {symbol.replace('USDT', '')}
                  </span>
                  {data ? (
                    <>
                      <span className="text-sm font-mono font-medium text-foreground">
                        ${formatPrice(data.price)}
                      </span>
                      <span className={cn(
                        'text-xs font-mono',
                        isPositive ? 'text-success' : 'text-danger'
                      )}>
                        {formatPercent(data.changePercent24h)}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-foreground-muted">--</span>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Mobile Price Ticker - Just BTC */}
          <div className="flex md:hidden items-center gap-2">
            {watchlist.slice(0, 1).map((symbol) => {
              const data = prices[symbol];
              const isPositive = data?.changePercent24h >= 0;
              
              return (
                <div key={symbol} className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-foreground-muted">
                    {symbol.replace('USDT', '')}
                  </span>
                  {data ? (
                    <>
                      <span className="text-xs font-mono font-medium text-foreground">
                        ${formatPrice(data.price)}
                      </span>
                      <span className={cn(
                        'text-[10px] font-mono',
                        isPositive ? 'text-success' : 'text-danger'
                      )}>
                        {formatPercent(data.changePercent24h)}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-foreground-muted">--</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Connection Status - Smaller on mobile */}
            <div className={cn(
              'flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1 md:py-1.5 rounded-full text-[10px] md:text-xs font-medium',
              isConnected 
                ? 'bg-success/10 text-success' 
                : 'bg-danger/10 text-danger'
            )}>
              {isConnected ? (
                <>
                  <Wifi className="w-3 h-3 md:w-3.5 md:h-3.5" />
                  <span className="hidden md:inline">Futures Live</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 md:w-3.5 md:h-3.5" />
                  <span className="hidden md:inline">Offline</span>
                </>
              )}
            </div>

            {/* Alerts */}
            <button 
              onClick={() => setAlertsOpen(true)}
              className={cn(
                'relative p-1.5 md:p-2 rounded-lg transition-colors',
                alertsOpen ? 'bg-accent/20' : 'hover:bg-background-tertiary'
              )}
            >
              <Bell className={cn(
                'w-4 h-4 md:w-5 md:h-5',
                unreadAlerts > 0 ? 'text-warning' : 'text-foreground-secondary'
              )} />
              {unreadAlerts > 0 && (
                <span className="absolute -top-0.5 -right-0.5 md:-top-1 md:-right-1 w-4 h-4 md:w-5 md:h-5 bg-danger text-white text-[10px] md:text-xs rounded-full flex items-center justify-center animate-pulse">
                  {unreadAlerts}
                </span>
              )}
            </button>

            {/* AI Chat Toggle - Hidden on mobile (use nav) */}
            <button 
              onClick={toggleAIChat}
              className={cn(
                'hidden md:block p-2 rounded-lg transition-colors',
                showAIChat 
                  ? 'bg-accent/20 text-accent' 
                  : 'hover:bg-background-tertiary text-foreground-secondary'
              )}
            >
              <MessageSquare className="w-5 h-5" />
            </button>

            {/* New Battle Card - Icon only on mobile */}
            <button 
              onClick={handleNewBattleCard}
              className="btn btn-primary btn-sm md:btn-md"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden md:inline">New Battle Card</span>
            </button>
          </div>
        </div>
      </header>

      {/* Alerts Panel */}
      {alertsOpen && <AlertsPanel onClose={() => setAlertsOpen(false)} />}
    </>
  );
}
