'use client';

import { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  Target, 
  Search as SearchIcon,
  Brain,
  BarChart3,
  AlertTriangle,
  Lightbulb,
  Save,
  X,
  ChevronDown,
  Plus,
  Minus
} from 'lucide-react';
import { useBattleCardStore, useMarketDataStore, useUIStore, useAIMentorStore } from '@/lib/stores';
import { cn, formatPrice, getScenarioColor, getScenarioName, generateId } from '@/lib/utils/helpers';
import { TradingChart } from '@/components/charts/TradingChart';
import type { ScenarioType, Scenario } from '@/types';

const STEPS = [
  { id: 'capture', label: 'Capture', icon: Target, description: 'Setup identification' },
  { id: 'spin', label: 'SPIN', icon: SearchIcon, description: 'Market interrogation' },
  { id: 'challenger', label: 'Challenger', icon: Brain, description: 'Thesis validation' },
  { id: 'scenarios', label: 'Scenarios', icon: BarChart3, description: 'Battle card planning' },
  { id: 'review', label: 'Review', icon: Check, description: 'Final check' },
];

const INSTRUMENTS = [
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 
  'ADAUSDT', 'DOGEUSDT', 'AVAXUSDT', 'DOTUSDT', 'LINKUSDT'
];

const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1H', '4H', '1D', '1W'] as const;

const SETUP_TYPES = [
  'Breakout', 'Breakdown', 'Reversal', 'Continuation', 
  'Range Play', 'Liquidity Grab', 'Trend Following', 'Mean Reversion'
];

export function BattleCardEditor() {
  const { currentCard, editingStep, setEditingStep, updateCurrentCard, saveBattleCard } = useBattleCardStore();
  const setActiveView = useUIStore(state => state.setActiveView);
  const prices = useMarketDataStore(state => state.prices);

  const currentStepIndex = STEPS.findIndex(s => s.id === editingStep);

  const goToStep = (step: string) => {
    setEditingStep(step as any);
  };

  const nextStep = () => {
    if (currentStepIndex < STEPS.length - 1) {
      setEditingStep(STEPS[currentStepIndex + 1].id as any);
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) {
      setEditingStep(STEPS[currentStepIndex - 1].id as any);
    }
  };

  const handleSave = () => {
    if (currentCard) {
      saveBattleCard({
        ...currentCard,
        status: 'active',
        updatedAt: new Date(),
      } as any);
      setActiveView('dashboard');
    }
  };

  if (!currentCard) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <p className="text-foreground-secondary">No battle card selected</p>
          <button 
            onClick={() => setActiveView('dashboard')}
            className="btn btn-primary mt-4"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => {
            const isActive = step.id === editingStep;
            const isCompleted = index < currentStepIndex;
            const Icon = step.icon;

            return (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => goToStep(step.id)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
                    isActive && 'bg-accent/10 border border-accent/30',
                    isCompleted && 'text-success',
                    !isActive && !isCompleted && 'text-foreground-muted hover:text-foreground'
                  )}
                >
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center',
                    isActive && 'bg-accent text-white',
                    isCompleted && 'bg-success/20 text-success',
                    !isActive && !isCompleted && 'bg-background-tertiary'
                  )}>
                    {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <div className="text-left hidden lg:block">
                    <p className={cn(
                      'font-medium',
                      isActive && 'text-accent',
                      isCompleted && 'text-success'
                    )}>
                      {step.label}
                    </p>
                    <p className="text-xs text-foreground-muted">{step.description}</p>
                  </div>
                </button>
                {index < STEPS.length - 1 && (
                  <div className={cn(
                    'w-12 h-0.5 mx-2',
                    isCompleted ? 'bg-success' : 'bg-border'
                  )} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="xl:col-span-2">
          <div className="card p-6">
            {editingStep === 'capture' && <CaptureStep />}
            {editingStep === 'spin' && <SpinStep />}
            {editingStep === 'challenger' && <ChallengerStep />}
            {editingStep === 'scenarios' && <ScenariosStep />}
            {editingStep === 'review' && <ReviewStep />}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={prevStep}
              disabled={currentStepIndex === 0}
              className="btn btn-secondary"
            >
              <ArrowLeft className="w-4 h-4" />
              Previous
            </button>

            {currentStepIndex === STEPS.length - 1 ? (
              <button onClick={handleSave} className="btn btn-primary">
                <Save className="w-4 h-4" />
                Save & Activate
              </button>
            ) : (
              <button onClick={nextStep} className="btn btn-primary">
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Chart Preview */}
        <div className="card p-0 overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-foreground">Chart Preview</h3>
            {currentCard.instrument && (
              <p className="text-sm text-foreground-secondary">
                {currentCard.instrument} • {currentCard.timeframe || '1H'}
              </p>
            )}
          </div>
          <div className="h-[400px]">
            {currentCard.instrument ? (
              <TradingChart 
                symbol={currentCard.instrument} 
                interval={currentCard.timeframe || '1H'}
                scenarios={currentCard.scenarios}
                showEMAs={true}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-foreground-muted">
                Select an instrument to view chart
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Step Components

function CaptureStep() {
  const { currentCard, updateCurrentCard } = useBattleCardStore();
  const prices = useMarketDataStore(state => state.prices);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-2">Setup Capture</h2>
        <p className="text-foreground-secondary">Identify and document the trading setup</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Instrument */}
        <div>
          <label className="label">Instrument *</label>
          <select
            value={currentCard?.instrument || ''}
            onChange={(e) => updateCurrentCard({ instrument: e.target.value })}
            className="input"
          >
            <option value="">Select instrument...</option>
            {INSTRUMENTS.map(inst => (
              <option key={inst} value={inst}>
                {inst.replace('USDT', '/USDT')}
                {prices[inst] && ` — $${formatPrice(prices[inst].price)}`}
              </option>
            ))}
          </select>
        </div>

        {/* Timeframe */}
        <div>
          <label className="label">Primary Timeframe *</label>
          <div className="flex flex-wrap gap-2">
            {TIMEFRAMES.map(tf => (
              <button
                key={tf}
                onClick={() => updateCurrentCard({ timeframe: tf })}
                className={cn(
                  'px-4 py-2 rounded-lg border transition-all',
                  currentCard?.timeframe === tf
                    ? 'bg-accent text-white border-accent'
                    : 'bg-background-tertiary border-border hover:border-accent/50'
                )}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* Setup Type */}
        <div className="md:col-span-2">
          <label className="label">Setup Type *</label>
          <div className="flex flex-wrap gap-2">
            {SETUP_TYPES.map(type => (
              <button
                key={type}
                onClick={() => updateCurrentCard({ setupType: type })}
                className={cn(
                  'px-4 py-2 rounded-lg border transition-all',
                  currentCard?.setupType === type
                    ? 'bg-accent text-white border-accent'
                    : 'bg-background-tertiary border-border hover:border-accent/50'
                )}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Initial Thesis */}
        <div className="md:col-span-2">
          <label className="label">Initial Thesis *</label>
          <textarea
            value={currentCard?.thesis || ''}
            onChange={(e) => updateCurrentCard({ thesis: e.target.value })}
            placeholder="What do you see? Describe the setup in one or two sentences..."
            className="input min-h-[100px] resize-none"
          />
          <p className="text-xs text-foreground-muted mt-2">
            Be specific. Example: "BTC showing bullish divergence on 4H RSI at key support, expecting bounce to 70k"
          </p>
        </div>
      </div>
    </div>
  );
}

function SpinStep() {
  const { currentCard, updateCurrentCard } = useBattleCardStore();
  const [spinData, setSpinData] = useState({
    // Situation
    htfTrend: '',
    volatilityRegime: '',
    keyLevels: '',
    sessionContext: '',
    // Problem
    priceStuck: '',
    failedTests: '',
    effortVsResult: '',
    trappedWho: '',
    // Implication
    cascadeIfBreaks: '',
    stopClusters: '',
    forcedActions: '',
    nextDecision: '',
    // Need-Payoff
    rrRatio: '',
    positionSize: '',
    edgeDefinition: '',
  });

  const handleChange = (field: string, value: string) => {
    setSpinData(prev => ({ ...prev, [field]: value }));
    updateCurrentCard({ 
      spinAnalysis: { ...spinData, [field]: value } as any
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-2">SPIN Analysis</h2>
        <p className="text-foreground-secondary">Interrogate the market with structured questions</p>
      </div>

      {/* Situation */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-accent">
          <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center font-bold">S</div>
          <h3 className="font-semibold">Situation</h3>
          <span className="text-xs text-foreground-muted">— Context gathering</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-10">
          <div>
            <label className="label">Higher Timeframe Trend</label>
            <input
              type="text"
              value={spinData.htfTrend}
              onChange={(e) => handleChange('htfTrend', e.target.value)}
              placeholder="e.g., Bullish on Daily, consolidating on Weekly"
              className="input"
            />
          </div>
          <div>
            <label className="label">Volatility Regime</label>
            <select
              value={spinData.volatilityRegime}
              onChange={(e) => handleChange('volatilityRegime', e.target.value)}
              className="input"
            >
              <option value="">Select...</option>
              <option value="expansion">Expansion</option>
              <option value="contraction">Contraction</option>
              <option value="transition">Transition</option>
            </select>
          </div>
          <div>
            <label className="label">Key Levels Nearby</label>
            <input
              type="text"
              value={spinData.keyLevels}
              onChange={(e) => handleChange('keyLevels', e.target.value)}
              placeholder="e.g., Support at 65k, Resistance at 72k"
              className="input"
            />
          </div>
          <div>
            <label className="label">Session Context</label>
            <input
              type="text"
              value={spinData.sessionContext}
              onChange={(e) => handleChange('sessionContext', e.target.value)}
              placeholder="e.g., London open, Low Asian volume"
              className="input"
            />
          </div>
        </div>
      </div>

      {/* Problem */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-warning">
          <div className="w-8 h-8 rounded-lg bg-warning/20 flex items-center justify-center font-bold">P</div>
          <h3 className="font-semibold">Problem</h3>
          <span className="text-xs text-foreground-muted">— Finding tension</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-10">
          <div>
            <label className="label">Where is price stuck?</label>
            <input
              type="text"
              value={spinData.priceStuck}
              onChange={(e) => handleChange('priceStuck', e.target.value)}
              placeholder="e.g., Ranging between 67k-69k for 3 days"
              className="input"
            />
          </div>
          <div>
            <label className="label">Failed tests/breakouts?</label>
            <input
              type="text"
              value={spinData.failedTests}
              onChange={(e) => handleChange('failedTests', e.target.value)}
              placeholder="e.g., 3 failed attempts to break 69k"
              className="input"
            />
          </div>
          <div>
            <label className="label">Effort vs Result divergence?</label>
            <input
              type="text"
              value={spinData.effortVsResult}
              onChange={(e) => handleChange('effortVsResult', e.target.value)}
              placeholder="e.g., High volume but no price movement"
              className="input"
            />
          </div>
          <div>
            <label className="label">Who is trapped?</label>
            <input
              type="text"
              value={spinData.trappedWho}
              onChange={(e) => handleChange('trappedWho', e.target.value)}
              placeholder="e.g., Breakout longs from 69k now underwater"
              className="input"
            />
          </div>
        </div>
      </div>

      {/* Implication */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-danger">
          <div className="w-8 h-8 rounded-lg bg-danger/20 flex items-center justify-center font-bold">I</div>
          <h3 className="font-semibold">Implication</h3>
          <span className="text-xs text-foreground-muted">— Cascade effects</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-10">
          <div>
            <label className="label">If level breaks, what cascades?</label>
            <input
              type="text"
              value={spinData.cascadeIfBreaks}
              onChange={(e) => handleChange('cascadeIfBreaks', e.target.value)}
              placeholder="e.g., Break below 67k triggers stops to 65k"
              className="input"
            />
          </div>
          <div>
            <label className="label">Where are stop clusters?</label>
            <input
              type="text"
              value={spinData.stopClusters}
              onChange={(e) => handleChange('stopClusters', e.target.value)}
              placeholder="e.g., Heavy stops below 66.5k"
              className="input"
            />
          </div>
          <div>
            <label className="label">Who gets forced to act?</label>
            <input
              type="text"
              value={spinData.forcedActions}
              onChange={(e) => handleChange('forcedActions', e.target.value)}
              placeholder="e.g., Leveraged longs liquidated below 66k"
              className="input"
            />
          </div>
          <div>
            <label className="label">Next key decision point?</label>
            <input
              type="text"
              value={spinData.nextDecision}
              onChange={(e) => handleChange('nextDecision', e.target.value)}
              placeholder="e.g., 4H close above/below 68k"
              className="input"
            />
          </div>
        </div>
      </div>

      {/* Need-Payoff */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-success">
          <div className="w-8 h-8 rounded-lg bg-success/20 flex items-center justify-center font-bold">N</div>
          <h3 className="font-semibold">Need-Payoff</h3>
          <span className="text-xs text-foreground-muted">— Opportunity assessment</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-10">
          <div>
            <label className="label">Risk:Reward Ratio</label>
            <input
              type="text"
              value={spinData.rrRatio}
              onChange={(e) => handleChange('rrRatio', e.target.value)}
              placeholder="e.g., 1:3 (risking 2% for 6% target)"
              className="input"
            />
          </div>
          <div>
            <label className="label">Position Size</label>
            <input
              type="text"
              value={spinData.positionSize}
              onChange={(e) => handleChange('positionSize', e.target.value)}
              placeholder="e.g., 2% of portfolio"
              className="input"
            />
          </div>
          <div className="md:col-span-2">
            <label className="label">What's your specific edge?</label>
            <textarea
              value={spinData.edgeDefinition}
              onChange={(e) => handleChange('edgeDefinition', e.target.value)}
              placeholder="e.g., Identified liquidity grab setup at support with divergence confirmation..."
              className="input min-h-[80px] resize-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ChallengerStep() {
  const { currentCard, updateCurrentCard } = useBattleCardStore();
  const { setMode, addMessage } = useAIMentorStore();

  const [challengerData, setChallengerData] = useState({
    narrative: currentCard?.narrative || '',
    contradiction: currentCard?.contradiction || '',
    trappedParticipants: currentCard?.trappedParticipants || '',
  });

  const handleChange = (field: string, value: string) => {
    setChallengerData(prev => ({ ...prev, [field]: value }));
    updateCurrentCard({ [field]: value });
  };

  const challengerScore = currentCard?.challengerScore || 5;

  const handleScoreChange = (newScore: number) => {
    updateCurrentCard({ challengerScore: Math.max(1, Math.min(10, newScore)) });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-2">Challenger Thesis</h2>
        <p className="text-foreground-secondary">Challenge the consensus — what does the market have wrong?</p>
      </div>

      <div className="p-4 bg-accent/5 border border-accent/20 rounded-xl">
        <div className="flex items-start gap-3">
          <Lightbulb className="w-5 h-5 text-accent mt-0.5" />
          <div>
            <p className="text-sm text-foreground">
              <strong>Your Thesis:</strong> {currentCard?.thesis || 'No thesis defined yet'}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Dominant Narrative */}
        <div>
          <label className="label">What's the dominant market narrative right now?</label>
          <textarea
            value={challengerData.narrative}
            onChange={(e) => handleChange('narrative', e.target.value)}
            placeholder="What is everyone saying? What's the consensus view?"
            className="input min-h-[80px] resize-none"
          />
        </div>

        {/* Contradiction */}
        <div>
          <label className="label">What contradicts this narrative?</label>
          <textarea
            value={challengerData.contradiction}
            onChange={(e) => handleChange('contradiction', e.target.value)}
            placeholder="What data, pattern, or observation contradicts the consensus?"
            className="input min-h-[80px] resize-none"
          />
        </div>

        {/* Trapped Participants */}
        <div>
          <label className="label">Who will be forced to act if you're right?</label>
          <textarea
            value={challengerData.trappedParticipants}
            onChange={(e) => handleChange('trappedParticipants', e.target.value)}
            placeholder="Which participants are trapped and will need to exit/flip?"
            className="input min-h-[80px] resize-none"
          />
        </div>

        {/* Challenger Score */}
        <div className="p-6 bg-background-tertiary rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <label className="label mb-0">Challenger Score</label>
              <p className="text-xs text-foreground-muted">How contrarian is your thesis?</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => handleScoreChange(challengerScore - 1)}
                className="w-10 h-10 rounded-lg bg-background-secondary border border-border flex items-center justify-center hover:border-accent/50"
              >
                <Minus className="w-4 h-4" />
              </button>
              <div className="text-4xl font-bold text-accent font-mono w-16 text-center">
                {challengerScore}
              </div>
              <button
                onClick={() => handleScoreChange(challengerScore + 1)}
                className="w-10 h-10 rounded-lg bg-background-secondary border border-border flex items-center justify-center hover:border-accent/50"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="h-3 bg-background-secondary rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-danger via-warning to-success transition-all duration-300"
              style={{ width: `${challengerScore * 10}%` }}
            />
          </div>

          <div className="flex justify-between mt-2 text-xs text-foreground-muted">
            <span>Following crowd</span>
            <span>Moderate contrarian</span>
            <span>High conviction contrarian</span>
          </div>
        </div>

        {/* AI Challenge Button */}
        <button 
          onClick={() => {
            setMode('challenger');
            addMessage({
              id: generateId(),
              role: 'user',
              content: `Challenge my thesis: ${currentCard?.thesis}. The dominant narrative is: ${challengerData.narrative}. I believe it's wrong because: ${challengerData.contradiction}`,
              timestamp: new Date(),
            });
          }}
          className="w-full btn btn-secondary"
        >
          <Brain className="w-4 h-4" />
          Get AI Challenge
        </button>
      </div>
    </div>
  );
}

function ScenariosStep() {
  const { currentCard, updateCurrentCard } = useBattleCardStore();
  const scenarios = currentCard?.scenarios || [];
  const [activeScenario, setActiveScenario] = useState<ScenarioType>('A');

  const updateScenario = (type: ScenarioType, updates: Partial<Scenario>) => {
    const newScenarios = scenarios.map(s => 
      s.type === type ? { ...s, ...updates } : s
    );
    updateCurrentCard({ scenarios: newScenarios });
  };

  const currentScenario = scenarios.find(s => s.type === activeScenario);

  const adjustProbabilities = (type: ScenarioType, newValue: number) => {
    const diff = newValue - (scenarios.find(s => s.type === type)?.probability || 0);
    const others = scenarios.filter(s => s.type !== type);
    const totalOthers = others.reduce((sum, s) => sum + s.probability, 0);
    
    const newScenarios = scenarios.map(s => {
      if (s.type === type) {
        return { ...s, probability: newValue };
      } else if (totalOthers > 0) {
        const ratio = s.probability / totalOthers;
        return { ...s, probability: Math.max(0, s.probability - (diff * ratio)) };
      }
      return s;
    });
    
    updateCurrentCard({ scenarios: newScenarios });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-2">Scenario Planning</h2>
        <p className="text-foreground-secondary">Define 4 scenarios with triggers and actions</p>
      </div>

      {/* Scenario Tabs */}
      <div className="flex gap-2">
        {(['A', 'B', 'C', 'D'] as ScenarioType[]).map((type) => {
          const scenario = scenarios.find(s => s.type === type);
          const isActive = activeScenario === type;
          
          return (
            <button
              key={type}
              onClick={() => setActiveScenario(type)}
              className={cn(
                'flex-1 p-4 rounded-xl border-2 transition-all',
                isActive 
                  ? 'border-current' 
                  : 'border-border hover:border-border-hover'
              )}
              style={{ 
                borderColor: isActive ? getScenarioColor(type) : undefined,
                backgroundColor: isActive ? `${getScenarioColor(type)}10` : undefined 
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white"
                  style={{ backgroundColor: getScenarioColor(type) }}
                >
                  {type}
                </div>
                <span className="text-lg font-mono font-bold" style={{ color: getScenarioColor(type) }}>
                  {scenario?.probability || 0}%
                </span>
              </div>
              <p className="text-sm font-medium text-foreground">{getScenarioName(type)}</p>
            </button>
          );
        })}
      </div>

      {/* Scenario Editor */}
      {currentScenario && (
        <div className="space-y-6 p-6 bg-background-tertiary rounded-xl">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white"
              style={{ backgroundColor: getScenarioColor(activeScenario) }}
            >
              {activeScenario}
            </div>
            <div>
              <h3 className="font-semibold text-foreground">
                Scenario {activeScenario}: {getScenarioName(activeScenario)}
              </h3>
              <p className="text-sm text-foreground-muted">
                {activeScenario === 'A' && 'Your primary, highest probability scenario'}
                {activeScenario === 'B' && 'Alternative path if primary doesn\'t play out'}
                {activeScenario === 'C' && 'The unexpected chaos scenario'}
                {activeScenario === 'D' && 'Setup invalidation — when to walk away'}
              </p>
            </div>
          </div>

          {/* Probability Slider */}
          <div>
            <label className="label">Probability: {currentScenario.probability}%</label>
            <input
              type="range"
              min="0"
              max="100"
              value={currentScenario.probability}
              onChange={(e) => adjustProbabilities(activeScenario, parseInt(e.target.value))}
              className="w-full accent-accent"
            />
          </div>

          {/* Common Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Trigger Condition *</label>
              <input
                type="text"
                value={currentScenario.triggerCondition || ''}
                onChange={(e) => updateScenario(activeScenario, { triggerCondition: e.target.value })}
                placeholder={
                  activeScenario === 'D' 
                    ? "What would completely invalidate this setup?"
                    : "What price action or event triggers this scenario?"
                }
                className="input"
              />
            </div>

            {activeScenario !== 'D' && (
              <>
                <div>
                  <label className="label">Trigger Price</label>
                  <input
                    type="number"
                    value={currentScenario.triggerPrice || ''}
                    onChange={(e) => updateScenario(activeScenario, { triggerPrice: parseFloat(e.target.value) })}
                    placeholder="Price level"
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Entry Price</label>
                  <input
                    type="number"
                    value={currentScenario.entryPrice || ''}
                    onChange={(e) => updateScenario(activeScenario, { entryPrice: parseFloat(e.target.value) })}
                    placeholder="Entry level"
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Stop Loss</label>
                  <input
                    type="number"
                    value={currentScenario.stopLoss || ''}
                    onChange={(e) => updateScenario(activeScenario, { stopLoss: parseFloat(e.target.value) })}
                    placeholder="Stop level"
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Target 1</label>
                  <input
                    type="number"
                    value={currentScenario.target1 || ''}
                    onChange={(e) => updateScenario(activeScenario, { target1: parseFloat(e.target.value) })}
                    placeholder="First target"
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Target 2</label>
                  <input
                    type="number"
                    value={currentScenario.target2 || ''}
                    onChange={(e) => updateScenario(activeScenario, { target2: parseFloat(e.target.value) })}
                    placeholder="Second target"
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Target 3</label>
                  <input
                    type="number"
                    value={currentScenario.target3 || ''}
                    onChange={(e) => updateScenario(activeScenario, { target3: parseFloat(e.target.value) })}
                    placeholder="Final target"
                    className="input"
                  />
                </div>
              </>
            )}

            {activeScenario === 'D' && (
              <>
                <div className="md:col-span-2">
                  <label className="label">Invalidation Reason</label>
                  <textarea
                    value={currentScenario.invalidationReason || ''}
                    onChange={(e) => updateScenario(activeScenario, { invalidationReason: e.target.value })}
                    placeholder="Why would this setup be completely dead?"
                    className="input min-h-[80px] resize-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="label">Lesson to Capture</label>
                  <textarea
                    value={currentScenario.lessonPrompt || ''}
                    onChange={(e) => updateScenario(activeScenario, { lessonPrompt: e.target.value })}
                    placeholder="What should you remember if this scenario triggers?"
                    className="input min-h-[80px] resize-none"
                  />
                </div>
              </>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="label">Description / Notes</label>
            <textarea
              value={currentScenario.description || ''}
              onChange={(e) => updateScenario(activeScenario, { description: e.target.value })}
              placeholder="Additional notes about this scenario..."
              className="input min-h-[80px] resize-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewStep() {
  const { currentCard } = useBattleCardStore();
  const scenarios = currentCard?.scenarios || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-2">Final Review</h2>
        <p className="text-foreground-secondary">Review your Battle Card before activation</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Setup Info */}
        <div className="card">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-accent" />
            Setup
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-foreground-secondary">Instrument</span>
              <span className="font-medium text-foreground">{currentCard?.instrument || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground-secondary">Timeframe</span>
              <span className="font-medium text-foreground">{currentCard?.timeframe || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground-secondary">Setup Type</span>
              <span className="font-medium text-foreground">{currentCard?.setupType || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground-secondary">Challenger Score</span>
              <span className="font-bold text-accent">{currentCard?.challengerScore || 5}/10</span>
            </div>
          </div>
        </div>

        {/* Thesis */}
        <div className="card">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-400" />
            Thesis
          </h3>
          <p className="text-foreground-secondary">{currentCard?.thesis || 'No thesis defined'}</p>
          {currentCard?.contradiction && (
            <div className="mt-4 p-3 bg-background-tertiary rounded-lg">
              <p className="text-xs text-foreground-muted uppercase tracking-wider mb-1">Contrarian View</p>
              <p className="text-sm text-foreground">{currentCard.contradiction}</p>
            </div>
          )}
        </div>
      </div>

      {/* Scenarios Summary */}
      <div className="card">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-success" />
          Scenario Matrix
        </h3>
        <div className="space-y-4">
          {scenarios.map((scenario) => (
            <div 
              key={scenario.id}
              className="p-4 bg-background-tertiary rounded-xl"
            >
              <div className="flex items-center gap-3 mb-2">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white"
                  style={{ backgroundColor: getScenarioColor(scenario.type as ScenarioType) }}
                >
                  {scenario.type}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">{getScenarioName(scenario.type as ScenarioType)}</span>
                    <span className="font-mono font-bold" style={{ color: getScenarioColor(scenario.type as ScenarioType) }}>
                      {scenario.probability}%
                    </span>
                  </div>
                </div>
              </div>
              {scenario.triggerCondition && (
                <p className="text-sm text-foreground-secondary pl-11">
                  <span className="text-foreground-muted">Trigger:</span> {scenario.triggerCondition}
                </p>
              )}
              {scenario.entryPrice && scenario.stopLoss && scenario.target1 && (
                <div className="flex gap-4 mt-2 pl-11 text-xs">
                  <span className="text-foreground-muted">Entry: <span className="text-foreground font-mono">${scenario.entryPrice}</span></span>
                  <span className="text-foreground-muted">Stop: <span className="text-danger font-mono">${scenario.stopLoss}</span></span>
                  <span className="text-foreground-muted">T1: <span className="text-success font-mono">${scenario.target1}</span></span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Checklist */}
      <div className="p-4 bg-warning/10 border border-warning/20 rounded-xl">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-warning mt-0.5" />
          <div>
            <h4 className="font-semibold text-foreground mb-2">Pre-Activation Checklist</h4>
            <ul className="space-y-1 text-sm text-foreground-secondary">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-success" />
                All 4 scenarios have trigger conditions defined
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-success" />
                Probabilities sum to 100%
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-success" />
                Risk:Reward meets your criteria
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-success" />
                Invalidation scenario (D) is clearly defined
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
