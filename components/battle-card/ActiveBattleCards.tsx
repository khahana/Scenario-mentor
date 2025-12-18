'use client';

import { useState } from 'react';
import { 
  X, 
  ChevronDown, 
  ChevronUp, 
  Target, 
  Clock, 
  CheckCircle2,
  XCircle,
  Trash2,
  Eye,
  TrendingUp,
  TrendingDown,
  AlertTriangle
} from 'lucide-react';
import { useBattleCardStore, useMarketDataStore } from '@/lib/stores';
import { cn, getScenarioColor, formatPrice } from '@/lib/utils/helpers';
import type { BattleCard } from '@/types';

export function ActiveBattleCards() {
  const { battleCards, updateBattleCard, deleteBattleCard } = useBattleCardStore();
  const prices = useMarketDataStore(state => state.prices);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const activeCards = battleCards.filter(c => c.status === 'active' || c.status === 'monitoring');
  const closedCards = battleCards.filter(c => c.status === 'closed' || c.status === 'completed' || c.status === 'archived');

  const handleCloseCard = (card: BattleCard, outcome: 'completed' | 'closed') => {
    updateBattleCard(card.id, { 
      status: outcome,
      updatedAt: new Date()
    });
  };

  const handleDeleteCard = (cardId: string) => {
    deleteBattleCard(cardId);
    setConfirmDelete(null);
  };

  const getInstrumentSymbol = (instrument: string) => {
    return instrument.replace('/USDT', 'USDT').replace('/', '');
  };

  if (battleCards.length === 0) {
    return (
      <div className="card p-8 text-center">
        <Target className="w-12 h-12 text-foreground-muted mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">No Battle Cards Yet</h3>
        <p className="text-foreground-secondary">
          Create your first Battle Card to start tracking setups
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active Cards */}
      {activeCards.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            Active Setups ({activeCards.length})
          </h2>
          <div className="space-y-3">
            {activeCards.map((card) => {
              const symbol = getInstrumentSymbol(card.instrument);
              const currentPrice = prices[symbol]?.price;
              const isExpanded = expandedCard === card.id;

              return (
                <div key={card.id} className="card overflow-hidden">
                  {/* Header */}
                  <div 
                    className="p-4 cursor-pointer hover:bg-background-tertiary/50 transition-colors"
                    onClick={() => setExpandedCard(isExpanded ? null : card.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                        <Target className="w-5 h-5 text-accent" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{card.instrument}</span>
                          <span className="text-xs text-foreground-muted">{card.timeframe}</span>
                          <span className="badge bg-accent/20 text-accent text-xs">{card.setupType}</span>
                        </div>
                        <p className="text-sm text-foreground-secondary truncate max-w-md">
                          {card.thesis}
                        </p>
                      </div>

                      <div className="text-right">
                        {currentPrice && (
                          <p className="font-mono font-bold text-foreground">
                            ${formatPrice(currentPrice)}
                          </p>
                        )}
                        <p className="text-xs text-foreground-muted">
                          Score: {card.challengerScore}/10
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-foreground-muted" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-foreground-muted" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="border-t border-border">
                      {/* Scenarios */}
                      <div className="p-4 grid grid-cols-4 gap-3">
                        {card.scenarios?.map((scenario) => {
                          // Determine direction from entry/stop
                          const hasTradeParams = scenario.entryPrice && scenario.stopLoss;
                          const direction = hasTradeParams 
                            ? (scenario.entryPrice! > scenario.stopLoss! ? 'long' : 'short')
                            : null;
                          
                          return (
                            <div 
                              key={scenario.id}
                              className="p-3 rounded-lg"
                              style={{ 
                                backgroundColor: `${getScenarioColor(scenario.type)}10`,
                                borderLeft: `3px solid ${getScenarioColor(scenario.type)}`
                              }}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span 
                                    className="font-bold"
                                    style={{ color: getScenarioColor(scenario.type) }}
                                  >
                                    {scenario.type}
                                  </span>
                                  {direction && (
                                    <span className={cn(
                                      'text-[10px] px-1.5 py-0.5 rounded font-semibold',
                                      direction === 'long' 
                                        ? 'bg-success/20 text-success' 
                                        : 'bg-danger/20 text-danger'
                                    )}>
                                      {direction === 'long' ? '↑' : '↓'}
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-foreground-muted">
                                  {scenario.probability}%
                                </span>
                              </div>
                              <p className="text-sm text-foreground-secondary font-medium">
                                {scenario.name}
                              </p>
                              {scenario.description && (
                                <div className="mt-1 mb-2 p-1.5 rounded bg-background/40 border border-border/20">
                                  <p className="text-xs text-foreground-muted leading-relaxed line-clamp-2">
                                    <span className="font-medium text-foreground-secondary">Thesis:</span> {scenario.description}
                                  </p>
                                </div>
                              )}
                              {scenario.entryPrice && (
                                <div className="space-y-2">
                                  {/* Horizontal Price Bar */}
                                  <div className="relative h-6 flex items-center">
                                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 rounded-full bg-gradient-to-r from-danger/30 via-foreground-muted/20 to-success/30" />
                                    {/* Entry marker */}
                                    <div 
                                      className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-accent border-2 border-background z-10"
                                      style={{ left: '50%' }}
                                    />
                                    {/* Stop marker */}
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-danger" />
                                    {/* Target marker */}
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-success" />
                                  </div>
                                  
                                  {/* Price Labels Row */}
                                  <div className="flex justify-between items-center text-xs">
                                    <div className="text-left">
                                      <span className="text-danger font-mono font-semibold">${formatPrice(scenario.stopLoss || 0)}</span>
                                      <span className="text-[9px] text-foreground-muted ml-1">SL</span>
                                    </div>
                                    <div className="text-center">
                                      <span className="text-foreground font-mono font-semibold">${formatPrice(scenario.entryPrice)}</span>
                                      <span className="text-[9px] text-foreground-muted ml-1">ENTRY</span>
                                    </div>
                                    <div className="text-right">
                                      <span className="text-success font-mono font-semibold">${formatPrice(scenario.target1 || 0)}</span>
                                      <span className="text-[9px] text-foreground-muted ml-1">TP</span>
                                    </div>
                                  </div>
                                  
                                  {/* R:R Badge */}
                                  {scenario.stopLoss && scenario.target1 && (
                                    <div className="flex justify-center">
                                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
                                        R:R 1:{(Math.abs(scenario.target1 - scenario.entryPrice) / Math.abs(scenario.entryPrice - scenario.stopLoss)).toFixed(1)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Actions */}
                      <div className="p-4 bg-background-tertiary flex items-center justify-between">
                        <div className="text-sm text-foreground-muted">
                          Created: {new Date(card.createdAt).toLocaleDateString()}
                        </div>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCloseCard(card, 'completed');
                            }}
                            className="btn btn-sm bg-success/20 text-success hover:bg-success/30"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Win
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCloseCard(card, 'closed');
                            }}
                            className="btn btn-sm bg-danger/20 text-danger hover:bg-danger/30"
                          >
                            <XCircle className="w-4 h-4" />
                            Loss
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDelete(card.id);
                            }}
                            className="btn btn-sm btn-secondary"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Delete Confirmation */}
                      {confirmDelete === card.id && (
                        <div className="p-4 bg-danger/10 border-t border-danger/20 flex items-center justify-between">
                          <span className="text-sm text-danger flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            Delete this card permanently?
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="btn btn-sm btn-secondary"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleDeleteCard(card.id)}
                              className="btn btn-sm bg-danger text-white hover:bg-danger/80"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Closed Cards */}
      {closedCards.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground-secondary mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            History ({closedCards.length})
          </h2>
          <div className="space-y-2">
            {closedCards.slice(0, 5).map((card) => (
              <div 
                key={card.id}
                className="card p-3 flex items-center gap-4 opacity-60 hover:opacity-100 transition-opacity"
              >
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center',
                  card.status === 'completed' ? 'bg-success/20' : 'bg-danger/20'
                )}>
                  {card.status === 'completed' ? (
                    <TrendingUp className="w-4 h-4 text-success" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-danger" />
                  )}
                </div>
                <div className="flex-1">
                  <span className="font-medium text-foreground">{card.instrument}</span>
                  <span className="text-foreground-muted text-sm ml-2">{card.setupType}</span>
                </div>
                <span className={cn(
                  'text-sm font-medium',
                  card.status === 'completed' ? 'text-success' : 'text-danger'
                )}>
                  {card.status === 'completed' ? 'Win' : 'Loss'}
                </span>
                <button
                  onClick={() => setConfirmDelete(card.id)}
                  className="p-1 hover:bg-background-tertiary rounded"
                >
                  <Trash2 className="w-4 h-4 text-foreground-muted" />
                </button>
                
                {confirmDelete === card.id && (
                  <div className="absolute right-0 top-full mt-1 p-2 bg-background-elevated border border-border rounded-lg shadow-lg z-10 flex gap-2">
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="btn btn-sm btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleDeleteCard(card.id)}
                      className="btn btn-sm bg-danger text-white"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
