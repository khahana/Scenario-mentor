'use client';

import { useState, useEffect } from 'react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Search,
  Target,
  BookOpen,
  MessageSquare,
  Settings,
  TrendingUp,
  Zap,
  Brain,
  BarChart2,
  HelpCircle
} from 'lucide-react';
import { cn } from '@/lib/utils/helpers';

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  tips?: string[];
  highlight?: string; // CSS selector to highlight
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Scenario Trading Mentor! 👋',
    description: 'Your AI-powered trading companion that helps you think in probabilities, not predictions. Let me show you around.',
    icon: Sparkles,
    color: 'text-accent',
    tips: [
      'Based on the Scenario Trading™ methodology',
      'Think in 4 scenarios: A (Primary), B (Secondary), C (Chaos), D (Invalidation)',
      'Never married to one outcome - always prepared'
    ]
  },
  {
    id: 'scanner',
    title: '📊 Market Scanner',
    description: 'Automatically scans your watchlist for high-potential setups using technical analysis, funding rates, and open interest.',
    icon: Search,
    color: 'text-warning',
    tips: [
      'Score 80+ = Hot setup worth watching',
      'Funding Rate shows if longs/shorts are overleveraged',
      'Open Interest changes reveal market conviction',
      'Click "AI Deep Dive" for detailed analysis'
    ],
    highlight: 'scanner'
  },
  {
    id: 'battlecard',
    title: '⚔️ Battle Cards',
    description: 'Create structured trading plans with 4 scenarios. AI analyzes the chart and generates complete setups.',
    icon: Target,
    color: 'text-success',
    tips: [
      'Scenario A: Your primary thesis (highest probability)',
      'Scenario B: Alternative play if A doesn\'t trigger',
      'Scenario C: Chaos/chop - usually means NO TRADE',
      'Scenario D: Setup invalidation - thesis is wrong',
      'Each scenario has specific entry, stop, and targets'
    ],
    highlight: 'battle-card'
  },
  {
    id: 'methodology',
    title: '🎯 SPIN Analysis',
    description: 'Every Battle Card uses SPIN methodology to structure your analysis.',
    icon: Brain,
    color: 'text-purple-400',
    tips: [
      'S - Situation: What\'s the current market context?',
      'P - Problem: Where is price stuck? Who\'s trapped?',
      'I - Implication: What happens if key level breaks?',
      'N - Need/Edge: What\'s your specific trading edge?'
    ]
  },
  {
    id: 'paper-trading',
    title: '📈 Paper Trading',
    description: 'Practice your scenarios with simulated trades. Track performance without risking real money.',
    icon: TrendingUp,
    color: 'text-success',
    tips: [
      'Set position size and leverage in Settings',
      'Trades auto-execute when price hits your entry zone',
      'Auto-exit on target or stop loss',
      'All P&L includes leverage calculation'
    ]
  },
  {
    id: 'journal',
    title: '📓 Trading Journal',
    description: 'Track all your trades, analyze performance by scenario type, and learn from your history.',
    icon: BookOpen,
    color: 'text-info',
    tips: [
      'Trades tab: History of all completed trades',
      'Positions tab: Currently open positions with live P&L',
      'Analytics tab: Win rate, equity curve, best/worst trades',
      'Filter by outcome (wins/losses) to spot patterns'
    ],
    highlight: 'journal'
  },
  {
    id: 'ai-mentor',
    title: '💬 AI Mentor',
    description: 'Your personal trading coach. Get real-time guidance, challenge your thesis, or build new setups.',
    icon: MessageSquare,
    color: 'text-accent',
    tips: [
      'Builder: Guided setup creation',
      'Challenger: AI challenges your thesis (contrarian view)',
      'Coach: Real-time advice on your positions',
      'Journal: Reflect on trades and extract lessons'
    ],
    highlight: 'ai-mentor'
  },
  {
    id: 'api-key',
    title: '🔑 API Key Setup',
    description: 'For AI-powered analysis, add your Anthropic API key in Settings. Without it, you get basic technical analysis.',
    icon: Settings,
    color: 'text-foreground-muted',
    tips: [
      'Get your key at console.anthropic.com',
      'Key is stored locally in your browser only',
      'Never sent to any server except Anthropic',
      'Each user needs their own API key'
    ]
  },
  {
    id: 'ready',
    title: '🚀 You\'re Ready!',
    description: 'Start by scanning the market or creating your first Battle Card. Remember: think in scenarios, not predictions!',
    icon: Zap,
    color: 'text-warning',
    tips: [
      '1. Go to Scanner → Find a high-score setup',
      '2. Click "Create Battle Card" on interesting assets',
      '3. Review AI-generated scenarios',
      '4. Save and monitor your Battle Card',
      '5. Paper trade when your scenario triggers!'
    ]
  }
];

interface WelcomeTourProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function WelcomeTour({ isOpen, onClose, onComplete }: WelcomeTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const step = TOUR_STEPS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === TOUR_STEPS.length - 1;
  const progress = ((currentStep + 1) / TOUR_STEPS.length) * 100;

  const goNext = () => {
    if (isLastStep) {
      onComplete();
      return;
    }
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentStep(prev => prev + 1);
      setIsAnimating(false);
    }, 150);
  };

  const goPrev = () => {
    if (isFirstStep) return;
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentStep(prev => prev - 1);
      setIsAnimating(false);
    }, 150);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isOpen) return;
    if (e.key === 'ArrowRight' || e.key === 'Enter') goNext();
    if (e.key === 'ArrowLeft') goPrev();
    if (e.key === 'Escape') onClose();
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStep]);

  if (!isOpen) return null;

  const Icon = step.icon;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={cn(
        "relative w-full max-w-lg mx-4 bg-background-secondary border border-border rounded-2xl shadow-2xl overflow-hidden transition-all duration-150",
        isAnimating ? 'opacity-50 scale-95' : 'opacity-100 scale-100'
      )}>
        {/* Progress Bar */}
        <div className="h-1 bg-background-tertiary">
          <div 
            className="h-full bg-accent transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2 text-sm text-foreground-muted">
            <HelpCircle className="w-4 h-4" />
            <span>Quick Tour</span>
            <span className="text-foreground-secondary">
              {currentStep + 1} / {TOUR_STEPS.length}
            </span>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-background-tertiary transition-colors"
          >
            <X className="w-5 h-5 text-foreground-muted" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Icon */}
          <div className={cn(
            "w-16 h-16 rounded-2xl flex items-center justify-center mb-4",
            step.color === 'text-accent' ? 'bg-accent/10' :
            step.color === 'text-success' ? 'bg-success/10' :
            step.color === 'text-warning' ? 'bg-warning/10' :
            step.color === 'text-info' ? 'bg-info/10' :
            step.color === 'text-danger' ? 'bg-danger/10' :
            step.color === 'text-purple-400' ? 'bg-purple-500/10' :
            'bg-foreground-muted/10'
          )}>
            <Icon className={cn("w-8 h-8", step.color)} />
          </div>

          {/* Title & Description */}
          <h2 className="text-xl font-bold text-foreground mb-2">
            {step.title}
          </h2>
          <p className="text-foreground-secondary mb-4">
            {step.description}
          </p>

          {/* Tips */}
          {step.tips && step.tips.length > 0 && (
            <div className="bg-background-tertiary/50 rounded-xl p-4 space-y-2">
              {step.tips.map((tip, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-accent mt-0.5">•</span>
                  <span className="text-foreground-secondary">{tip}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border bg-background-tertiary/30">
          <button
            onClick={goPrev}
            disabled={isFirstStep}
            className={cn(
              "flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              isFirstStep 
                ? "text-foreground-muted cursor-not-allowed" 
                : "text-foreground-secondary hover:text-foreground hover:bg-background-tertiary"
            )}
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex items-center gap-1">
            {TOUR_STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentStep(i)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  i === currentStep 
                    ? "bg-accent w-4" 
                    : "bg-foreground-muted/30 hover:bg-foreground-muted/50"
                )}
              />
            ))}
          </div>

          <button
            onClick={goNext}
            className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium bg-accent text-white hover:bg-accent/90 transition-colors"
          >
            {isLastStep ? "Let's Go!" : "Next"}
            {!isLastStep && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// Quick Tips component for contextual help
interface QuickTipProps {
  title: string;
  children: React.ReactNode;
}

export function QuickTip({ title, children }: QuickTipProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 rounded-full hover:bg-background-tertiary transition-colors"
      >
        <HelpCircle className="w-4 h-4 text-foreground-muted" />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-50 left-0 top-full mt-2 w-64 p-3 bg-background-elevated border border-border rounded-xl shadow-xl animate-fade-in">
            <h4 className="font-semibold text-foreground text-sm mb-1">{title}</h4>
            <div className="text-xs text-foreground-secondary">
              {children}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
