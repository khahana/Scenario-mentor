'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  X, 
  Brain, 
  Target, 
  Zap, 
  BookOpen,
  TrendingUp,
  RotateCcw,
  Copy,
  Check,
  Minimize2,
  Maximize2,
  MessageCircle,
  AlertTriangle
} from 'lucide-react';
import { useAIMentorStore, useBattleCardStore, useMarketDataStore } from '@/lib/stores';
import { usePaperTradingStore, JournalEntry } from '@/lib/stores/paperTradingStore';
import { cn, generateId, copyToClipboard, formatPrice } from '@/lib/utils/helpers';
import type { AIMode, AIMessage } from '@/types';

// Strip markdown formatting from AI responses
function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/(?<!\w)\*([^*\n]+)\*(?!\w)/g, '$1')
    .replace(/(?<!\w)_([^_\n]+)_(?!\w)/g, '$1')
    .replace(/^[\s]*[-*•]\s+/gm, '• ')
    .replace(/```[^`]*```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([🎯📈💰⚠️❌✅🚨📊🔥💡])/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const AI_MODES = [
  { id: 'coach', label: 'Coach', icon: TrendingUp, color: 'success', description: 'Real-time guidance' },
  { id: 'builder', label: 'Builder', icon: Target, color: 'accent', description: 'Setup creation' },
  { id: 'challenger', label: 'Challenger', icon: Zap, color: 'warning', description: 'Challenge thesis' },
  { id: 'debrief', label: 'Debrief', icon: BookOpen, color: 'purple', description: 'Post-trade analysis' },
];

const getSystemPrompt = (mode: AIMode) => {
  const basePrompt = `You are an expert trading mentor with deep knowledge of technical analysis, risk management, and trading psychology. You help traders develop discipline and consistency.

IMPORTANT FORMATTING RULES:
- Use plain text only, NO markdown formatting
- NO headers with #, NO bold with **, NO italic with *, NO bullet points with - or *
- Write in clear, conversational paragraphs
- Use emojis sparingly for key points: 🎯 for targets, ⚠️ for warnings, ✅ for confirmations
- Keep responses focused and actionable
- Be direct but supportive`;

  const modePrompts: Record<AIMode, string> = {
    builder: `${basePrompt}

MODE: Setup Builder
Help the trader construct well-defined setups with clear entry, stop, and target levels.`,
    challenger: `${basePrompt}

MODE: Devil's Advocate
Challenge assumptions, identify risks, and stress-test the thesis. Be constructively critical.`,
    coach: `${basePrompt}

MODE: Real-time Coach
Guide live trade management. Focus on what's happening NOW with their positions and setups.`,
    debrief: `${basePrompt}

MODE: Post-trade Analyst
Analyze past trades for patterns. Focus on lessons learned and areas for improvement.`
  };

  return modePrompts[mode] || basePrompt;
};

interface FloatingAIMentorProps {
  scannerData?: any[];
}

export function FloatingAIMentor({ scannerData }: FloatingAIMentorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const { mode, setMode, messages, addMessage, clearMessages, isLoading, setLoading } = useAIMentorStore();
  const battleCards = useBattleCardStore(state => state.battleCards);
  const prices = useMarketDataStore(state => state.prices);
  const watchlist = useMarketDataStore(state => state.watchlist);
  
  // Paper trading data
  const positions = usePaperTradingStore(state => state.positions);
  const journal = usePaperTradingStore(state => state.journal);
  const settings = usePaperTradingStore(state => state.settings);
  const calculateLivePnl = usePaperTradingStore(state => state.calculateLivePnl);
  
  const openPositions = positions.filter(p => p.status === 'open');
  const activeCards = battleCards.filter(c => c.status === 'active' || c.status === 'monitoring');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Build comprehensive context for AI
  const buildContext = () => {
    let context = '\n\n=== TRADER\'S CURRENT CONTEXT ===\n';
    
    // Trading Settings
    context += `\nAccount Size: $${settings.startingBalance}`;
    context += `\nDefault Size: $${settings.defaultSize}`;
    context += `\nLeverage: ${settings.leverage}x\n`;

    // OPEN POSITIONS (most important)
    if (openPositions.length > 0) {
      context += '\n\n## OPEN POSITIONS:\n';
      openPositions.forEach((pos, i) => {
        const symbol = pos.instrument?.replace('/', '').replace('USDT', '') + 'USDT';
        const currentPrice = prices[symbol]?.price;
        const livePnl = currentPrice ? calculateLivePnl(pos, currentPrice) : null;
        
        context += `\nPosition ${i + 1}: ${pos.instrument} ${pos.direction.toUpperCase()}`;
        context += `\n  Entry: $${formatPrice(pos.entryPrice)} | Current: $${currentPrice ? formatPrice(currentPrice) : 'N/A'}`;
        context += `\n  Stop: $${formatPrice(pos.stopLoss)} | Target: $${formatPrice(pos.target1)}`;
        context += `\n  Size: $${pos.size} | Leverage: ${pos.leverage || 1}x`;
        
        if (livePnl) {
          context += `\n  P&L: ${livePnl.pnl >= 0 ? '+' : ''}$${livePnl.pnl.toFixed(2)} (${livePnl.pnlPercent >= 0 ? '+' : ''}${livePnl.pnlPercent.toFixed(2)}%)`;
          context += `\n  R-Multiple: ${livePnl.rMultiple >= 0 ? '+' : ''}${livePnl.rMultiple.toFixed(2)}R`;
        }
        
        context += `\n  Scenario: ${pos.scenarioType} - ${pos.scenarioName}`;
        context += `\n  Thesis: ${pos.thesis}\n`;
      });
    } else {
      context += '\n\nNo open positions currently.\n';
    }
    
    // BATTLE CARDS (planned setups)
    if (activeCards.length > 0) {
      context += '\n\n## ACTIVE BATTLE CARDS:\n';
      activeCards.forEach((card, i) => {
        const symbol = card.instrument?.replace('/', '') || '';
        const price = prices[symbol]?.price;
        context += `\nSetup ${i + 1}: ${card.instrument} (${card.timeframe})`;
        context += `\n  Thesis: ${card.thesis}`;
        context += `\n  Current Price: $${price ? formatPrice(price) : 'N/A'}`;
        
        card.scenarios?.forEach(scenario => {
          if (scenario.entryPrice) {
            const distance = price ? ((price - scenario.entryPrice) / scenario.entryPrice * 100).toFixed(2) : 'N/A';
            context += `\n  ${scenario.type} (${scenario.probability}%): Entry $${formatPrice(scenario.entryPrice)} | ${distance}% away`;
            context += ` | TP: $${formatPrice(scenario.target1 || 0)} | SL: $${formatPrice(scenario.stopLoss || 0)}`;
          }
        });
        context += '\n';
      });
    }
    
    // JOURNAL SUMMARY
    if (journal.length > 0) {
      const wins = journal.filter((j: JournalEntry) => j.outcome === 'win').length;
      const losses = journal.filter((j: JournalEntry) => j.outcome === 'loss').length;
      const totalPnl = journal.reduce((sum: number, j: JournalEntry) => sum + j.pnl, 0);
      const avgR = journal.reduce((sum: number, j: JournalEntry) => sum + j.rMultiple, 0) / journal.length;
      
      context += `\n\n## TRADING JOURNAL SUMMARY:`;
      context += `\n  Total Trades: ${journal.length} | Win Rate: ${((wins / journal.length) * 100).toFixed(1)}%`;
      context += `\n  Total P&L: $${totalPnl.toFixed(2)} | Avg R: ${avgR.toFixed(2)}R`;
      
      // Last 5 trades
      const recentTrades = journal.slice(-5).reverse();
      context += `\n  Recent trades:`;
      recentTrades.forEach((j: JournalEntry) => {
        context += `\n    ${j.instrument} ${j.direction}: ${j.outcome.toUpperCase()} ${j.pnl >= 0 ? '+' : ''}$${j.pnl.toFixed(2)} (${j.rMultiple.toFixed(1)}R)`;
        if (j.lessonsLearned) context += ` - "${j.lessonsLearned.slice(0, 50)}..."`;
      });
      context += '\n';
    }
    
    // WATCHLIST PRICES
    context += '\n\n## MARKET PRICES:\n';
    watchlist.slice(0, 10).forEach(symbol => {
      const data = prices[symbol];
      if (data?.price) {
        const change = data.changePercent24h ?? data.change24h ?? 0;
        context += `${symbol}: $${formatPrice(data.price)} (${change >= 0 ? '+' : ''}${change.toFixed(2)}%)\n`;
      }
    });
    
    // SCANNER DATA if provided
    if (scannerData && scannerData.length > 0) {
      context += '\n\n## SCANNER TOP PICKS:\n';
      scannerData.slice(0, 5).forEach(r => {
        context += `${r.symbol}: Score ${r.score} | ${r.setupType} ${r.direction}`;
        if (r.fundingRate !== undefined) context += ` | Funding: ${(r.fundingRate * 100).toFixed(4)}%`;
        context += '\n';
      });
    }
    
    return context;
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: AIMessage = {
      id: generateId(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    addMessage(userMessage);
    const messageText = input.trim();
    setInput('');
    setLoading(true);

    try {
      const apiKey = localStorage.getItem('anthropic_api_key');
      
      if (!apiKey) {
        addMessage({
          id: generateId(),
          role: 'assistant',
          content: '⚠️ API Key Required\n\nTo use AI Mentor, add your Anthropic API key:\n\n1. Click Settings (gear icon)\n2. Go to API Keys tab\n3. Paste your key and Save\n\nGet your key from console.anthropic.com',
          timestamp: new Date()
        });
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
          messages: [...history, { role: 'user', content: messageText }],
          systemPrompt,
          apiKey
        })
      });

      const data = await response.json();
      
      if (data.success && data.response) {
        addMessage({
          id: generateId(),
          role: 'assistant',
          content: stripMarkdown(data.response),
          timestamp: new Date()
        });
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('AI Chat error:', error);
      addMessage({
        id: generateId(),
        role: 'assistant',
        content: `⚠️ Error: ${error instanceof Error ? error.message : 'Connection failed'}.\n\nCheck your API key in Settings.`,
        timestamp: new Date()
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleCopy = async (text: string, id: string) => {
    await copyToClipboard(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Quick action buttons based on context
  const getQuickActions = () => {
    const actions = [];
    
    if (openPositions.length > 0) {
      actions.push({ label: '📊 Check positions', query: 'How are my open positions doing? Should I manage any of them?' });
    }
    
    if (activeCards.length > 0) {
      actions.push({ label: '🎯 Review setups', query: 'Review my active battle cards. Which setups look best right now?' });
    }
    
    if (journal.length >= 5) {
      actions.push({ label: '📈 My patterns', query: 'Analyze my recent trades. What patterns do you see? What should I improve?' });
    }
    
    actions.push({ label: '💡 Market view', query: 'Give me a quick market overview based on the prices you can see.' });
    
    return actions.slice(0, 4);
  };

  if (!isOpen) {
    // Floating button
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed bottom-20 md:bottom-6 right-4 z-50',
          'w-14 h-14 rounded-full',
          'bg-gradient-to-br from-purple-500 to-accent',
          'flex items-center justify-center',
          'shadow-lg shadow-purple-500/30',
          'hover:scale-110 transition-transform',
          'animate-pulse hover:animate-none'
        )}
        title="AI Mentor"
      >
        <Brain className="w-7 h-7 text-white" />
        {(openPositions.length > 0 || activeCards.length > 0) && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-success rounded-full text-[10px] font-bold flex items-center justify-center text-white">
            {openPositions.length + activeCards.length}
          </span>
        )}
      </button>
    );
  }

  // Chat panel
  return (
    <div 
      className={cn(
        'fixed z-50 bg-background border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden',
        'transition-all duration-300',
        isExpanded 
          ? 'inset-4 md:inset-10' 
          : 'bottom-20 md:bottom-6 right-4 w-[calc(100%-2rem)] md:w-[420px] h-[500px] md:h-[600px]'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-background-secondary">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-accent flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-foreground">AI Mentor</h3>
            <p className="text-[10px] text-foreground-muted">
              {openPositions.length} positions • {activeCards.length} setups • {journal.length} journal
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 hover:bg-background-tertiary rounded-lg text-foreground-muted hover:text-foreground transition-colors"
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={clearMessages}
            className="p-1.5 hover:bg-background-tertiary rounded-lg text-foreground-muted hover:text-foreground transition-colors"
            title="Clear chat"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 hover:bg-background-tertiary rounded-lg text-foreground-muted hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mode Selector */}
      <div className="flex gap-1 p-2 border-b border-border overflow-x-auto scrollbar-hide">
        {AI_MODES.map(m => {
          const Icon = m.icon;
          const isActive = mode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setMode(m.id as AIMode)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap',
                isActive 
                  ? 'bg-accent/20 text-accent' 
                  : 'text-foreground-muted hover:text-foreground hover:bg-background-tertiary'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {m.label}
            </button>
          );
        })}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center py-6">
            <Brain className="w-12 h-12 mx-auto mb-3 text-foreground-muted opacity-50" />
            <p className="text-sm text-foreground-muted mb-4">
              I can see your battle cards, positions, and journal. Ask me anything!
            </p>
            
            {/* Quick Actions */}
            <div className="flex flex-wrap justify-center gap-2">
              {getQuickActions().map((action, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setInput(action.query);
                    setTimeout(sendMessage, 100);
                  }}
                  className="px-3 py-1.5 text-xs rounded-full bg-background-tertiary hover:bg-accent/20 text-foreground-secondary hover:text-accent transition-colors"
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                'flex gap-2',
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500/20 to-accent/20 flex items-center justify-center flex-shrink-0">
                  <Brain className="w-4 h-4 text-accent" />
                </div>
              )}
              <div
                className={cn(
                  'max-w-[85%] rounded-xl px-3 py-2 text-sm',
                  msg.role === 'user'
                    ? 'bg-accent text-white rounded-br-sm'
                    : 'bg-background-tertiary text-foreground rounded-bl-sm'
                )}
              >
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                {msg.role === 'assistant' && (
                  <button
                    onClick={() => handleCopy(msg.content, msg.id)}
                    className="mt-1 text-[10px] text-foreground-muted hover:text-foreground flex items-center gap-1"
                  >
                    {copiedId === msg.id ? (
                      <><Check className="w-3 h-3" /> Copied</>
                    ) : (
                      <><Copy className="w-3 h-3" /> Copy</>
                    )}
                  </button>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-4 h-4 text-accent" />
                </div>
              )}
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500/20 to-accent/20 flex items-center justify-center">
              <Brain className="w-4 h-4 text-accent animate-pulse" />
            </div>
            <div className="bg-background-tertiary rounded-xl px-3 py-2 rounded-bl-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-foreground-muted rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-foreground-muted rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-foreground-muted rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border bg-background-secondary">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your trades, setups, or market..."
            className="flex-1 bg-background-tertiary rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent/50 min-h-[40px] max-h-[100px]"
            rows={1}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className={cn(
              'p-2.5 rounded-xl transition-all',
              input.trim() && !isLoading
                ? 'bg-accent text-white hover:bg-accent/80'
                : 'bg-background-tertiary text-foreground-muted'
            )}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
