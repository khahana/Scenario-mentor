'use client';

import { useState } from 'react';
import { 
  Plus, 
  X, 
  Search, 
  Star,
  TrendingUp,
  Coins,
  BarChart3,
  AlertCircle
} from 'lucide-react';
import { 
  useMarketDataStore, 
  BINANCE_FUTURES_ASSETS, 
  type WatchlistAsset 
} from '@/lib/stores';
import { cn } from '@/lib/utils/helpers';

interface AssetManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AssetManager({ isOpen, onClose }: AssetManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [customSymbol, setCustomSymbol] = useState('');
  const [activeTab, setActiveTab] = useState<'popular' | 'all' | 'custom'>('popular');
  
  const { watchlist, addToWatchlist, removeFromWatchlist } = useMarketDataStore();
  
  // Handle both old format (string) and new format (object)
  const watchlistSymbols = new Set(watchlist);
  
  // Filter assets by search
  const filteredAssets = BINANCE_FUTURES_ASSETS.filter(asset => 
    asset.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    asset.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Popular assets (top of the list)
  const popularAssets = BINANCE_FUTURES_ASSETS.slice(0, 12);
  
  const handleAddCustom = () => {
    if (!customSymbol.trim()) return;
    
    let symbol = customSymbol.trim().toUpperCase();
    if (!symbol.endsWith('USDT')) {
      symbol = symbol + 'USDT';
    }
    
    addToWatchlist(symbol);
    setCustomSymbol('');
  };
  
  const handleToggleAsset = (asset: WatchlistAsset) => {
    if (watchlistSymbols.has(asset.symbol)) {
      removeFromWatchlist(asset.symbol);
    } else {
      addToWatchlist(asset.symbol);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center animate-fade-in">
      <div className="bg-background-secondary w-full max-w-2xl max-h-[80vh] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">Manage Assets</h2>
            <p className="text-sm text-foreground-muted">Binance Perpetual Futures</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-background-tertiary rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-foreground-muted" />
          </button>
        </div>
        
        {/* Search & Custom Add */}
        <div className="p-4 border-b border-border space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
            <input
              type="text"
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10 w-full"
            />
          </div>
          
          {/* Add Custom Symbol */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Add custom symbol (e.g., BASE)"
              value={customSymbol}
              onChange={(e) => setCustomSymbol(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
              className="input flex-1"
            />
            <button
              onClick={handleAddCustom}
              disabled={!customSymbol.trim()}
              className="btn btn-primary"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>
          <p className="text-xs text-foreground-muted">
            Enter any Binance Futures perpetual symbol. USDT will be added automatically.
          </p>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-border">
          {(['popular', 'all', 'custom'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'flex-1 py-3 text-sm font-medium transition-colors',
                activeTab === tab
                  ? 'text-accent border-b-2 border-accent'
                  : 'text-foreground-muted hover:text-foreground'
              )}
            >
              {tab === 'popular' && '⭐ Popular'}
              {tab === 'all' && '📋 All Assets'}
              {tab === 'custom' && '➕ Custom'}
            </button>
          ))}
        </div>
        
        {/* Current Watchlist */}
        <div className="p-4 bg-background-tertiary border-b border-border">
          <p className="text-xs text-foreground-muted mb-2">Current Watchlist ({watchlist.length})</p>
          <div className="flex flex-wrap gap-2">
            {watchlist.map((symbol) => {
              const displayName = symbol.replace('USDT', '/USDT').replace('1000', '');
              
              return (
                <span 
                  key={symbol}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-accent/20 text-accent rounded-lg text-sm"
                >
                  {displayName}
                  <button
                    onClick={() => removeFromWatchlist(symbol)}
                    className="hover:text-danger transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
            {watchlist.length === 0 && (
              <span className="text-foreground-muted text-sm">No assets in watchlist</span>
            )}
          </div>
        </div>
        
        {/* Asset List */}
        <div className="overflow-y-auto max-h-[300px] p-4">
          {activeTab === 'popular' && (
            <div className="grid grid-cols-2 gap-2">
              {popularAssets.map((asset) => (
                <AssetItem
                  key={asset.symbol}
                  asset={asset}
                  isSelected={watchlistSymbols.has(asset.symbol)}
                  onToggle={() => handleToggleAsset(asset)}
                />
              ))}
            </div>
          )}
          
          {activeTab === 'all' && (
            <div className="grid grid-cols-2 gap-2">
              {filteredAssets.map((asset) => (
                <AssetItem
                  key={asset.symbol}
                  asset={asset}
                  isSelected={watchlistSymbols.has(asset.symbol)}
                  onToggle={() => handleToggleAsset(asset)}
                />
              ))}
            </div>
          )}
          
          {activeTab === 'custom' && (
            <div className="space-y-4">
              <div className="p-4 bg-warning/10 border border-warning/30 rounded-xl">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-warning mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-warning">Non-Crypto Assets</p>
                    <p className="text-xs text-foreground-muted mt-1">
                      XAUUSD, DAX, and other non-crypto assets don't have free real-time data. 
                      Custom asset support coming soon.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-border bg-background-tertiary">
          <button
            onClick={onClose}
            className="btn btn-primary w-full"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// Asset Item Component
interface AssetItemProps {
  asset: WatchlistAsset;
  isSelected: boolean;
  onToggle: () => void;
  isManual?: boolean;
}

function AssetItem({ asset, isSelected, onToggle, isManual }: AssetItemProps) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'flex items-center justify-between p-3 rounded-xl border transition-all text-left',
        isSelected
          ? 'bg-accent/10 border-accent'
          : 'bg-background hover:bg-background-tertiary border-border'
      )}
    >
      <div className="flex items-center gap-2">
        <div className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center',
          asset.type === 'crypto' ? 'bg-accent/20' : 
          asset.type === 'forex' ? 'bg-warning/20' : 'bg-info/20'
        )}>
          {asset.type === 'crypto' && <Coins className="w-4 h-4 text-accent" />}
          {asset.type === 'forex' && <TrendingUp className="w-4 h-4 text-warning" />}
          {asset.type === 'index' && <BarChart3 className="w-4 h-4 text-info" />}
        </div>
        <div>
          <p className="font-medium text-foreground text-sm">{asset.displayName}</p>
          <p className="text-xs text-foreground-muted">{asset.symbol}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {isManual && (
          <span className="text-xs text-warning">Manual</span>
        )}
        {isSelected ? (
          <Star className="w-4 h-4 text-accent fill-accent" />
        ) : (
          <Plus className="w-4 h-4 text-foreground-muted" />
        )}
      </div>
    </button>
  );
}
