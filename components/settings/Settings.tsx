'use client';

import { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon,
  Key,
  Save,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  Wifi,
  Bell,
  Palette,
  X,
  Coins,
  Plus,
  Search,
  Trash2,
  DollarSign,
  TrendingUp
} from 'lucide-react';
import { cn, formatPrice } from '@/lib/utils/helpers';
import { useMarketDataStore, BINANCE_FUTURES_ASSETS } from '@/lib/stores';
import { usePaperTradingStore } from '@/lib/stores/paperTradingStore';

// Inline Asset Manager Component
function AssetManagerInline() {
  const [searchQuery, setSearchQuery] = useState('');
  const [customSymbol, setCustomSymbol] = useState('');
  
  const watchlist = useMarketDataStore(state => state.watchlist);
  const addToWatchlist = useMarketDataStore(state => state.addToWatchlist);
  const removeFromWatchlist = useMarketDataStore(state => state.removeFromWatchlist);
  
  const watchlistSet = new Set(watchlist);
  
  const filteredAssets = BINANCE_FUTURES_ASSETS.filter(asset =>
    asset.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    asset.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const handleAddCustom = () => {
    if (!customSymbol.trim()) return;
    // Normalization is now done in the store
    addToWatchlist(customSymbol);
    setCustomSymbol('');
  };
  
  // Get prices to show status
  const prices = useMarketDataStore(state => state.prices);
  
  return (
    <div className="space-y-4">
      {/* Current Watchlist */}
      <div>
        <label className="label">Your Watchlist</label>
        <div className="flex flex-wrap gap-2 mt-2">
          {watchlist.map(symbol => {
            const hasPrice = prices[symbol]?.price;
            return (
              <div 
                key={symbol}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm',
                  hasPrice 
                    ? 'bg-accent/20 text-accent' 
                    : 'bg-warning/20 text-warning'
                )}
                title={hasPrice ? `$${formatPrice(prices[symbol].price)}` : 'No price data - symbol may not exist on Binance Futures'}
              >
                <span>{symbol.replace('USDT', '')}</span>
                {!hasPrice && <span className="text-xs">⚠️</span>}
                <button 
                  onClick={() => removeFromWatchlist(symbol)}
                  className="hover:text-danger"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
        {watchlist.some(s => !prices[s]?.price) && (
          <p className="text-xs text-warning mt-2">
            ⚠️ Yellow symbols have no price data - check if they exist on Binance Futures
          </p>
        )}
      </div>
      
      {/* Add Custom */}
      <div>
        <label className="label">Add Custom Symbol</label>
        <p className="text-xs text-foreground-muted mb-2">
          Enter symbol name (e.g., PEPE, WIF). TradingView format like BTCUSDT.P is auto-converted.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={customSymbol}
            onChange={(e) => setCustomSymbol(e.target.value)}
            placeholder="e.g., PEPE or WIF"
            className="input flex-1"
            onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
          />
          <button onClick={handleAddCustom} className="btn btn-primary">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Search & Add from List */}
      <div>
        <label className="label">Browse Assets</label>
        <div className="relative mb-3">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search assets..."
            className="input pl-10"
          />
        </div>
        <div className="max-h-48 overflow-y-auto space-y-1">
          {filteredAssets.slice(0, 20).map(asset => {
            const isAdded = watchlistSet.has(asset.symbol);
            return (
              <button
                key={asset.symbol}
                onClick={() => isAdded ? removeFromWatchlist(asset.symbol) : addToWatchlist(asset.symbol)}
                className={cn(
                  'w-full flex items-center justify-between p-2 rounded-lg transition-colors',
                  isAdded ? 'bg-accent/20' : 'hover:bg-background-tertiary'
                )}
              >
                <span className="text-sm text-foreground">{asset.displayName}</span>
                {isAdded ? (
                  <Check className="w-4 h-4 text-accent" />
                ) : (
                  <Plus className="w-4 h-4 text-foreground-muted" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface SettingsProps {
  onClose: () => void;
}

export function Settings({ onClose }: SettingsProps) {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'api' | 'trading' | 'assets' | 'alerts' | 'display'>('api');

  // Paper trading settings
  const paperSettings = usePaperTradingStore(state => state.settings);
  const balance = usePaperTradingStore(state => state.balance);
  const updateSettings = usePaperTradingStore(state => state.updateSettings);
  const resetAccount = usePaperTradingStore(state => state.resetAccount);

  // Load saved API key
  useEffect(() => {
    const savedKey = localStorage.getItem('anthropic_api_key') || '';
    setApiKey(savedKey);
  }, []);

  const handleSaveApiKey = () => {
    localStorage.setItem('anthropic_api_key', apiKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const tabs = [
    { id: 'api', label: 'API', icon: Key },
    { id: 'trading', label: 'Trading', icon: DollarSign },
    { id: 'assets', label: 'Assets', icon: Coins },
    { id: 'alerts', label: 'Alerts', icon: Bell },
    { id: 'display', label: 'Display', icon: Palette },
  ];

  return (
    <>
      <div className="modal-overlay" onClick={onClose} />
      <div className="modal-content w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-accent" />
            Settings
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-background-tertiary rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-foreground-muted" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors',
                  activeTab === tab.id
                    ? 'text-accent border-b-2 border-accent'
                    : 'text-foreground-muted hover:text-foreground'
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'api' && (
            <div className="space-y-6">
              {/* Important Notice */}
              <div className="p-4 bg-accent/10 border border-accent/30 rounded-xl">
                <h4 className="font-semibold text-accent mb-2">🔑 Your Personal API Key</h4>
                <p className="text-sm text-foreground-secondary">
                  Each user needs their own API key. Your key is stored locally in your browser only - 
                  it's never shared or stored on any server.
                </p>
              </div>
              
              {/* API Key */}
              <div>
                <label className="label">AI API Key</label>
                <p className="text-sm text-foreground-muted mb-3">
                  Required for AI features (chart analysis, AI Mentor, Scanner).
                </p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-ant-api03-..."
                      className="input pr-10 font-mono text-sm"
                    />
                    <button
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground"
                    >
                      {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <button
                    onClick={handleSaveApiKey}
                    className={cn(
                      'btn px-4',
                      saved ? 'btn-success' : 'btn-primary'
                    )}
                  >
                    {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  </button>
                </div>
                
                {/* Status */}
                <div className="mt-3 flex items-center gap-2">
                  {apiKey ? (
                    <>
                      <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                      <span className="text-sm text-success">API key configured</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-warning" />
                      <span className="text-sm text-warning">No API key set - using basic analysis mode</span>
                    </>
                  )}
                </div>
              </div>

              {/* Connection Status */}
              <div className="p-4 bg-background-tertiary rounded-xl">
                <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-accent" />
                  Connection Status
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-foreground-secondary">Binance WebSocket</span>
                    <span className="flex items-center gap-1 text-success">
                      <div className="w-2 h-2 rounded-full bg-success" />
                      Connected
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-foreground-secondary">AI Analysis</span>
                    <span className={cn(
                      'flex items-center gap-1',
                      apiKey ? 'text-success' : 'text-warning'
                    )}>
                      <div className={cn(
                        'w-2 h-2 rounded-full',
                        apiKey ? 'bg-success' : 'bg-warning'
                      )} />
                      {apiKey ? 'Ready' : 'Demo Mode'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'trading' && (
            <div className="space-y-4">
              {/* Current Balance Display */}
              <div className="p-4 bg-gradient-to-r from-accent/20 to-purple-500/20 rounded-xl border border-accent/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-foreground-muted">Paper Trading Balance</p>
                    <p className="text-2xl font-bold text-foreground">${balance.toLocaleString()}</p>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm('Reset account to starting balance? This will clear all positions and history.')) {
                        resetAccount();
                      }
                    }}
                    className="text-xs text-foreground-muted hover:text-danger transition-colors"
                  >
                    Reset Account
                  </button>
                </div>
              </div>

              {/* Starting Balance */}
              <div className="p-4 bg-background-tertiary rounded-xl">
                <label className="block text-sm font-medium text-foreground mb-2">Starting Balance ($)</label>
                <input
                  type="number"
                  value={paperSettings.startingBalance}
                  onChange={(e) => updateSettings({ startingBalance: Number(e.target.value) })}
                  className="input w-full"
                  min={100}
                  step={100}
                />
              </div>

              {/* Position Size & Leverage */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-background-tertiary rounded-xl">
                  <label className="block text-sm font-medium text-foreground mb-2">Position Size ($)</label>
                  <input
                    type="number"
                    value={paperSettings.defaultSize}
                    onChange={(e) => updateSettings({ defaultSize: Number(e.target.value) })}
                    className="input w-full"
                    min={10}
                    step={10}
                  />
                </div>
                <div className="p-4 bg-background-tertiary rounded-xl">
                  <label className="block text-sm font-medium text-foreground mb-2">Leverage</label>
                  <select
                    value={paperSettings.leverage}
                    onChange={(e) => updateSettings({ leverage: Number(e.target.value) })}
                    className="input w-full"
                  >
                    <option value={1}>1x</option>
                    <option value={2}>2x</option>
                    <option value={3}>3x</option>
                    <option value={5}>5x</option>
                    <option value={10}>10x</option>
                    <option value={20}>20x</option>
                    <option value={50}>50x</option>
                    <option value={100}>100x</option>
                  </select>
                </div>
              </div>

              {/* Auto Trading Toggles */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-background-tertiary rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-foreground">Auto Execute on Trigger</p>
                    <p className="text-xs text-foreground-muted">Open positions when entry zone hit</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={paperSettings.autoExecuteOnTrigger}
                      onChange={(e) => updateSettings({ autoExecuteOnTrigger: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-background-elevated rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-3 bg-background-tertiary rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-foreground">Auto Exit on Target</p>
                    <p className="text-xs text-foreground-muted">Close position when target hit</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={paperSettings.autoExitOnTarget}
                      onChange={(e) => updateSettings({ autoExitOnTarget: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-background-elevated rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-3 bg-background-tertiary rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-foreground">Auto Exit on Stop</p>
                    <p className="text-xs text-foreground-muted">Close position when stop hit</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={paperSettings.autoExitOnStop}
                      onChange={(e) => updateSettings({ autoExitOnStop: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-background-elevated rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'alerts' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-background-tertiary rounded-xl">
                <div>
                  <p className="font-medium text-foreground">Price Alerts</p>
                  <p className="text-sm text-foreground-muted">Get notified when scenarios trigger</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-background-elevated peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-background-tertiary rounded-xl">
                <div>
                  <p className="font-medium text-foreground">Sound Effects</p>
                  <p className="text-sm text-foreground-muted">Play sound on alerts</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-background-elevated peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'assets' && (
            <AssetManagerInline />
          )}

          {activeTab === 'display' && (
            <div className="space-y-4">
              <div className="p-4 bg-background-tertiary rounded-xl">
                <p className="font-medium text-foreground mb-2">Theme</p>
                <div className="flex gap-2">
                  <button className="flex-1 p-3 bg-[#0a0a0f] border-2 border-accent rounded-lg text-center">
                    <span className="text-sm text-foreground">Dark</span>
                  </button>
                  <button className="flex-1 p-3 bg-gray-200 border-2 border-transparent rounded-lg text-center opacity-50">
                    <span className="text-sm text-gray-600">Light</span>
                  </button>
                </div>
              </div>
              
              <div className="p-4 bg-background-tertiary rounded-xl">
                <p className="font-medium text-foreground mb-2">Default Timeframe</p>
                <select className="input w-full">
                  <option value="1h">1 Hour</option>
                  <option value="4h" selected>4 Hours</option>
                  <option value="1d">1 Day</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
