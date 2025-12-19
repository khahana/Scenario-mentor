'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  X, 
  Brain, 
  Target, 
  Zap, 
  BookOpen,
  Sparkles,
  AlertTriangle,
  Lightbulb,
  TrendingUp,
  RotateCcw,
  Copy,
  Check
} from 'lucide-react';
import { useAIMentorStore, useBattleCardStore, useMarketDataStore } from '@/lib/stores';
import { usePaperTradingStore } from '@/lib/stores/paperTradingStore';
import { cn, generateId, copyToClipboard, formatPrice } from '@/lib/utils/helpers';
import type { AIMode, AIMessage } from '@/types';

// Strip markdown formatting from AI responses
function stripMarkdown(text: string): string {
  return text
    // Remove headers (## Header, ### Header, etc.)
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold **text** or __text__
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    // Remove italic *text* or _text_ (but be careful with underscores in words)
    .replace(/(?<!\w)\*([^*\n]+)\*(?!\w)/g, '$1')
    .replace(/(?<!\w)_([^_\n]+)_(?!\w)/g, '$1')
    // Remove bullet points with - or * at start of lines
    .replace(/^[\s]*[-*•]\s+/gm, '• ')
    // Remove code blocks
    .replace(/```[^`]*```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    // Clean up emoji with markdown
    .replace(/\*\*([🎯📈💰⚠️❌✅🚨📊🔥💡])/g, '$1')
    // Clean up multiple newlines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const AI_MODES = [
  { id: 'builder', label: 'Builder', icon: Target, color: 'accent', description: 'Guided setup creation' },
  { id: 'challenger', label: 'Challenger', icon: Zap, color: 'warning', description: 'Challenge your thesis' },
  { id: 'coach', label: 'Coach', icon: TrendingUp, color: 'success', description: 'Real-time guidance' },
  { id: 'debrief', label: 'Debrief', icon: BookOpen, color: 'purple', description: 'Post-trade analysis' },
];

interface AIChatProps {
  onClose?: () => void;
  fullScreen?: boolean;
}

export function AIChat({ onClose, fullScreen = false }: AIChatProps) {
  const { mode, setMode, messages, addMessage, clearMessages, isLoading, setLoading } = useAIMentorStore();
  const battleCards = useBattleCardStore(state => state.battleCards);
  const prices = useMarketDataStore(state => state.prices);
  
  // Paper trading - open positions
  const positions = usePaperTradingStore(state => state.positions);
  const calculateLivePnl = usePaperTradingStore(state => state.calculateLivePnl);
  const openPositions = positions.filter(p => p.status === 'open');
  
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activeCards = battleCards.filter(c => c.status === 'active' || c.status === 'monitoring');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Build context from Battle Cards, positions, and prices
  const buildContext = () => {
    let context = '';
    
    // OPEN POSITIONS (most important - what they're actually trading)
    if (openPositions.length > 0) {
      context += '\n\n## CURRENT OPEN POSITIONS (ACTIVE TRADES):\n';
      openPositions.forEach((pos, i) => {
        const symbol = pos.instrument?.replace('/', '').replace('USDT', '') + 'USDT';
        const currentPrice = prices[symbol]?.price;
        const livePnl = currentPrice ? calculateLivePnl(pos, currentPrice) : null;
        
        context += `\n### Position ${i + 1}: ${pos.instrument} - ${pos.direction.toUpperCase()}\n`;
        context += `Entry Price: $${formatPrice(pos.entryPrice)}\n`;
        context += `Position Size: $${pos.size}\n`;
        context += `Stop Loss: $${formatPrice(pos.stopLoss)}\n`;
        context += `Target: $${formatPrice(pos.target1)}\n`;
        context += `Current Price: $${currentPrice ? formatPrice(currentPrice) : 'N/A'}\n`;
        
        if (livePnl) {
          context += `Live P&L: ${livePnl.pnl >= 0 ? '+' : ''}$${livePnl.pnl.toFixed(2)} (${livePnl.pnlPercent >= 0 ? '+' : ''}${livePnl.pnlPercent.toFixed(2)}%)\n`;
          context += `R-Multiple: ${livePnl.rMultiple >= 0 ? '+' : ''}${livePnl.rMultiple.toFixed(2)}R\n`;
          
          // Calculate distance to stop and target
          if (currentPrice) {
            const distToStop = ((currentPrice - pos.stopLoss) / pos.stopLoss * 100).toFixed(2);
            const distToTarget = ((pos.target1 - currentPrice) / currentPrice * 100).toFixed(2);
            context += `Distance to Stop: ${distToStop}%\n`;
            context += `Distance to Target: ${distToTarget}%\n`;
          }
        }
        
        context += `Scenario: ${pos.scenarioType} - ${pos.scenarioName}\n`;
        context += `Thesis: ${pos.thesis}\n`;
      });
    } else {
      context += '\n\n## NO OPEN POSITIONS\nThe user has no active trades currently.\n';
    }
    
    // BATTLE CARDS (planned setups)
    if (activeCards.length > 0) {
      context += '\n\n## BATTLE CARDS (PLANNED SETUPS):\n';
      activeCards.forEach((card, i) => {
        const symbol = card.instrument?.replace('/', '') || '';
        const price = prices[symbol]?.price;
        context += `\n### Battle Card ${i + 1}: ${card.instrument}\n`;
        context += `- Timeframe: ${card.timeframe}\n`;
        context += `- Setup Type: ${card.setupType}\n`;
        context += `- Thesis: ${card.thesis}\n`;
        context += `- Current Price: $${price ? formatPrice(price) : 'N/A'}\n`;
        context += `- Challenger Score: ${card.challengerScore}/10\n`;
        
        if (card.spinAnalysis) {
          context += `- HTF Trend: ${card.spinAnalysis.htfTrend || 'N/A'}\n`;
          context += `- Key Levels: ${card.spinAnalysis.keyLevels || 'N/A'}\n`;
          context += `- Edge: ${card.spinAnalysis.edgeDefinition || 'N/A'}\n`;
        }
        
        if (card.scenarios && card.scenarios.length > 0) {
          context += `\nScenarios:\n`;
          card.scenarios.forEach(s => {
            context += `  ${s.type}. ${s.name} (${s.probability}%)${s.triggerCondition ? ` - Trigger: ${s.triggerCondition}` : ''}\n`;
            if (s.entryPrice) {
              context += `     Entry: $${formatPrice(s.entryPrice)}, Stop: $${formatPrice(s.stopLoss || 0)}, T1: $${formatPrice(s.target1 || 0)}\n`;
              if (price && s.entryPrice) {
                const distance = ((price - s.entryPrice) / s.entryPrice * 100).toFixed(2);
                context += `     Current distance to entry: ${distance}%\n`;
              }
            }
          });
        }
      });
    } else {
      context += '\n\n## NO ACTIVE BATTLE CARDS\nThe user has no active setups currently.\n';
    }
    
    context += '\n\n## CURRENT MARKET PRICES:\n';
    Object.entries(prices).slice(0, 8).forEach(([symbol, data]) => {
      if (data && data.price) {
        const change = data.changePercent24h ?? 0;
        context += `${symbol}: $${formatPrice(data.price)} (${change >= 0 ? '+' : ''}${change.toFixed(2)}%)\n`;
      }
    });
    
    return context;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: AIMessage = {
      id: generateId(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
      metadata: { mode }
    };

    addMessage(userMessage);
    setInput('');
    setLoading(true);

    try {
      const apiKey = localStorage.getItem('anthropic_api_key');
      
      if (!apiKey) {
        const errorMessage: AIMessage = {
          id: generateId(),
          role: 'assistant',
          content: '⚠️ **API Key Required**\n\nTo use AI Mentor, please add your API key:\n\n1. Click **Settings** (gear icon at bottom of sidebar)\n2. Go to **API Keys** tab\n3. Paste your API key\n4. Click Save\n\nGet your key from your AI provider.',
          timestamp: new Date(),
          metadata: { mode }
        };
        addMessage(errorMessage);
        setLoading(false);
        return;
      }

      const systemPrompt = getSystemPrompt(mode) + buildContext();
      
      // Build conversation history
      const history = messages.slice(-8).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }));

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...history, { role: 'user', content: input.trim() }],
          systemPrompt,
          apiKey
        }),
      });

      const data = await response.json();
      
      if (data.success && data.response) {
        // Strip markdown formatting from response
        const cleanContent = stripMarkdown(data.response);
        
        const assistantMessage: AIMessage = {
          id: generateId(),
          role: 'assistant',
          content: cleanContent,
          timestamp: new Date(),
          metadata: { mode }
        };
        addMessage(assistantMessage);
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('AI Chat error:', error);
      const errorMessage: AIMessage = {
        id: generateId(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Connection failed'}.\n\nCheck your API key in Settings.`,
        timestamp: new Date(),
        metadata: { mode }
      };
      addMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = async (content: string, id: string) => {
    const success = await copyToClipboard(content);
    if (success) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleQuickAction = (prompt: string) => {
    setInput(prompt);
    inputRef.current?.focus();
  };

  return (
    <div className={cn('flex flex-col h-full', fullScreen ? 'bg-background' : 'bg-background-secondary')}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-accent flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">AI Mentor</h2>
            <p className="text-xs text-foreground-muted">{AI_MODES.find(m => m.id === mode)?.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {openPositions.length > 0 && (
            <span className="text-xs bg-warning/20 text-warning px-2 py-1 rounded-full">
              {openPositions.length} open trade{openPositions.length > 1 ? 's' : ''}
            </span>
          )}
          {activeCards.length > 0 && (
            <span className="text-xs bg-accent/20 text-accent px-2 py-1 rounded-full">
              {activeCards.length} card{activeCards.length > 1 ? 's' : ''}
            </span>
          )}
          <button onClick={clearMessages} className="p-2 rounded-lg hover:bg-background-tertiary transition-colors" title="Clear chat">
            <RotateCcw className="w-4 h-4 text-foreground-secondary" />
          </button>
          {onClose && (
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-background-tertiary transition-colors">
              <X className="w-4 h-4 text-foreground-secondary" />
            </button>
          )}
        </div>
      </div>

      {/* Mode Selector */}
      <div className="flex gap-2 p-4 border-b border-border overflow-x-auto">
        {AI_MODES.map((m) => {
          const Icon = m.icon;
          const isActive = mode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setMode(m.id as AIMode)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all',
                isActive ? 'bg-accent/20 text-accent border border-accent/30' : 'bg-background-tertiary text-foreground-secondary hover:text-foreground'
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium">{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <EmptyState mode={mode} onQuickAction={handleQuickAction} activeCards={activeCards} />
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} onCopy={handleCopy} isCopied={copiedId === message.id} />
          ))
        )}
        
        {isLoading && (
          <div className="flex items-center gap-3 text-foreground-secondary">
            <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
            </div>
            <div className="flex gap-1">
              <span className="w-2 h-2 rounded-full bg-foreground-muted animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-foreground-muted animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-foreground-muted animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border">
        {/* Quick Actions Bar - Always visible, compact when messages exist */}
        {messages.length > 0 && (
          <div className="px-4 pt-3 pb-2">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {getQuickActions(mode, activeCards).map((action, i) => {
                const Icon = action.icon;
                return (
                  <button
                    key={i}
                    onClick={() => handleQuickAction(action.prompt)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-background-tertiary hover:bg-background-elevated rounded-lg transition-colors whitespace-nowrap text-xs"
                  >
                    <Icon className="w-3.5 h-3.5 text-accent" />
                    <span className="text-foreground-secondary">{action.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        
        <div className="p-4 pt-2">
          <div className="flex gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={getPlaceholder(mode)}
              className="flex-1 bg-background-tertiary text-foreground px-4 py-3 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-accent/50 min-h-[48px] max-h-32"
              rows={1}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="px-4 py-2 bg-accent hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors"
            >
              <Send className="w-5 h-5 text-white" />
            </button>
          </div>
          <p className="text-xs text-foreground-muted mt-2">Press Enter to send, Shift+Enter for new line</p>
        </div>
      </div>
    </div>
  );
}

// System prompts
function getSystemPrompt(mode: AIMode): string {
  const base = `You are an expert AI Trading Mentor using the Scenario Trading™ methodology. You have access to the user's active Battle Cards and live market prices.

CRITICAL FORMATTING RULES:
1. Do NOT use any markdown: no **bold**, no *italic*, no bullet points with - or *
2. Write in plain, natural conversational paragraphs
3. Use numbered lists (1. 2. 3.) only when listing steps
4. Use line breaks between sections for readability
5. Keep responses concise and actionable

Key principles of Scenario Trading:
Every trade needs a Battle Card with 4 scenarios (A=Primary, B=Alternate, C=Chaos, D=Invalid). Use SPIN analysis: Situation, Problem, Implication, Need/Edge. Maintain Challenger mindset to question consensus and find contrarian edge. Emotional discipline means the plan protects the trader.

Be specific. Reference actual numbers from their Battle Cards. Calculate distances to entries/stops.`;

  const modes: Record<AIMode, string> = {
    builder: `${base}\n\nMODE: SETUP BUILDER\nHelp create comprehensive Battle Cards. Guide through SPIN analysis, scenario definition, and position sizing. Ask focused questions one at a time.`,
    challenger: `${base}\n\nMODE: THESIS CHALLENGER\nBe the devil's advocate. Stress-test their thesis, find holes in logic, present counter-arguments. Be constructively critical but not discouraging.`,
    coach: `${base}\n\nMODE: TRADING COACH\nProvide real-time guidance. Review their Battle Cards vs current prices. Help with probability updates and emotional checks. Be calm and supportive.`,
    debrief: `${base}\n\nMODE: TRADE DEBRIEF\nAnalyze completed trades. Focus on process over outcome. Extract lessons and identify patterns. Be constructive, not judgmental.`
  };

  return modes[mode];
}

function getPlaceholder(mode: AIMode): string {
  const placeholders: Record<AIMode, string> = {
    builder: 'Describe the setup you\'re seeing...',
    challenger: 'Share your thesis to be challenged...',
    coach: 'Ask about your current position or market conditions...',
    debrief: 'Tell me about a trade you want to analyze...'
  };
  return placeholders[mode];
}

// Message Bubble
function MessageBubble({ message, onCopy, isCopied }: { message: AIMessage; onCopy: (c: string, id: string) => void; isCopied: boolean }) {
  const isUser = message.role === 'user';
  
  return (
    <div className={cn('flex gap-3', isUser ? 'flex-row-reverse' : '')}>
      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0', isUser ? 'bg-accent' : 'bg-purple-500/20')}>
        {isUser ? <span className="text-white text-sm font-bold">U</span> : <Brain className="w-4 h-4 text-purple-400" />}
      </div>
      <div className={cn('max-w-[80%] rounded-2xl px-4 py-3', isUser ? 'bg-accent text-white' : 'bg-background-tertiary text-foreground')}>
        <div className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</div>
        {!isUser && (
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/30">
            <span className="text-xs text-foreground-muted">{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            <button onClick={() => onCopy(message.content, message.id)} className="p-1 hover:bg-background-elevated rounded transition-colors">
              {isCopied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3 text-foreground-muted" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Empty State
function EmptyState({ mode, onQuickAction, activeCards }: { mode: AIMode; onQuickAction: (p: string) => void; activeCards: any[] }) {
  const actions = getQuickActions(mode, activeCards);
  
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-6">
      <div className="w-16 h-16 rounded-2xl bg-purple-500/20 flex items-center justify-center mb-4">
        <Brain className="w-8 h-8 text-purple-400" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{getModeTitle(mode)}</h3>
      <p className="text-foreground-secondary text-sm mb-6 max-w-md">{getModeDesc(mode)}</p>
      
      {activeCards.length > 0 && (
        <div className="mb-4 p-3 bg-success/10 border border-success/20 rounded-xl">
          <p className="text-success text-sm">✓ {activeCards.length} active Battle Card{activeCards.length > 1 ? 's' : ''} loaded</p>
        </div>
      )}
      
      <div className="w-full max-w-md space-y-2">
        {actions.map((action, i) => {
          const Icon = action.icon;
          return (
            <button key={i} onClick={() => onQuickAction(action.prompt)} className="w-full flex items-center gap-3 p-3 bg-background-tertiary hover:bg-background-elevated rounded-xl transition-colors text-left">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <Icon className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="font-medium text-foreground text-sm">{action.title}</p>
                <p className="text-xs text-foreground-muted">{action.subtitle}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function getModeTitle(mode: AIMode): string {
  return { builder: 'Setup Builder', challenger: 'Thesis Challenger', coach: 'Trading Coach', debrief: 'Trade Debrief' }[mode];
}

function getModeDesc(mode: AIMode): string {
  return {
    builder: 'I\'ll guide you through creating a comprehensive Battle Card.',
    challenger: 'Share your thesis and I\'ll stress-test your assumptions.',
    coach: 'Real-time guidance on your active positions. I can see your Battle Cards.',
    debrief: 'Let\'s analyze completed trades and extract lessons.'
  }[mode];
}

function getQuickActions(mode: AIMode, activeCards: any[]) {
  const hasCards = activeCards.length > 0;
  const actions: Record<AIMode, any[]> = {
    builder: [
      { icon: Target, title: 'Start New Setup', subtitle: 'Create a Battle Card', prompt: 'Help me create a new Battle Card setup.' },
      { icon: Lightbulb, title: 'SPIN Analysis', subtitle: 'Market interrogation', prompt: 'Walk me through SPIN analysis for my setup.' },
      { icon: Zap, title: 'Define Scenarios', subtitle: 'Plan all 4 outcomes', prompt: 'Help me define the 4 scenarios for my trade.' },
    ],
    challenger: [
      { icon: AlertTriangle, title: 'Challenge My Setup', subtitle: hasCards ? 'Test active card' : 'Share thesis', prompt: hasCards ? 'Challenge my current Battle Card. What am I missing?' : 'Challenge my trading thesis. What should I share?' },
      { icon: Brain, title: 'Find Blind Spots', subtitle: 'What am I missing?', prompt: 'What blind spots might I have?' },
      { icon: TrendingUp, title: 'Counter Case', subtitle: 'What if wrong?', prompt: 'What\'s the strongest case against my position?' },
    ],
    coach: [
      { icon: TrendingUp, title: 'Review Position', subtitle: hasCards ? 'Check vs price' : 'No active cards', prompt: hasCards ? 'Review my Battle Card vs current price. Should I adjust?' : 'Help me identify setups to watch.' },
      { icon: Zap, title: 'Update Probabilities', subtitle: 'Reassess odds', prompt: 'How should I update my scenario probabilities?' },
      { icon: AlertTriangle, title: 'Emotional Check', subtitle: 'Thinking clearly?', prompt: 'I\'m feeling uncertain. Help me think objectively.' },
    ],
    debrief: [
      { icon: BookOpen, title: 'Analyze Trade', subtitle: 'Review execution', prompt: 'Help me analyze my last trade.' },
      { icon: Lightbulb, title: 'Find Patterns', subtitle: 'Identify themes', prompt: 'What patterns should I look for in my trades?' },
      { icon: Target, title: 'Process Review', subtitle: 'Check methodology', prompt: 'Am I following Scenario Trading methodology?' },
    ],
  };
  return actions[mode];
}
