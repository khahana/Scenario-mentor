'use client';

import { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
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
  BarChart2,
  Bell,
  X
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
  // Futures-specific data
  fundingRate?: number;
  openInterest?: number;
  oiChange24h?: number;
  volume24h?: number;
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

// Funding rate analysis - extreme funding = potential reversal
function analyzeFundingRate(fundingRate: number): { score: number; signal: Signal | null } {
  const rate = fundingRate * 100; // Convert to percentage
  
  if (Math.abs(rate) < 0.01) {
    return { score: 50, signal: null }; // Neutral
  }
  
  if (rate > 0.05) {
    // High positive = longs paying shorts = potential long squeeze
    return {
      score: 80,
      signal: {
        type: 'bearish',
        name: 'High Funding',
        description: `+${rate.toFixed(3)}% - longs overleveraged, squeeze risk`,
        weight: 20
      }
    };
  }
  
  if (rate < -0.03) {
    // Negative = shorts paying longs = potential short squeeze
    return {
      score: 85,
      signal: {
        type: 'bullish',
        name: 'Negative Funding',
        description: `${rate.toFixed(3)}% - shorts paying, squeeze potential`,
        weight: 25
      }
    };
  }
  
  if (rate > 0.02) {
    return {
      score: 65,
      signal: {
        type: 'neutral',
        name: 'Elevated Funding',
        description: `+${rate.toFixed(3)}% - moderate long bias`,
        weight: 10
      }
    };
  }
  
  return { score: 55, signal: null };
}

// Open Interest analysis - rising OI with price = conviction
function analyzeOpenInterest(oiChange: number, priceChange: number): { score: number; signal: Signal | null } {
  if (Math.abs(oiChange) < 2) {
    return { score: 50, signal: null }; // Minimal OI change
  }
  
  const oiRising = oiChange > 0;
  const priceRising = priceChange > 0;
  
  if (oiRising && priceRising && oiChange > 5) {
    // Rising OI + Rising price = strong bullish conviction
    return {
      score: 90,
      signal: {
        type: 'bullish',
        name: 'OI Surge + Price Up',
        description: `OI +${oiChange.toFixed(1)}% - new longs entering with conviction`,
        weight: 25
      }
    };
  }
  
  if (oiRising && !priceRising && oiChange > 5) {
    // Rising OI + Falling price = shorts building
    return {
      score: 75,
      signal: {
        type: 'bearish',
        name: 'OI Surge + Price Down',
        description: `OI +${oiChange.toFixed(1)}% - shorts building positions`,
        weight: 20
      }
    };
  }
  
  if (!oiRising && priceRising && oiChange < -5) {
    // Falling OI + Rising price = short squeeze / profit taking
    return {
      score: 70,
      signal: {
        type: 'neutral',
        name: 'Short Squeeze',
        description: `OI ${oiChange.toFixed(1)}% - shorts covering, watch for exhaustion`,
        weight: 15
      }
    };
  }
  
  if (!oiRising && !priceRising && oiChange < -5) {
    // Falling OI + Falling price = long liquidations
    return {
      score: 65,
      signal: {
        type: 'bearish',
        name: 'Long Liquidations',
        description: `OI ${oiChange.toFixed(1)}% - longs closing, capitulation?`,
        weight: 15
      }
    };
  }
  
  return { score: 55, signal: null };
}

interface FuturesData {
  fundingRate?: number;
  openInterest?: number;
  oiChange24h?: number;
  volume24h?: number;
  priceChange24h?: number;
}

function analyzeAsset(symbol: string, priceData: any, futuresData?: FuturesData): ScanResult {
  const { price, changePercent24h, high24h, low24h, volume } = priceData;
  
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
  
  // 4. Funding Rate Analysis (if available)
  let fundingScore = 50;
  if (futuresData?.fundingRate !== undefined) {
    const fundingAnalysis = analyzeFundingRate(futuresData.fundingRate);
    fundingScore = fundingAnalysis.score;
    const fundingWeight = 15;
    totalScore += fundingScore * fundingWeight;
    weightSum += fundingWeight;
    
    if (fundingAnalysis.signal) {
      signals.push(fundingAnalysis.signal);
    }
  }
  
  // 5. Open Interest Analysis (if available)
  let oiScore = 50;
  if (futuresData?.oiChange24h !== undefined) {
    const oiAnalysis = analyzeOpenInterest(futuresData.oiChange24h, changePercent24h);
    oiScore = oiAnalysis.score;
    const oiWeight = 15;
    totalScore += oiScore * oiWeight;
    weightSum += oiWeight;
    
    if (oiAnalysis.signal) {
      signals.push(oiAnalysis.signal);
    }
  }
  
  // 6. Determine Setup Type
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
  
  // Adjust direction based on funding if extreme
  if (futuresData?.fundingRate !== undefined) {
    const rate = futuresData.fundingRate * 100;
    if (rate > 0.05 && direction === 'long') {
      // High positive funding might flip direction to short
      direction = 'neutral'; // Caution on longs
    } else if (rate < -0.03 && direction === 'short') {
      // Negative funding might flip direction to long
      direction = 'neutral'; // Caution on shorts
    }
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
    volatility,
    fundingRate: futuresData?.fundingRate,
    openInterest: futuresData?.openInterest,
    oiChange24h: futuresData?.oiChange24h,
    volume24h: futuresData?.volume24h || volume
  };
}

// Notification type for hot setup alerts
interface HotSetupNotification {
  id: string;
  type: 'hot' | 'very_hot';
  symbols: string[];
  timestamp: Date;
}

export function MarketScanner() {
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScan, setLastScan] = useState<Date | null>(null);
  const [filter, setFilter] = useState<'all' | 'hot' | 'bullish' | 'bearish'>('all');
  const [hasInitialScan, setHasInitialScan] = useState(false);
  const [futuresDataCache, setFuturesDataCache] = useState<Record<string, FuturesData>>({});
  const [notifications, setNotifications] = useState<HotSetupNotification[]>([]);
  const previousHotSetupsRef = useRef<Set<string>>(new Set());
  
  const prices = useMarketDataStore(state => state.prices);
  const watchlist = useMarketDataStore(state => state.watchlist);
  const setActiveView = useUIStore(state => state.setActiveView);
  
  // Request browser notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);
  
  // Send browser notification
  const sendBrowserNotification = useCallback((title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '🔥',
        tag: 'hot-setup', // Prevents duplicate notifications
      });
    }
  }, []);
  
  // Add notification to stack
  const addNotification = useCallback((type: 'hot' | 'very_hot', symbols: string[]) => {
    const notification: HotSetupNotification = {
      id: generateId(),
      type,
      symbols,
      timestamp: new Date()
    };
    setNotifications(prev => [notification, ...prev].slice(0, 5)); // Keep last 5
    
    // Also send browser notification
    const emoji = type === 'very_hot' ? '🔥🔥' : '🔥';
    const title = type === 'very_hot' ? 'Very Hot Setup Detected!' : 'Hot Setup Detected!';
    const body = `${symbols.join(', ')} - Score ${type === 'very_hot' ? '80+' : '70+'}`;
    sendBrowserNotification(title, body);
    
    // Auto-dismiss after 10 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 10000);
  }, [sendBrowserNotification]);
  
  // Remove notification
  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);
  
  // Fetch futures data (funding rate, OI) for all symbols
  const fetchFuturesData = useCallback(async (symbols: string[]): Promise<Record<string, FuturesData>> => {
    const futuresData: Record<string, FuturesData> = {};
    
    try {
      // Fetch funding rates for all symbols
      const fundingPromises = symbols.map(async (symbol) => {
        try {
          const response = await fetch(`https://fapi.binance.com/fapi/v1/fundingRate?symbol=${symbol}&limit=1`);
          if (response.ok) {
            const data = await response.json();
            if (data && data[0]) {
              return { symbol, fundingRate: parseFloat(data[0].fundingRate) };
            }
          }
        } catch (e) {
          console.warn(`Failed to fetch funding for ${symbol}`);
        }
        return { symbol, fundingRate: undefined };
      });
      
      // Fetch open interest for all symbols
      const oiPromises = symbols.map(async (symbol) => {
        try {
          // Fetch OI and mark price together to calculate USD value
          const [oiResponse, priceResponse] = await Promise.all([
            fetch(`https://fapi.binance.com/fapi/v1/openInterest?symbol=${symbol}`),
            fetch(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${symbol}`)
          ]);
          
          if (oiResponse.ok && priceResponse.ok) {
            const oiData = await oiResponse.json();
            const priceData = await priceResponse.json();
            if (oiData && priceData) {
              const oiQuantity = parseFloat(oiData.openInterest);
              const markPrice = parseFloat(priceData.markPrice);
              // OI in USD = quantity * mark price
              return { symbol, openInterest: oiQuantity * markPrice };
            }
          }
        } catch (e) {
          console.warn(`Failed to fetch OI for ${symbol}`);
        }
        return { symbol, openInterest: undefined };
      });
      
      // Fetch 24h ticker for volume and OI change estimation
      const tickerPromises = symbols.map(async (symbol) => {
        try {
          const response = await fetch(`https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=${symbol}`);
          if (response.ok) {
            const data = await response.json();
            if (data) {
              return { 
                symbol, 
                volume24h: parseFloat(data.quoteVolume),
                priceChange24h: parseFloat(data.priceChangePercent)
              };
            }
          }
        } catch (e) {
          console.warn(`Failed to fetch ticker for ${symbol}`);
        }
        return { symbol, volume24h: undefined, priceChange24h: undefined };
      });

      // Fetch OI statistics for real OI change
      const oiStatsPromises = symbols.map(async (symbol) => {
        try {
          // Get OI from 24h ago vs now using Binance futures statistics
          const response = await fetch(`https://fapi.binance.com/futures/data/openInterestHist?symbol=${symbol}&period=1d&limit=2`);
          if (response.ok) {
            const data = await response.json();
            if (data && data.length >= 2) {
              const currentOI = parseFloat(data[0].sumOpenInterest);
              const prevOI = parseFloat(data[1].sumOpenInterest);
              const oiChange = ((currentOI - prevOI) / prevOI) * 100;
              return { symbol, oiChange24h: oiChange };
            }
          }
        } catch (e) {
          console.warn(`Failed to fetch OI stats for ${symbol}`);
        }
        return { symbol, oiChange24h: undefined };
      });
      
      const [fundingResults, oiResults, tickerResults, oiStatsResults] = await Promise.all([
        Promise.all(fundingPromises),
        Promise.all(oiPromises),
        Promise.all(tickerPromises),
        Promise.all(oiStatsPromises)
      ]);
      
      // Combine results
      for (const symbol of symbols) {
        const funding = fundingResults.find(f => f.symbol === symbol);
        const oi = oiResults.find(o => o.symbol === symbol);
        const ticker = tickerResults.find(t => t.symbol === symbol);
        const oiStats = oiStatsResults.find(o => o.symbol === symbol);
        
        futuresData[symbol] = {
          fundingRate: funding?.fundingRate,
          openInterest: oi?.openInterest,
          oiChange24h: oiStats?.oiChange24h,
          volume24h: ticker?.volume24h,
          priceChange24h: ticker?.priceChange24h
        };
      }
    } catch (error) {
      console.error('Error fetching futures data:', error);
    }
    
    return futuresData;
  }, []);
  
  // Full scan - analyzes everything fresh
  const runScan = useCallback(async () => {
    setIsScanning(true);
    
    try {
      // Fetch futures data for all watchlist symbols
      const futuresData = await fetchFuturesData(watchlist);
      setFuturesDataCache(futuresData);
      
      const results: ScanResult[] = [];
      
      for (const symbol of watchlist) {
        const priceData = prices[symbol];
        if (!priceData?.price) continue;
        
        const result = analyzeAsset(symbol, priceData, futuresData[symbol]);
        results.push(result);
      }
      
      // Sort by score
      results.sort((a, b) => b.score - a.score);
      
      // Detect NEW hot setups (not seen before)
      const veryHotSetups = results.filter(r => r.score >= 80);
      const hotSetups = results.filter(r => r.score >= 70 && r.score < 80);
      
      // Find new very hot setups
      const newVeryHot = veryHotSetups.filter(r => !previousHotSetupsRef.current.has(`${r.symbol}-veryhot`));
      const newHot = hotSetups.filter(r => !previousHotSetupsRef.current.has(`${r.symbol}-hot`));
      
      // Notify for new very hot setups
      if (newVeryHot.length > 0) {
        addNotification('very_hot', newVeryHot.map(r => r.symbol.replace('USDT', '')));
      }
      
      // Notify for new hot setups
      if (newHot.length > 0) {
        addNotification('hot', newHot.map(r => r.symbol.replace('USDT', '')));
      }
      
      // Update tracking of known hot setups
      const newHotSet = new Set<string>();
      veryHotSetups.forEach(r => newHotSet.add(`${r.symbol}-veryhot`));
      hotSetups.forEach(r => newHotSet.add(`${r.symbol}-hot`));
      previousHotSetupsRef.current = newHotSet;
      
      setScanResults(results);
      setLastScan(new Date());
      setHasInitialScan(true);
    } catch (error) {
      console.error('Scan error:', error);
    } finally {
      setIsScanning(false);
    }
  }, [watchlist, prices, fetchFuturesData, addNotification]);
  
  // Initial scan on mount (once)
  useEffect(() => {
    if (!hasInitialScan && Object.keys(prices).length > 0) {
      runScan();
    }
  }, [prices, hasInitialScan, runScan]);
  
  // Auto-scan every 5 minutes to detect new hot setups
  useEffect(() => {
    if (!hasInitialScan) return;
    
    const interval = setInterval(() => {
      runScan();
    }, 5 * 60 * 1000); // 5 minutes
    
    return () => clearInterval(interval);
  }, [hasInitialScan, runScan]);
  
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
${result.fundingRate !== undefined ? `Funding Rate: ${(result.fundingRate * 100).toFixed(4)}% (${result.fundingRate > 0.0003 ? 'longs overleveraged' : result.fundingRate < -0.0001 ? 'shorts overleveraged' : 'neutral'})` : ''}
${result.openInterest !== undefined ? `Open Interest: ${result.openInterest >= 1000000 ? (result.openInterest / 1000000).toFixed(1) + 'M' : (result.openInterest / 1000).toFixed(0) + 'K'}` : ''}
${result.oiChange24h !== undefined ? `OI Change 24h: ${result.oiChange24h > 0 ? '+' : ''}${result.oiChange24h.toFixed(1)}%` : ''}

Signals detected:
${result.signals.map(s => `- ${s.name}: ${s.description}`).join('\n')}

In 2-3 sentences, give a quick trading thesis considering the funding and OI data. Should a trader consider this setup? What's the key level to watch? Be direct and actionable.`;

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
      {/* Hot Setup Notifications Toast */}
      {notifications.length > 0 && (
        <div className="fixed top-20 right-6 z-50 space-y-2 max-w-sm">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={cn(
                'p-4 rounded-xl shadow-xl border animate-slide-up flex items-start gap-3',
                notif.type === 'very_hot' 
                  ? 'bg-gradient-to-r from-orange-500/20 to-red-500/20 border-red-500/50'
                  : 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-orange-500/50'
              )}
            >
              <div className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                notif.type === 'very_hot' ? 'bg-red-500/20' : 'bg-orange-500/20'
              )}>
                <Flame className={cn(
                  'w-5 h-5',
                  notif.type === 'very_hot' ? 'text-red-500' : 'text-orange-500'
                )} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  'font-semibold text-sm',
                  notif.type === 'very_hot' ? 'text-red-400' : 'text-orange-400'
                )}>
                  {notif.type === 'very_hot' ? '🔥🔥 Very Hot Setup!' : '🔥 Hot Setup Detected'}
                </p>
                <p className="text-foreground font-medium text-sm mt-0.5">
                  {notif.symbols.join(', ')}
                </p>
                <p className="text-foreground-muted text-xs mt-1">
                  Score {notif.type === 'very_hot' ? '80+' : '70+'} • {notif.timestamp.toLocaleTimeString()}
                </p>
              </div>
              <button
                onClick={() => dismissNotification(notif.id)}
                className="p-1 rounded hover:bg-background-tertiary text-foreground-muted hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

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
              <div className="flex flex-wrap gap-1.5 mb-3">
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
              
              {/* Futures Metrics Row */}
              {(result.fundingRate !== undefined || result.openInterest !== undefined) && (
                <div className="grid grid-cols-2 gap-2 mb-3 p-2 rounded-lg bg-background-tertiary/50">
                  {result.fundingRate !== undefined && (
                    <div className="text-center">
                      <p className="text-[10px] text-foreground-muted uppercase tracking-wider">Funding</p>
                      <p className={cn(
                        "text-sm font-mono font-bold",
                        result.fundingRate > 0.0003 ? 'text-danger' :
                        result.fundingRate < -0.0001 ? 'text-success' :
                        'text-foreground-secondary'
                      )}>
                        {result.fundingRate >= 0 ? '+' : ''}{(result.fundingRate * 100).toFixed(4)}%
                      </p>
                      <p className="text-[9px] text-foreground-muted">
                        {result.fundingRate > 0.0005 ? '🔴 Longs pay' :
                         result.fundingRate < -0.0002 ? '🟢 Shorts pay' :
                         '⚪ Neutral'}
                      </p>
                    </div>
                  )}
                  {result.openInterest !== undefined && (
                    <div className="text-center">
                      <p className="text-[10px] text-foreground-muted uppercase tracking-wider">Open Interest</p>
                      <p className="text-sm font-mono font-bold text-foreground-secondary">
                        {result.openInterest >= 1000000000
                          ? `$${(result.openInterest / 1000000000).toFixed(2)}B`
                          : result.openInterest >= 1000000 
                          ? `$${(result.openInterest / 1000000).toFixed(1)}M` 
                          : result.openInterest >= 1000 
                          ? `$${(result.openInterest / 1000).toFixed(0)}K`
                          : `$${result.openInterest.toFixed(0)}`}
                      </p>
                      {result.oiChange24h !== undefined && (
                        <p className={cn(
                          "text-[9px] font-medium",
                          result.oiChange24h > 2 ? 'text-success' : 
                          result.oiChange24h < -2 ? 'text-danger' : 
                          'text-foreground-muted'
                        )}>
                          {result.oiChange24h > 0 ? '↑' : '↓'} {Math.abs(result.oiChange24h).toFixed(1)}% 
                          {result.oiChange24h > 5 && result.change24h > 1 ? ' 🐂' : 
                           result.oiChange24h > 5 && result.change24h < -1 ? ' 🐻' :
                           result.oiChange24h < -5 && result.change24h > 1 ? ' ⚠️' :
                           result.oiChange24h < -5 && result.change24h < -1 ? ' 💨' : ''}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
              
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
