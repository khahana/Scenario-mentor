'use client';

import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
  Search,
  TrendingUp,
  TrendingDown,
  Zap,
  Target,
  AlertTriangle,
  RefreshCw,
  Brain,
  Plus,
  Flame,
  Activity,
  BarChart2
} from 'lucide-react';
import { useMarketDataStore, useUIStore } from '@/lib/stores';
import { cn, generateId, formatPrice } from '@/lib/utils/helpers';

// Scanner result for each asset
interface ScanResult {
  symbol: string;
  price: number;
  change24h: number;
  score: number;
  signals: Signal[];
  setupType: 'breakout' | 'reversal' | 'continuation' | 'range' | 'none';
  direction: 'long' | 'short' | 'neutral';
  keyLevels: {
    support: number;
    resistance: number;
    entryZone?: { low: number; high: number };
  };
  volatility: 'low' | 'medium' | 'high';
  aiAnalysis?: string;
  isAnalyzing?: boolean;
}

interface Signal {
  type: 'bullish' | 'bearish' | 'neutral';
  name: string;
  description: string;
  weight: number;
}

// Technical analysis functions
function calculateVolatilityScore(high: number, low: number, price: number): number {
  const range = ((high - low) / price) * 100;
  // Lower range = tighter consolidation = higher breakout potential
  if (range < 2) return 95; // Very tight
  if (range < 4) return 80;
  if (range < 6) return 60;
  if (range < 10) return 40;
  return 20;
}

function calculateMomentumScore(change24h: number): { score: number; direction: 'long' | 'short' | 'neutral' } {
  const absChange = Math.abs(change24h);
  if (absChange < 0.5) return { score: 50, direction: 'neutral' };
  if (absChange < 2) return { score: 60, direction: change24h > 0 ? 'long' : 'short' };
  if (absChange < 5) return { score: 70, direction: change24h > 0 ? 'long' : 'short' };
  return { score: 80, direction: change24h > 0 ? 'long' : 'short' };
}

function calculateLevelProximity(price: number, high24h: number, low24h: number): { 
  score: number; 
  nearLevel: 'resistance' | 'support' | 'middle';
  distance: number;
} {
  const range = high24h - low24h;
  const distanceToHigh = ((high24h - price) / range) * 100;
  const distanceToLow = ((price - low24h) / range) * 100;
  
  if (distanceToHigh < 10) {
    return { score: 85, nearLevel: 'resistance', distance: distanceToHigh };
  }
  if (distanceToLow < 10) {
    return { score: 85, nearLevel: 'support', distance: distanceToLow };
  }
  if (distanceToHigh < 25 || distanceToLow < 25) {
    return { 
      score: 65, 
      nearLevel: distanceToHigh < distanceToLow ? 'resistance' : 'support',
      distance: Math.min(distanceToHigh, distanceToLow)
    };
  }
  return { score: 40, nearLevel: 'middle', distance: 50 };
}

function analyzeAsset(symbol: string, priceData: any): ScanResult {
  const { price, changePercent24h, high24h, low24h } = priceData;
  
  const signals: Signal[] = [];
  let totalScore = 0;
  let weightSum = 0;
  
  // 1. Volatility Analysis (Squeeze Detection)
  const volScore = calculateVolatilityScore(high24h, low24h, price);
  const volWeight = 30;
  totalScore += volScore * volWeight;
  weightSum += volWeight;
  
  const range24h = ((high24h - low24h) / price) * 100;
  if (range24h < 3) {
    signals.push({
      type: 'bullish',
      name: 'Tight Squeeze',
      description: `Only ${range24h.toFixed(1)}% 24h range - breakout imminent`,
      weight: 25
    });
  } else if (range24h < 5) {
    signals.push({
      type: 'neutral',
      name: 'Consolidation',
      description: `${range24h.toFixed(1)}% range - building energy`,
      weight: 15
    });
  }
  
  // 2. Momentum Analysis
  const { score: momScore, direction: momDirection } = calculateMomentumScore(changePercent24h);
  const momWeight = 25;
  totalScore += momScore * momWeight;
  weightSum += momWeight;
  
  if (Math.abs(changePercent24h) > 3) {
    signals.push({
      type: changePercent24h > 0 ? 'bullish' : 'bearish',
      name: changePercent24h > 0 ? 'Strong Momentum' : 'Selling Pressure',
      description: `${changePercent24h > 0 ? '+' : ''}${changePercent24h.toFixed(2)}% in 24h`,
      weight: 20
    });
  }
  
  // 3. Level Proximity
  const levelAnalysis = calculateLevelProximity(price, high24h, low24h);
  const levelWeight = 35;
  totalScore += levelAnalysis.score * levelWeight;
  weightSum += levelWeight;
  
  if (levelAnalysis.nearLevel === 'support' && levelAnalysis.distance < 15) {
    signals.push({
      type: 'bullish',
      name: 'Testing Support',
      description: `${levelAnalysis.distance.toFixed(1)}% from 24h low - potential bounce`,
      weight: 25
    });
  } else if (levelAnalysis.nearLevel === 'resistance' && levelAnalysis.distance < 15) {
    signals.push({
      type: changePercent24h > 2 ? 'bullish' : 'bearish',
      name: 'At Resistance',
      description: `${levelAnalysis.distance.toFixed(1)}% from 24h high - ${changePercent24h > 2 ? 'breakout?' : 'rejection?'}`,
      weight: 25
    });
  }
  
  // 4. Determine Setup Type
  let setupType: ScanResult['setupType'] = 'none';
  let direction: ScanResult['direction'] = 'neutral';
  
  if (range24h < 4 && levelAnalysis.nearLevel !== 'middle') {
    setupType = 'breakout';
    direction = levelAnalysis.nearLevel === 'resistance' ? 'long' : 'short';
  } else if (levelAnalysis.nearLevel === 'support' && changePercent24h < -2) {
    setupType = 'reversal';
    direction = 'long';
  } else if (levelAnalysis.nearLevel === 'resistance' && changePercent24h > 2) {
    setupType = 'continuation';
    direction = 'long';
  } else if (range24h > 6) {
    setupType = 'range';
    direction = levelAnalysis.nearLevel === 'support' ? 'long' : 'short';
  }
  
  // Calculate final score
  const finalScore = Math.round(totalScore / weightSum);
  
  // Determine volatility level
  let volatility: ScanResult['volatility'] = 'medium';
  if (range24h < 3) volatility = 'low';
  else if (range24h > 8) volatility = 'high';
  
  // Calculate key levels
  const buffer = range24h * 0.1;
  const support = low24h;
  const resistance = high24h;
  
  let entryZone: { low: number; high: number } | undefined;
  if (setupType !== 'none') {
    if (direction === 'long') {
      entryZone = {
        low: support * 0.998,
        high: support * 1.005
      };
    } else if (direction === 'short') {
      entryZone = {
        low: resistance * 0.995,
        high: resistance * 1.002
      };
    }
  }
  
  return {
    symbol,
    price,
    change24h: changePercent24h,
    score: finalScore,
    signals,
    setupType,
    direction,
    keyLevels: {
      support,
      resistance,
      entryZone
    },
    volatility
  };
}

export function MarketScanner() {
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScan, setLastScan] = useState<Date | null>(null);
  const [filter, setFilter] = useState<'all' | 'hot' | 'bullish' | 'bearish'>('all');
  const [hasInitialScan, setHasInitialScan] = useState(false);
  
  const prices = useMarketDataStore(state => state.prices);
  const watchlist = useMarketDataStore(state => state.watchlist);
  const setActiveView = useUIStore(state => state.setActiveView);
  
  // Full scan - analyzes everything fresh
  const runScan = useCallback(() => {
    setIsScanning(true);
    
    const results: ScanResult[] = [];
    
    for (const symbol of watchlist) {
      const priceData = prices[symbol];
      if (!priceData?.price) continue;
      
      const result = analyzeAsset(symbol, priceData);
      results.push(result);
    }
    
    // Sort by score
    results.sort((a, b) => b.score - a.score);
    
    setScanResults(results);
    setLastScan(new Date());
    setIsScanning(false);
    setHasInitialScan(true);
  }, [watchlist, prices]);
  
  // Initial scan on mount (once)
  useEffect(() => {
    if (!hasInitialScan && Object.keys(prices).length > 0) {
      runScan();
    }
  }, [prices, hasInitialScan, runScan]);
  
  // Update only prices in existing results (preserves AI analysis, expanded state etc)
  useEffect(() => {
    if (hasInitialScan && scanResults.length > 0) {
      setScanResults(prev => prev.map(result => {
        const priceData = prices[result.symbol];
        if (!priceData?.price) return result;
        
        // Only update price-related fields, keep everything else
        return {
          ...result,
          price: priceData.price,
          change24h: priceData.changePercent24h || result.change24h,
          keyLevels: {
            ...result.keyLevels,
            // Keep support/resistance from original scan
          }
        };
      }));
    }
  }, [prices, hasInitialScan]);
  
  // AI Analysis for specific asset
  const analyzeWithAI = async (result: ScanResult) => {
    // Update state to show loading
    setScanResults(prev => prev.map(r => 
      r.symbol === result.symbol ? { ...r, isAnalyzing: true } : r
    ));
    
    try {
      const apiKey = localStorage.getItem('anthropic_api_key');
      if (!apiKey) {
        setScanResults(prev => prev.map(r => 
          r.symbol === result.symbol ? { 
            ...r, 
            isAnalyzing: false, 
            aiAnalysis: '⚠️ Add API key in Settings for AI analysis' 
          } : r
        ));
        return;
      }
      
      const prompt = `Analyze this crypto setup for ${result.symbol}:

Current Price: $${formatPrice(result.price)}
24h Change: ${result.change24h.toFixed(2)}%
24h High: $${formatPrice(result.keyLevels.resistance)}
24h Low: $${formatPrice(result.keyLevels.support)}
Setup Type: ${result.setupType}
Direction Bias: ${result.direction}
Technical Score: ${result.score}/100

Signals detected:
${result.signals.map(s => `- ${s.name}: ${s.description}`).join('\n')}

In 2-3 sentences, give a quick trading thesis. Should a trader consider this setup? What's the key level to watch? Be direct and actionable.`;

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          systemPrompt: 'You are a professional crypto trading analyst. Give concise, actionable analysis. No markdown formatting, just plain text.',
          apiKey: apiKey
        })
      });
      
      const data = await response.json();
      
      if (data.success && data.response) {
        setScanResults(prev => prev.map(r => 
          r.symbol === result.symbol ? { 
            ...r, 
            isAnalyzing: false, 
            aiAnalysis: data.response 
          } : r
        ));
      } else {
        setScanResults(prev => prev.map(r => 
          r.symbol === result.symbol ? { 
            ...r, 
            isAnalyzing: false, 
            aiAnalysis: data.error || 'Analysis unavailable' 
          } : r
        ));
      }
    } catch (error) {
      console.error('AI analysis error:', error);
      setScanResults(prev => prev.map(r => 
        r.symbol === result.symbol ? { 
          ...r, 
          isAnalyzing: false, 
          aiAnalysis: 'Error getting AI analysis' 
        } : r
      ));
    }
  };
  
  // Create Battle Card from scan result
  const createCardFromScan = (result: ScanResult) => {
    // Set the prefill symbol so Battle Card creator uses it
    const { setPrefillSymbol } = useUIStore.getState();
    const displaySymbol = result.symbol.replace('USDT', '/USDT');
    setPrefillSymbol(displaySymbol);
    
    // Navigate to battle card creator
    setActiveView('battle-card');
  };
  
  // Memoized filter results to prevent re-renders
  const filteredResults = useMemo(() => {
    return scanResults.filter(r => {
      if (filter === 'all') return true;
      if (filter === 'hot') return r.score >= 70;
      if (filter === 'bullish') return r.direction === 'long';
      if (filter === 'bearish') return r.direction === 'short';
      return true;
    });
  }, [scanResults, filter]);
  
  const hotSetups = useMemo(() => {
    return scanResults.filter(r => r.score >= 70);
  }, [scanResults]);
  
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <Search className="w-7 h-7 text-accent" />
            Market Scanner
          </h1>
          <p className="text-foreground-secondary mt-1">
            Technical analysis across {watchlist.length} assets
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {lastScan && (
            <span className="text-sm text-foreground-muted">
              Last scan: {lastScan.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={runScan}
            disabled={isScanning}
            className="btn btn-primary flex items-center gap-2"
          >
            <RefreshCw className={cn('w-4 h-4', isScanning && 'animate-spin')} />
            {isScanning ? 'Scanning...' : 'Scan Now'}
          </button>
        </div>
      </div>
      
      {/* Hot Setups Summary */}
      {hotSetups.length > 0 && (
        <div className="p-4 bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Flame className="w-5 h-5 text-orange-500" />
            <span className="font-semibold text-foreground">
              {hotSetups.length} Hot Setup{hotSetups.length > 1 ? 's' : ''} Detected
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {hotSetups.map(setup => (
              <span 
                key={setup.symbol}
                className="px-3 py-1 bg-background/50 rounded-full text-sm font-medium text-foreground flex items-center gap-2"
              >
                {setup.symbol.replace('USDT', '')}
                <span className={cn(
                  'text-xs font-bold',
                  setup.direction === 'long' ? 'text-success' : 
                  setup.direction === 'short' ? 'text-danger' : 'text-foreground-muted'
                )}>
                  {setup.direction === 'long' ? '↑' : setup.direction === 'short' ? '↓' : '~'}
                </span>
                <span className="text-orange-500">{setup.score}</span>
              </span>
            ))}
          </div>
        </div>
      )}
      
      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'hot', 'bullish', 'bearish'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              filter === f 
                ? 'bg-accent text-white' 
                : 'bg-background-tertiary text-foreground-secondary hover:bg-background-elevated'
            )}
          >
            {f === 'all' && `All (${scanResults.length})`}
            {f === 'hot' && `🔥 Hot (${hotSetups.length})`}
            {f === 'bullish' && '↑ Long'}
            {f === 'bearish' && '↓ Short'}
          </button>
        ))}
      </div>
      
      {/* Results Grid - 3 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredResults.map(result => (
          <div 
            key={result.symbol}
            className={cn(
              'rounded-2xl overflow-hidden',
              'bg-gradient-to-b from-background-secondary to-background-tertiary/50',
              'hover:shadow-lg hover:shadow-black/20 transition-shadow duration-200',
              result.score >= 80 
                ? 'ring-2 ring-orange-500/40 shadow-orange-500/10' 
                : result.score >= 70 
                ? 'ring-1 ring-warning/30' 
                : 'ring-1 ring-border/30 hover:ring-border/60'
            )}
          >
            {/* Card Header - Gradient top bar */}
            <div className={cn(
              'h-1',
              result.score >= 80 ? 'bg-gradient-to-r from-orange-500 to-red-500' :
              result.score >= 70 ? 'bg-gradient-to-r from-warning to-orange-400' :
              result.direction === 'long' ? 'bg-gradient-to-r from-success/50 to-success' :
              result.direction === 'short' ? 'bg-gradient-to-r from-danger/50 to-danger' :
              'bg-gradient-to-r from-accent/30 to-accent/50'
            )} />
            
            <div className="p-4">
              {/* Header Row */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-2xl font-bold text-foreground tracking-tight">
                      {result.symbol.replace('USDT', '')}
                    </h3>
                    {result.direction !== 'neutral' && (
                      <div className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold',
                        result.direction === 'long' 
                          ? 'bg-success text-white' 
                          : 'bg-danger text-white'
                      )}>
                        {result.direction === 'long' ? '↑' : '↓'}
                      </div>
                    )}
                  </div>
                  <div className="flex items-baseline gap-3">
                    <span className="text-xl font-mono font-semibold text-foreground">
                      ${formatPrice(result.price)}
                    </span>
                    <span className={cn(
                      'text-sm font-mono font-bold',
                      result.change24h >= 0 ? 'text-success' : 'text-danger'
                    )}>
                      {result.change24h >= 0 ? '+' : ''}{result.change24h.toFixed(2)}%
                    </span>
                  </div>
                </div>
                
                {/* Score Circle */}
                <div className={cn(
                  'w-14 h-14 rounded-full flex flex-col items-center justify-center',
                  'shadow-lg',
                  result.score >= 80 
                    ? 'bg-gradient-to-br from-orange-400 to-red-500 text-white' 
                    : result.score >= 70 
                    ? 'bg-gradient-to-br from-warning to-orange-400 text-black' 
                    : result.score >= 50 
                    ? 'bg-gradient-to-br from-accent/80 to-accent text-white' 
                    : 'bg-background-elevated text-foreground-muted'
                )}>
                  <span className="text-lg font-bold leading-none">{result.score}</span>
                  <span className="text-[9px] uppercase tracking-wider opacity-80">Score</span>
                </div>
              </div>
              
              {/* Tags Row */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {result.setupType !== 'none' && (
                  <span className="text-[11px] px-2.5 py-1 rounded-full bg-accent/15 text-accent font-semibold uppercase tracking-wide">
                    {result.setupType}
                  </span>
                )}
                <span className={cn(
                  'text-[11px] px-2.5 py-1 rounded-full font-semibold uppercase tracking-wide',
                  result.volatility === 'low' ? 'bg-success/15 text-success' :
                  result.volatility === 'high' ? 'bg-danger/15 text-danger' :
                  'bg-foreground-muted/15 text-foreground-muted'
                )}>
                  {result.volatility === 'low' ? '● Tight Range' : result.volatility === 'high' ? '◐ Wide Range' : '○ Normal'}
                </span>
              </div>
              
              {/* Price Levels Bar */}
              <div className="relative mb-4">
                <div className="flex justify-between text-[10px] text-foreground-muted mb-1">
                  <span>24h Low</span>
                  <span>24h High</span>
                </div>
                <div className="h-2 rounded-full bg-gradient-to-r from-success/20 via-foreground-muted/20 to-danger/20 relative">
                  {/* Current price indicator */}
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-accent ring-2 ring-background shadow-lg"
                    style={{
                      left: `${Math.min(95, Math.max(5, ((result.price - result.keyLevels.support) / (result.keyLevels.resistance - result.keyLevels.support)) * 100))}%`
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs font-mono mt-1">
                  <span className="text-success font-medium">${formatPrice(result.keyLevels.support)}</span>
                  <span className="text-danger font-medium">${formatPrice(result.keyLevels.resistance)}</span>
                </div>
              </div>
              
              {/* Signals - Compact */}
              {result.signals.length > 0 && (
                <div className="space-y-1.5">
                  {result.signals.slice(0, 3).map((signal, i) => (
                    <div 
                      key={i}
                      className="flex items-start gap-2 text-xs"
                    >
                      <span className={cn(
                        'mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0',
                        signal.type === 'bullish' ? 'bg-success' :
                        signal.type === 'bearish' ? 'bg-danger' : 'bg-foreground-muted'
                      )} />
                      <span className="text-foreground-secondary leading-snug">
                        <span className={cn(
                          'font-semibold',
                          signal.type === 'bullish' ? 'text-success' :
                          signal.type === 'bearish' ? 'text-danger' : 'text-foreground-muted'
                        )}>
                          {signal.name}
                        </span>
                        {' — '}
                        {signal.description}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="grid grid-cols-2 border-t border-border/20">
              <button
                onClick={() => analyzeWithAI(result)}
                disabled={result.isAnalyzing}
                className="py-3 text-xs font-semibold text-purple-400 hover:bg-purple-500/10 active:bg-purple-500/20 transition-colors flex items-center justify-center gap-2 border-r border-border/20"
              >
                <Brain className={cn('w-4 h-4', result.isAnalyzing && 'animate-pulse')} />
                {result.isAnalyzing ? 'Analyzing...' : 'AI Analyze'}
              </button>
              <button
                onClick={() => createCardFromScan(result)}
                className="py-3 text-xs font-semibold text-accent hover:bg-accent/10 active:bg-accent/20 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create Card
              </button>
            </div>
            
            {/* AI Analysis Panel */}
            {result.aiAnalysis && (
              <div className="px-4 py-3 bg-purple-500/5 border-t border-purple-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-semibold text-purple-400 uppercase tracking-wide">AI Insight</span>
                </div>
                <p className="text-xs text-foreground-secondary leading-relaxed">{result.aiAnalysis}</p>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {filteredResults.length === 0 && (
        <div className="text-center py-20 text-foreground-muted">
          <Search className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-xl font-medium">No setups found</p>
          <p className="text-sm mt-2 opacity-70">Add more assets to your watchlist in Settings</p>
        </div>
      )}
    </div>
  );
}
