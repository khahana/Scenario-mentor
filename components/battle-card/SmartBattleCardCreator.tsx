'use client';

import { useState, useEffect } from 'react';
import { 
  Sparkles,
  Loader2,
  Check,
  RefreshCw,
  Target,
  AlertTriangle,
  Zap,
  Brain,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  BarChart2
} from 'lucide-react';
import { useBattleCardStore, useUIStore, useMarketDataStore, BINANCE_FUTURES_ASSETS } from '@/lib/stores';
import { cn, getScenarioColor, generateId, formatPrice } from '@/lib/utils/helpers';
import { TradingChart } from '@/components/charts/TradingChart';
import type { ScenarioType, Timeframe } from '@/types';

type AnalysisState = 'idle' | 'analyzing' | 'complete' | 'error';

// Default instruments as fallback
const DEFAULT_INSTRUMENTS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT'];

interface ExtractedAnalysis {
  instrument: string;
  timeframe: string;
  setupType: string;
  
  situation: {
    htfTrend: string;
    structure: string;
    keyLevels: string[];
    volatility: string;
  };
  problem: {
    priceStuck: string;
    failedTests: string;
    trappedParticipants: string;
  };
  implication: {
    cascade: string;
    stopClusters: string;
    forcedActions: string;
  };
  
  thesis: string;
  narrative: string;
  contradiction: string;
  challengerScore: number;
  
  scenarios: {
    type: ScenarioType;
    name: string;
    probability: number;
    description: string;
    trigger: string;
    triggerPrice?: number;
    entry: number | null;
    stop: number | null;
    targets: number[];
  }[];
  
  reasoning: string;
  risks: string[];
  edgeDescription: string;
}

const TIMEFRAMES: { value: Timeframe; label: string }[] = [
  { value: '1m', label: '1m' },
  { value: '5m', label: '5m' },
  { value: '15m', label: '15m' },
  { value: '1H', label: '1H' },
  { value: '4H', label: '4H' },
  { value: '1D', label: '1D' },
  { value: '1W', label: '1W' },
];

export function SmartBattleCardCreator() {
  const [state, setState] = useState<AnalysisState>('idle');
  const [instrument, setInstrument] = useState('BTCUSDT');
  const [timeframe, setTimeframe] = useState<Timeframe>('4H');
  const [direction, setDirection] = useState<'long' | 'short' | 'auto'>('auto');
  const [analysis, setAnalysis] = useState<ExtractedAnalysis | null>(null);
  const [showReasoning, setShowReasoning] = useState(false);
  const [analysisMode, setAnalysisMode] = useState<'ai' | 'fallback' | null>(null);
  
  const { saveBattleCard } = useBattleCardStore();
  const { setActiveView, prefillSymbol, setPrefillSymbol } = useUIStore();
  const prices = useMarketDataStore(state => state.prices);
  const watchlist = useMarketDataStore(state => state.watchlist);
  
  // Check if API key exists
  const [hasApiKey, setHasApiKey] = useState(false);
  useEffect(() => {
    const key = localStorage.getItem('anthropic_api_key');
    setHasApiKey(!!key && key.length > 10);
  }, []);
  
  // Use watchlist if available, otherwise default instruments
  const instruments = watchlist.length > 0 ? watchlist : DEFAULT_INSTRUMENTS;
  
  // Handle prefilled symbol from scanner
  useEffect(() => {
    if (prefillSymbol) {
      // Convert display format (BTC/USDT) to API format (BTCUSDT)
      const apiSymbol = prefillSymbol.replace('/', '');
      setInstrument(apiSymbol);
      // Clear the prefill so it doesn't persist
      setPrefillSymbol(null);
    }
  }, [prefillSymbol, setPrefillSymbol]);
  
  const currentPrice = prices[instrument]?.price;

  const analyzeChart = async () => {
    setState('analyzing');

    try {
      const apiKey = localStorage.getItem('anthropic_api_key');
      
      // Always fetch klines to get accurate current price (from Futures)
      let klineData = null;
      let actualPrice = currentPrice;
      
      try {
        const binanceInterval = timeframe === '1H' ? '1h' : timeframe === '4H' ? '4h' : timeframe === '1D' ? '1d' : '4h';
        // Use Futures API for perpetual contracts
        const klineResponse = await fetch(
          `https://fapi.binance.com/fapi/v1/klines?symbol=${instrument}&interval=${binanceInterval}&limit=50`
        );
        if (klineResponse.ok) {
          klineData = await klineResponse.json();
          // Get actual price from last kline close if we don't have it
          if (klineData && klineData.length > 0) {
            const lastKline = klineData[klineData.length - 1];
            const klinePrice = parseFloat(lastKline[4]); // Close price
            if (!actualPrice || actualPrice === 0) {
              actualPrice = klinePrice;
            }
          }
        }
      } catch (e) {
        console.log('Could not fetch klines');
      }

      // If still no price, fetch current ticker from Futures
      if (!actualPrice) {
        try {
          const tickerResponse = await fetch(
            `https://fapi.binance.com/fapi/v1/ticker/price?symbol=${instrument}`
          );
          if (tickerResponse.ok) {
            const ticker = await tickerResponse.json();
            actualPrice = parseFloat(ticker.price);
          }
        } catch (e) {
          console.log('Could not fetch ticker');
        }
      }

      if (!actualPrice) {
        alert('Could not get current price. Please try again.');
        setState('idle');
        return;
      }

      console.log(`Analyzing ${instrument} at price $${actualPrice}`);

      const response = await fetch('/api/ai/analyze-chart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instrument,
          timeframe,
          direction,
          currentPrice: actualPrice,
          klineData,
          apiKey,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setAnalysis(data.analysis);
        // Track if this was AI or fallback analysis
        setAnalysisMode(data.model === 'fallback-technical' ? 'fallback' : 'ai');
        setState('complete');
      } else {
        console.error('Analysis error:', data.error);
        alert(data.error || 'Analysis failed');
        setState('error');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setState('error');
    }
  };

  const handleSave = () => {
    if (!analysis) return;

    const battleCard = {
      id: generateId(),
      instrument: analysis.instrument,
      timeframe: analysis.timeframe,
      setupType: analysis.setupType,
      thesis: analysis.thesis,
      narrative: analysis.narrative,
      contradiction: analysis.contradiction,
      challengerScore: analysis.challengerScore,
      spinAnalysis: {
        htfTrend: analysis.situation.htfTrend,
        volatilityRegime: analysis.situation.volatility,
        keyLevels: analysis.situation.keyLevels.join(', '),
        priceStuck: analysis.problem.priceStuck,
        failedTests: analysis.problem.failedTests,
        trappedWho: analysis.problem.trappedParticipants,
        cascadeIfBreaks: analysis.implication.cascade,
        stopClusters: analysis.implication.stopClusters,
        edgeDefinition: analysis.edgeDescription,
      },
      scenarios: analysis.scenarios.map(s => ({
        id: generateId(),
        type: s.type,
        name: s.name,
        probability: s.probability,
        description: s.description,
        triggerCondition: s.trigger || '',
        triggerPrice: s.triggerPrice || null,
        entryPrice: s.entry,
        stopLoss: s.stop,
        target1: s.targets[0] || null,
        target2: s.targets[1] || null,
        target3: s.targets[2] || null,
        isActive: false,
        battleCardId: '',
        invalidationReason: null,
        lessonPrompt: null,
        triggeredAt: null,
        parentId: null,
        children: [],
      })),
      status: 'active' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    saveBattleCard(battleCard as any);
    setActiveView('dashboard');
  };

  const updateScenarioProbability = (type: ScenarioType, newProb: number) => {
    if (!analysis) return;
    
    const others = analysis.scenarios.filter(s => s.type !== type);
    const current = analysis.scenarios.find(s => s.type === type);
    if (!current) return;
    
    const oldProb = current.probability;
    const diff = newProb - oldProb;
    const othersTotal = others.reduce((sum, s) => sum + (s.probability || 0), 0);
    
    const updatedScenarios = analysis.scenarios.map(s => {
      if (s.type === type) {
        return { ...s, probability: newProb };
      }
      // Prevent NaN by checking for zero division
      if (othersTotal === 0 || !s.probability) {
        return s;
      }
      const ratio = s.probability / othersTotal;
      return { ...s, probability: Math.max(0, Math.round(s.probability - diff * ratio)) };
    });
    
    setAnalysis({ ...analysis, scenarios: updatedScenarios });
  };

  return (
    <div className="space-y-6 overflow-x-hidden max-w-full">
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2 md:gap-3 flex-wrap">
          <Sparkles className="w-6 h-6 md:w-7 md:h-7 text-accent" />
          Create Battle Card
          <span className="text-xs md:text-sm font-normal bg-accent/20 text-accent px-2 py-1 rounded-full">
            AI-Powered
          </span>
        </h2>
        <p className="text-sm md:text-base text-foreground-secondary mt-1">
          Select instrument → AI analyzes chart → Get complete 4-scenario setup
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
        {/* Left Column - Chart & Controls */}
        <div className="space-y-4">
          <div className="card p-4">
            {/* Instrument & Timeframe Selection */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="label">Instrument</label>
                <select
                  value={instrument}
                  onChange={(e) => setInstrument(e.target.value)}
                  className="input"
                >
                  {instruments.map(i => (
                    <option key={i} value={i}>{i.replace('USDT', '/USDT')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Timeframe</label>
                <div className="flex flex-wrap gap-1">
                  {TIMEFRAMES.map(tf => (
                    <button
                      key={tf.value}
                      onClick={() => setTimeframe(tf.value)}
                      className={cn(
                        'px-3 py-2 rounded-lg text-sm font-medium transition-all',
                        timeframe === tf.value
                          ? 'bg-accent text-white'
                          : 'bg-background-tertiary text-foreground-secondary hover:text-foreground'
                      )}
                    >
                      {tf.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Direction Bias */}
            <div className="mb-4">
              <label className="label">Direction Bias</label>
              <div className="flex gap-2">
                {(['auto', 'long', 'short'] as const).map(d => (
                  <button
                    key={d}
                    onClick={() => setDirection(d)}
                    className={cn(
                      'flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2',
                      direction === d
                        ? d === 'long' ? 'bg-success/20 text-success border border-success'
                          : d === 'short' ? 'bg-danger/20 text-danger border border-danger'
                          : 'bg-accent/20 text-accent border border-accent'
                        : 'bg-background-tertiary text-foreground-secondary hover:text-foreground'
                    )}
                  >
                    {d === 'long' && <TrendingUp className="w-4 h-4" />}
                    {d === 'short' && <TrendingDown className="w-4 h-4" />}
                    {d === 'auto' && <Brain className="w-4 h-4" />}
                    {d.charAt(0).toUpperCase() + d.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Live Chart */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">{instrument.replace('USDT', '/USDT')}</span>
                <span className="text-foreground-muted">{timeframe.toUpperCase()}</span>
              </div>
              {currentPrice && (
                <span className="font-mono text-lg font-bold text-foreground">
                  ${formatPrice(currentPrice)}
                </span>
              )}
            </div>
            <div className="h-[400px] rounded-lg overflow-hidden border border-border">
              <TradingChart 
                symbol={instrument} 
                interval={timeframe}
                scenarios={analysis?.scenarios as any}
                showEMAs={true}
              />
            </div>
          </div>

          {/* API Key Warning */}
          {!hasApiKey && (
            <div className="p-3 rounded-lg bg-warning/10 border border-warning/30 flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-warning font-medium">No API Key</p>
                <p className="text-xs text-foreground-muted">
                  Using basic technical analysis. Add your API key in Settings for AI-powered analysis.
                </p>
              </div>
            </div>
          )}

          {/* Analyze Button */}
          {state !== 'complete' && (
            <button
              onClick={analyzeChart}
              disabled={state === 'analyzing'}
              className={cn(
                "w-full btn py-4 text-lg",
                hasApiKey ? "btn-primary" : "btn-secondary"
              )}
            >
              {state === 'analyzing' ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing {instrument}...
                </>
              ) : hasApiKey ? (
                <>
                  <Brain className="w-5 h-5" />
                  Analyze with AI
                </>
              ) : (
                <>
                  <BarChart2 className="w-5 h-5" />
                  Analyze with Technical Indicators
                </>
              )}
            </button>
          )}

          {state === 'error' && (
            <div className="card p-4 bg-danger/10 border-danger/20">
              <p className="text-danger text-sm">Analysis failed. Please try again.</p>
              <button onClick={() => setState('idle')} className="btn btn-secondary mt-2">
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Right Column - Analysis Results */}
        <div className="space-y-4">
          {state === 'idle' && (
            <div className="card p-8 text-center h-full flex flex-col items-center justify-center min-h-[500px]">
              <div className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center mb-4",
                hasApiKey ? "bg-accent/10" : "bg-warning/10"
              )}>
                {hasApiKey ? (
                  <Sparkles className="w-8 h-8 text-accent" />
                ) : (
                  <BarChart2 className="w-8 h-8 text-warning" />
                )}
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {hasApiKey ? 'Ready for AI Analysis' : 'Ready for Technical Analysis'}
              </h3>
              <p className="text-foreground-secondary max-w-sm">
                {hasApiKey 
                  ? 'Select instrument & timeframe, then click "Analyze with AI". AI extracts complete battle card setup.'
                  : 'Select instrument & timeframe for basic technical analysis. Add API key in Settings for AI-powered analysis.'
                }
              </p>
            </div>
          )}

          {state === 'analyzing' && (
            <div className="card p-8 text-center h-full flex flex-col items-center justify-center min-h-[500px]">
              <Loader2 className="w-12 h-12 text-accent animate-spin mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {hasApiKey ? 'AI Analyzing Chart...' : 'Running Technical Analysis...'}
              </h3>
              <p className="text-foreground-secondary">
                {hasApiKey ? 'Extracting SPIN, thesis & scenarios' : 'Calculating support, resistance & trends'}
              </p>
            </div>
          )}

          {state === 'complete' && analysis && (
            <div className="space-y-4">
              {/* Fallback Mode Banner */}
              {analysisMode === 'fallback' && (
                <div className="p-3 rounded-lg bg-warning/10 border border-warning/30 flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-warning font-medium">Basic Technical Analysis</p>
                    <p className="text-xs text-foreground-muted">
                      This analysis uses calculated indicators only. Add your API key in Settings for AI-powered scenario generation.
                    </p>
                  </div>
                </div>
              )}
              
              {/* Quick Stats */}
              <div className="card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="badge bg-accent/20 text-accent">{analysis.setupType}</span>
                    <p className="text-foreground mt-1 font-medium">{analysis.thesis}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-foreground-muted">Challenger</div>
                    <div className="text-2xl font-bold text-accent">{analysis.challengerScore}/10</div>
                  </div>
                </div>
              </div>

              {/* SPIN Analysis */}
              <div className="card p-4">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Target className="w-4 h-4 text-accent" />
                  SPIN Analysis
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <SpinBox letter="S" title="Situation" color="accent" items={[
                    analysis.situation.htfTrend,
                    analysis.situation.structure,
                    `Volatility: ${analysis.situation.volatility}`
                  ]} />
                  <SpinBox letter="P" title="Problem" color="warning" items={[
                    analysis.problem.priceStuck,
                    analysis.problem.failedTests
                  ]} />
                  <SpinBox letter="I" title="Implication" color="danger" items={[
                    analysis.implication.cascade,
                    analysis.implication.stopClusters
                  ]} />
                  <SpinBox letter="N" title="Edge" color="success" items={[
                    analysis.edgeDescription
                  ]} />
                </div>
              </div>

              {/* Scenarios */}
              <div className="card p-4">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-warning" />
                  Scenarios
                </h3>
                <div className="space-y-3">
                  {analysis.scenarios.map((scenario) => (
                    <ScenarioCard 
                      key={scenario.type}
                      scenario={scenario}
                      currentPrice={currentPrice}
                      onProbabilityChange={(prob) => updateScenarioProbability(scenario.type, prob)}
                    />
                  ))}
                </div>
                
                {/* Probability bar */}
                <div className="mt-3 flex rounded-full overflow-hidden h-2">
                  {analysis.scenarios.map((scenario) => (
                    <div
                      key={scenario.type}
                      className="transition-all duration-300"
                      style={{
                        width: `${scenario.probability}%`,
                        backgroundColor: getScenarioColor(scenario.type),
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Risks */}
              {analysis.risks.length > 0 && (
                <div className="card p-4 bg-danger/5 border-danger/20">
                  <div className="flex items-center gap-2 text-danger text-sm font-medium mb-2">
                    <AlertTriangle className="w-4 h-4" />
                    Risks
                  </div>
                  <ul className="space-y-1 text-sm text-foreground-secondary">
                    {analysis.risks.map((risk, i) => (
                      <li key={i}>• {risk}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* AI Reasoning */}
              <div className="card p-3">
                <button
                  onClick={() => setShowReasoning(!showReasoning)}
                  className="w-full flex items-center justify-between text-foreground-secondary hover:text-foreground"
                >
                  <span className="flex items-center gap-2 text-sm">
                    <MessageSquare className="w-4 h-4" />
                    AI Reasoning
                  </span>
                  {showReasoning ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {showReasoning && (
                  <p className="mt-3 text-sm text-foreground-secondary">{analysis.reasoning}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => { setState('idle'); setAnalysis(null); }}
                  className="btn btn-secondary flex-1"
                >
                  <RefreshCw className="w-4 h-4" />
                  Re-analyze
                </button>
                <button onClick={handleSave} className="btn btn-primary flex-1">
                  <Check className="w-4 h-4" />
                  Activate
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// SPIN Box Component
function SpinBox({ letter, title, color, items }: { letter: string; title: string; color: string; items: string[] }) {
  const colorMap: Record<string, string> = {
    accent: 'bg-accent/10 border-accent/20 text-accent',
    warning: 'bg-warning/10 border-warning/20 text-warning',
    danger: 'bg-danger/10 border-danger/20 text-danger',
    success: 'bg-success/10 border-success/20 text-success',
  };
  
  return (
    <div className={cn('p-3 rounded-xl border', colorMap[color])}>
      <div className="flex items-center gap-2 mb-2">
        <span className={cn('w-6 h-6 rounded flex items-center justify-center text-xs font-bold', colorMap[color])}>
          {letter}
        </span>
        <span className="font-medium text-foreground text-sm">{title}</span>
      </div>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-xs text-foreground-secondary">• {item}</li>
        ))}
      </ul>
    </div>
  );
}

// Scenario Card Component
function ScenarioCard({ scenario, currentPrice, onProbabilityChange }: { 
  scenario: ExtractedAnalysis['scenarios'][0]; 
  currentPrice?: number;
  onProbabilityChange: (prob: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const color = getScenarioColor(scenario.type);
  
  // Calculate trigger distance
  const triggerPrice = scenario.triggerPrice || scenario.entry;
  let triggerDistance: number | null = null;
  let triggerStatus: 'far' | 'approaching' | 'at_trigger' = 'far';
  
  if (triggerPrice && currentPrice) {
    const distance = ((currentPrice - triggerPrice) / triggerPrice) * 100;
    triggerDistance = Math.abs(distance);
    
    if (triggerDistance <= 0.5) {
      triggerStatus = 'at_trigger';
    } else if (triggerDistance <= 2) {
      triggerStatus = 'approaching';
    }
  }

  // Determine trade direction from entry/stop relationship
  const isTradeableScenario = scenario.entry && scenario.stop;
  let direction: 'long' | 'short' | null = null;
  if (isTradeableScenario && scenario.entry && scenario.stop) {
    direction = scenario.entry > scenario.stop ? 'long' : 'short';
  }

  return (
    <div 
      className="p-4 rounded-xl border transition-all cursor-pointer"
      style={{ borderColor: `${color}30`, backgroundColor: `${color}08` }}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center gap-3">
        <div 
          className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white text-base"
          style={{ backgroundColor: color }}
        >
          {scenario.type}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground text-base">{scenario.name}</span>
            {direction && (
              <span className={cn(
                'text-sm px-2 py-0.5 rounded font-semibold',
                direction === 'long' 
                  ? 'bg-success/20 text-success' 
                  : 'bg-danger/20 text-danger'
              )}>
                {direction === 'long' ? '↑ LONG' : '↓ SHORT'}
              </span>
            )}
            {!isTradeableScenario && (scenario.type === 'C' || scenario.type === 'D') && (
              <span className="text-sm px-2 py-0.5 rounded bg-foreground-muted/20 text-foreground-muted font-medium">
                NO TRADE
              </span>
            )}
            {triggerDistance !== null && (
              <span className={cn(
                'text-sm px-1.5 py-0.5 rounded-full font-mono',
                triggerStatus === 'at_trigger' 
                  ? 'bg-success/20 text-success animate-pulse' 
                  : triggerStatus === 'approaching'
                    ? 'bg-warning/20 text-warning'
                    : 'bg-background-tertiary text-foreground-muted'
              )}>
                {triggerStatus === 'at_trigger' ? '🎯 AT TRIGGER' : `${triggerDistance.toFixed(1)}% away`}
              </span>
            )}
          </div>
          <p className="text-sm text-foreground-muted truncate">{scenario.trigger || scenario.description}</p>
        </div>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <input
            type="range"
            min="0"
            max="100"
            value={scenario.probability}
            onChange={(e) => onProbabilityChange(parseInt(e.target.value))}
            className="w-16"
            style={{ accentColor: color }}
          />
          <span className="font-mono font-bold text-base w-12" style={{ color }}>
            {scenario.probability}%
          </span>
        </div>
      </div>

      {(scenario.type === 'A' || scenario.type === 'B') && scenario.entry && (
        <div className="mt-3 pt-3 border-t border-border/50">
          {/* Entry Price */}
          {scenario.entry && (
            <div className="mb-2">
              <span className="text-foreground-muted text-sm">Entry</span>
              <p className="font-mono font-medium text-foreground text-base">
                ${formatPrice(scenario.entry)}
              </p>
              <span className="text-[10px] text-foreground-muted/60">±0.1% trigger</span>
            </div>
          )}
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <span className="text-foreground-muted">Stop</span>
              <p className="font-mono font-medium text-danger text-base">{scenario.stop ? `$${formatPrice(scenario.stop)}` : '—'}</p>
            </div>
            <div>
              <span className="text-foreground-muted">T1</span>
              <p className="font-mono font-medium text-success text-base">{scenario.targets[0] ? `$${formatPrice(scenario.targets[0])}` : '—'}</p>
            </div>
            <div>
              <span className="text-foreground-muted">T2</span>
              <p className="font-mono font-medium text-success text-base">{scenario.targets[1] ? `$${formatPrice(scenario.targets[1])}` : '—'}</p>
            </div>
          </div>
        </div>
      )}

      {expanded && (scenario.type === 'C' || scenario.type === 'D') && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <p className="text-sm text-foreground-secondary">{scenario.description}</p>
        </div>
      )}
    </div>
  );
}
