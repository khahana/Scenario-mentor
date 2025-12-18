'use client';

import { useState } from 'react';
import { 
  Bell, 
  Wifi, 
  WifiOff, 
  Search,
  MessageSquare,
  Plus,
  ChevronDown
} from 'lucide-react';
import { useMarketDataStore, useUIStore, useAlertsStore, useBattleCardStore } from '@/lib/stores';
import { formatPrice, formatPercent, cn } from '@/lib/utils/helpers';
import { AlertsPanel } from '@/components/alerts/AlertsPanel';

interface TopBarProps {
  isConnected: boolean;
}

export function TopBar({ isConnected }: TopBarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
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
      <header className="fixed top-0 left-64 right-0 h-16 bg-background-secondary/80 backdrop-blur-xl border-b border-border z-40">
        <div className="h-full px-6 flex items-center justify-between">
          {/* Price Ticker */}
          <div className="flex items-center gap-6">
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

          {/* Right Side Actions */}
          <div className="flex items-center gap-3">
            {/* Connection Status */}
            <div className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium',
              isConnected 
                ? 'bg-success/10 text-success' 
                : 'bg-danger/10 text-danger'
            )}>
              {isConnected ? (
                <>
                  <Wifi className="w-3.5 h-3.5" />
                  <span>Futures Live</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5" />
                  <span>Offline</span>
                </>
              )}
            </div>

            {/* Search */}
            <button 
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-2 rounded-lg hover:bg-background-tertiary transition-colors"
            >
              <Search className="w-5 h-5 text-foreground-secondary" />
            </button>

            {/* Alerts */}
            <button 
              onClick={() => setAlertsOpen(true)}
              className={cn(
                'relative p-2 rounded-lg transition-colors',
                alertsOpen ? 'bg-accent/20' : 'hover:bg-background-tertiary'
              )}
            >
              <Bell className={cn(
                'w-5 h-5',
                unreadAlerts > 0 ? 'text-warning' : 'text-foreground-secondary'
              )} />
              {unreadAlerts > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-danger text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                  {unreadAlerts}
                </span>
              )}
            </button>

            {/* AI Chat Toggle */}
            <button 
              onClick={toggleAIChat}
              className={cn(
                'p-2 rounded-lg transition-colors',
                showAIChat 
                  ? 'bg-accent/20 text-accent' 
                  : 'hover:bg-background-tertiary text-foreground-secondary'
              )}
            >
              <MessageSquare className="w-5 h-5" />
            </button>

            {/* New Battle Card */}
            <button 
              onClick={handleNewBattleCard}
              className="btn btn-primary"
            >
              <Plus className="w-4 h-4" />
              <span>New Battle Card</span>
            </button>
          </div>
        </div>
      </header>

      {/* Alerts Panel */}
      {alertsOpen && <AlertsPanel onClose={() => setAlertsOpen(false)} />}
    </>
  );
}
