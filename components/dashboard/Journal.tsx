'use client';

import { useState, useMemo } from 'react';
import { 
  Calendar,
  TrendingUp,
  TrendingDown,
  Target,
  BarChart3,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle,
  XCircle,
  DollarSign,
  Edit3,
  Trash2,
  Activity,
  RefreshCw,
  Download,
  Check,
  X
} from 'lucide-react';
import { usePaperTradingStore } from '@/lib/stores/paperTradingStore';
import { useMarketDataStore } from '@/lib/stores';
import { cn, getScenarioColor, formatPrice } from '@/lib/utils/helpers';
import type { ScenarioType } from '@/types';

type ViewMode = 'trades' | 'analytics' | 'positions';
type FilterResult = 'all' | 'win' | 'loss';

export function Journal() {
  const { 
    journal, 
    positions,
    balance,
    totalTrades,
    winCount,
    lossCount,
    winRate,
    totalPnl,
    avgRMultiple,
    settings,
    addJournalNote,
    resetAccount,
    updatePosition
  } = usePaperTradingStore();
  
  const prices = useMarketDataStore(state => state.prices);
  
  const [viewMode, setViewMode] = useState<ViewMode>('trades');
  const [filterResult, setFilterResult] = useState<FilterResult>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesText, setNotesText] = useState('');
  const [editingPositionId, setEditingPositionId] = useState<string | null>(null);
  const [editPosStopLoss, setEditPosStopLoss] = useState('');
  const [editPosTarget, setEditPosTarget] = useState('');

  // Get open positions with live PnL
  const openPositions = positions.filter(p => p.status === 'open');
  
  // Calculate live PnL for a position
  // Formula: PnL = (priceChange / entryPrice) * positionSize * leverage
  const calculateLivePnL = (pos: typeof positions[0]) => {
    const symbol = pos.instrument.replace('/', '');
    const currentPrice = prices[symbol]?.price || pos.entryPrice;
    const priceDiff = pos.direction === 'long' 
      ? currentPrice - pos.entryPrice 
      : pos.entryPrice - currentPrice;
    // Use position leverage if stored, otherwise use settings leverage
    const leverage = pos.leverage || settings.leverage || 1;
    // Correct P&L: (price change %) * position size * leverage
    const pnlPercent = (priceDiff / pos.entryPrice) * 100 * leverage;
    const pnl = (priceDiff / pos.entryPrice) * pos.size * leverage;
    return { currentPrice, pnl, pnlPercent, leverage };
  };

  // Calculate unrealized P&L from all open positions
  const unrealizedPnl = useMemo(() => {
    return openPositions.reduce((total, pos) => {
      const { pnl } = calculateLivePnL(pos);
      return total + pnl;
    }, 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openPositions, prices]);

  // Combined P&L (realized + unrealized)
  const combinedPnl = totalPnl + unrealizedPnl;
  const displayBalance = balance + unrealizedPnl;

  // Filter journal entries
  const filteredJournal = useMemo(() => {
    return journal
      .filter(entry => {
        if (filterResult === 'win') return entry.outcome === 'win';
        if (filterResult === 'loss') return entry.outcome === 'loss';
        return true;
      })
      .filter(entry => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          entry.instrument.toLowerCase().includes(q) ||
          entry.thesis.toLowerCase().includes(q) ||
          entry.scenarioName.toLowerCase().includes(q)
        );
      });
  }, [journal, filterResult, searchQuery]);

  const handleSaveNotes = (entryId: string) => {
    addJournalNote(entryId, notesText);
    setEditingNotes(null);
    setNotesText('');
  };

  // Export journal entries to CSV
  const exportJournalCSV = () => {
    if (journal.length === 0) {
      alert('No trades to export');
      return;
    }

    const headers = [
      'Date',
      'Instrument',
      'Direction',
      'Scenario Type',
      'Scenario Name',
      'Entry Price',
      'Exit Price',
      'Stop Loss',
      'Target',
      'Size',
      'Leverage',
      'P&L ($)',
      'P&L (%)',
      'R Multiple',
      'Outcome',
      'Exit Reason',
      'Holding Period',
      'Thesis',
      'Lessons Learned'
    ];

    const rows = journal.map(entry => [
      new Date(entry.date).toISOString(),
      entry.instrument,
      entry.direction,
      entry.scenarioType,
      entry.scenarioName,
      entry.entryPrice,
      entry.exitPrice,
      entry.stopLoss,
      entry.target,
      entry.size,
      entry.leverage,
      entry.pnl.toFixed(2),
      entry.pnlPercent.toFixed(2),
      entry.rMultiple.toFixed(2),
      entry.outcome,
      entry.exitReason,
      entry.holdingPeriod,
      `"${entry.thesis.replace(/"/g, '""')}"`,
      `"${(entry.lessonsLearned || '').replace(/"/g, '""')}"`
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadCSV(csv, `scenario-trades-${new Date().toISOString().split('T')[0]}.csv`);
  };

  // Export open positions to CSV
  const exportPositionsCSV = () => {
    if (positions.length === 0) {
      alert('No positions to export');
      return;
    }

    const headers = [
      'Opened At',
      'Instrument',
      'Direction',
      'Status',
      'Entry Price',
      'Stop Loss',
      'Target',
      'Size',
      'Leverage',
      'Scenario Type',
      'Scenario Name',
      'Battle Card ID'
    ];

    const rows = positions.map(pos => [
      new Date(pos.openedAt).toISOString(),
      pos.instrument,
      pos.direction,
      pos.status,
      pos.entryPrice,
      pos.stopLoss,
      pos.target1,
      pos.size,
      pos.leverage || 1,
      pos.scenarioType,
      pos.scenarioName,
      pos.battleCardId
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadCSV(csv, `scenario-positions-${new Date().toISOString().split('T')[0]}.csv`);
  };

  // Helper to trigger CSV download
  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in overflow-x-hidden max-w-full">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-4">
        <StatCard 
          title="Balance" 
          value={`$${displayBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle={unrealizedPnl !== 0 ? `(${unrealizedPnl >= 0 ? '+' : ''}$${unrealizedPnl.toFixed(2)} unrealized)` : undefined}
          icon={DollarSign}
          color={combinedPnl >= 0 ? 'success' : 'danger'}
        />
        <StatCard 
          title="Total P&L" 
          value={`${combinedPnl >= 0 ? '+' : ''}$${combinedPnl.toFixed(2)}`}
          subtitle={openPositions.length > 0 ? `Realized: $${totalPnl.toFixed(2)}` : undefined}
          icon={combinedPnl >= 0 ? TrendingUp : TrendingDown}
          color={combinedPnl >= 0 ? 'success' : 'danger'}
        />
        <StatCard 
          title="Win Rate" 
          value={totalTrades > 0 ? `${winRate.toFixed(0)}%` : '—'}
          subtitle={`${winCount}W / ${lossCount}L`}
          icon={Target}
          color="accent"
        />
        <StatCard 
          title="Total Trades" 
          value={totalTrades.toString()}
          icon={BarChart3}
          color="info"
        />
        <StatCard 
          title="Avg R" 
          value={totalTrades > 0 ? `${avgRMultiple >= 0 ? '+' : ''}${avgRMultiple.toFixed(2)}R` : '—'}
          icon={Activity}
          color={avgRMultiple >= 0 ? 'success' : 'danger'}
        />
        <StatCard 
          title="Open" 
          value={openPositions.length.toString()}
          subtitle="Positions"
          icon={Clock}
          color="warning"
        />
      </div>

      {/* View Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(['trades', 'positions', 'analytics'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                viewMode === mode
                  ? 'bg-accent text-white'
                  : 'bg-background-tertiary text-foreground-secondary hover:text-foreground'
              )}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Export Buttons */}
          <div className="flex items-center gap-1 mr-2">
            <button
              onClick={exportJournalCSV}
              disabled={journal.length === 0}
              className="btn btn-secondary text-sm"
              title="Export trade history to CSV"
            >
              <Download className="w-4 h-4" />
              Trades CSV
            </button>
            <button
              onClick={exportPositionsCSV}
              disabled={positions.length === 0}
              className="btn btn-secondary text-sm"
              title="Export positions to CSV"
            >
              <Download className="w-4 h-4" />
              Positions CSV
            </button>
          </div>

          <button
            onClick={() => {
              if (confirm('Reset paper trading account? This will clear all trades and reset balance.')) {
                resetAccount();
              }
            }}
            className="btn btn-secondary text-sm text-danger hover:bg-danger/10"
          >
            <RefreshCw className="w-4 h-4" />
            Reset Account
          </button>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'trades' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
              <input
                type="text"
                placeholder="Search trades..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-10 w-full"
              />
            </div>
            <div className="flex gap-2">
              {(['all', 'win', 'loss'] as FilterResult[]).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setFilterResult(filter)}
                  className={cn(
                    'px-3 py-2 rounded-lg text-sm transition-colors',
                    filterResult === filter
                      ? filter === 'win' ? 'bg-success/20 text-success' 
                        : filter === 'loss' ? 'bg-danger/20 text-danger'
                        : 'bg-accent/20 text-accent'
                      : 'bg-background-tertiary text-foreground-secondary'
                  )}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Trade List */}
          {filteredJournal.length === 0 ? (
            <div className="card p-8 text-center">
              <Calendar className="w-12 h-12 text-foreground-muted mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Trades Yet</h3>
              <p className="text-foreground-secondary">
                Create Battle Cards and let the system auto-trade when triggers hit
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredJournal.map((entry) => (
                <div key={entry.id} className="card overflow-hidden">
                  {/* Trade Header */}
                  <div 
                    className="p-4 cursor-pointer hover:bg-background-tertiary/50 transition-colors"
                    onClick={() => setExpandedEntry(expandedEntry === entry.id ? null : entry.id)}
                  >
                    <div className="flex items-center gap-4">
                      {/* Result Icon */}
                      <div className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center',
                        entry.outcome === 'win' ? 'bg-success/20' : 'bg-danger/20'
                      )}>
                        {entry.outcome === 'win' ? (
                          <CheckCircle className="w-5 h-5 text-success" />
                        ) : (
                          <XCircle className="w-5 h-5 text-danger" />
                        )}
                      </div>

                      {/* Trade Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{entry.instrument}</span>
                          <span className="text-xs text-foreground-muted">{entry.timeframe}</span>
                          <span className={cn(
                            'badge text-xs',
                            entry.direction === 'long' ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'
                          )}>
                            {entry.direction.toUpperCase()}
                          </span>
                          <span 
                            className="w-6 h-6 rounded text-xs flex items-center justify-center font-bold text-white"
                            style={{ backgroundColor: getScenarioColor(entry.scenarioType as ScenarioType) }}
                          >
                            {entry.scenarioType}
                          </span>
                        </div>
                        <p className="text-sm text-foreground-secondary truncate max-w-md mt-1">
                          {entry.thesis}
                        </p>
                      </div>

                      {/* P&L */}
                      <div className="text-right">
                        <p className={cn(
                          'font-mono font-bold text-lg',
                          entry.pnl >= 0 ? 'text-success' : 'text-danger'
                        )}>
                          {entry.pnl >= 0 ? '+' : ''}${entry.pnl.toFixed(2)}
                        </p>
                        <p className={cn(
                          'text-sm font-mono',
                          entry.pnl >= 0 ? 'text-success' : 'text-danger'
                        )}>
                          {entry.rMultiple >= 0 ? '+' : ''}{entry.rMultiple.toFixed(2)}R
                        </p>
                      </div>

                      {/* Expand Icon */}
                      {expandedEntry === entry.id ? (
                        <ChevronUp className="w-5 h-5 text-foreground-muted" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-foreground-muted" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedEntry === entry.id && (
                    <div className="border-t border-border p-4 bg-background-tertiary/30">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-foreground-muted">Entry</p>
                          <p className="font-mono text-foreground">${formatPrice(entry.entryPrice)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-foreground-muted">Exit</p>
                          <p className="font-mono text-foreground">${formatPrice(entry.exitPrice)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-foreground-muted">Stop Loss</p>
                          <p className="font-mono text-danger">${formatPrice(entry.stopLoss)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-foreground-muted">Target</p>
                          <p className="font-mono text-success">${formatPrice(entry.target)}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-foreground-muted">Exit Reason</p>
                          <p className="text-foreground">{entry.exitReason}</p>
                        </div>
                        <div>
                          <p className="text-xs text-foreground-muted">Holding Period</p>
                          <p className="text-foreground">{entry.holdingPeriod}</p>
                        </div>
                        <div>
                          <p className="text-xs text-foreground-muted">Position Size</p>
                          <p className="font-mono text-foreground">${entry.size}</p>
                        </div>
                        <div>
                          <p className="text-xs text-foreground-muted">Leverage</p>
                          <p className="font-mono text-warning">{entry.leverage || 1}x</p>
                        </div>
                        <div>
                          <p className="text-xs text-foreground-muted">P&L %</p>
                          <p className={cn(
                            'font-mono',
                            entry.pnlPercent >= 0 ? 'text-success' : 'text-danger'
                          )}>
                            {entry.pnlPercent >= 0 ? '+' : ''}{entry.pnlPercent.toFixed(2)}%
                          </p>
                        </div>
                      </div>

                      {/* Scenario Analysis - show which scenario played out */}
                      {entry.actualScenario && (
                        <div className="mb-4 p-3 rounded-lg bg-background/50 border border-border">
                          <div className="flex items-center gap-2 mb-2">
                            <span 
                              className="w-6 h-6 rounded text-xs flex items-center justify-center font-bold text-white"
                              style={{ backgroundColor: getScenarioColor(entry.actualScenario as ScenarioType) }}
                            >
                              {entry.actualScenario}
                            </span>
                            <p className="text-sm font-medium text-foreground">
                              Scenario {entry.actualScenario} Played Out
                            </p>
                          </div>
                          <p className="text-sm text-foreground-secondary mb-1">
                            {entry.actualScenarioName}
                          </p>
                          {entry.scenarioNotes && (
                            <p className="text-xs text-foreground-muted italic">
                              {entry.scenarioNotes}
                            </p>
                          )}
                          {entry.scenarioType !== entry.actualScenario && (
                            <p className="text-xs text-warning mt-2">
                              ⚠️ Entered on Scenario {entry.scenarioType}, but {entry.actualScenario} occurred
                            </p>
                          )}
                        </div>
                      )}

                      {/* Notes */}
                      <div className="border-t border-border pt-4">
                        {editingNotes === entry.id ? (
                          <div className="space-y-2">
                            <textarea
                              value={notesText}
                              onChange={(e) => setNotesText(e.target.value)}
                              placeholder="What did you learn from this trade?"
                              className="input w-full h-24 resize-none"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSaveNotes(entry.id)}
                                className="btn btn-sm btn-primary"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => { setEditingNotes(null); setNotesText(''); }}
                                className="btn btn-sm btn-secondary"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs text-foreground-muted">Lessons Learned</p>
                              <button
                                onClick={() => {
                                  setEditingNotes(entry.id);
                                  setNotesText(entry.lessonsLearned || '');
                                }}
                                className="text-xs text-accent hover:text-accent/80 flex items-center gap-1"
                              >
                                <Edit3 className="w-3 h-3" />
                                Edit
                              </button>
                            </div>
                            <p className="text-foreground-secondary text-sm">
                              {entry.lessonsLearned || 'No notes yet. Click edit to add lessons learned.'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {viewMode === 'positions' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Open Positions</h3>
          {openPositions.length === 0 ? (
            <div className="card p-8 text-center">
              <Activity className="w-12 h-12 text-foreground-muted mx-auto mb-4" />
              <p className="text-foreground-secondary">No open positions</p>
            </div>
          ) : (
            <div className="space-y-3">
              {openPositions.map((pos) => {
                const { currentPrice, pnl, pnlPercent } = calculateLivePnL(pos);
                const isProfit = pnl >= 0;
                
                return (
                  <div key={pos.id} className="card p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-foreground">{pos.instrument}</span>
                        <span className={cn(
                          'badge text-xs font-semibold',
                          pos.direction === 'long' ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'
                        )}>
                          {pos.direction.toUpperCase()} {pos.leverage && pos.leverage > 1 ? `${pos.leverage}x` : ''}
                        </span>
                      </div>
                      
                      {/* Live P&L */}
                      <div className={cn(
                        'px-3 py-1.5 rounded-lg text-right',
                        isProfit ? 'bg-success/10' : 'bg-danger/10'
                      )}>
                        <p className={cn(
                          'text-lg font-bold font-mono',
                          isProfit ? 'text-success' : 'text-danger'
                        )}>
                          {isProfit ? '+' : ''}{pnlPercent.toFixed(2)}%
                        </p>
                        <p className={cn(
                          'text-xs font-mono',
                          isProfit ? 'text-success/80' : 'text-danger/80'
                        )}>
                          {isProfit ? '+' : ''}${pnl.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    
                    {/* Trade Levels Grid */}
                    {editingPositionId === pos.id ? (
                      <div className="p-3 rounded-lg bg-background-tertiary/50 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] text-danger font-medium mb-1 block">STOP LOSS</label>
                            <input
                              type="number"
                              step="any"
                              value={editPosStopLoss}
                              onChange={(e) => setEditPosStopLoss(e.target.value)}
                              className="input input-sm w-full font-mono text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-success font-medium mb-1 block">TARGET</label>
                            <input
                              type="number"
                              step="any"
                              value={editPosTarget}
                              onChange={(e) => setEditPosTarget(e.target.value)}
                              className="input input-sm w-full font-mono text-sm"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => {
                              setEditingPositionId(null);
                              setEditPosStopLoss('');
                              setEditPosTarget('');
                            }}
                            className="btn btn-xs btn-secondary"
                          >
                            <X className="w-3 h-3" />
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              const updates: { stopLoss?: number; target1?: number } = {};
                              if (editPosStopLoss && !isNaN(parseFloat(editPosStopLoss))) {
                                updates.stopLoss = parseFloat(editPosStopLoss);
                              }
                              if (editPosTarget && !isNaN(parseFloat(editPosTarget))) {
                                updates.target1 = parseFloat(editPosTarget);
                              }
                              if (Object.keys(updates).length > 0) {
                                updatePosition(pos.id, updates);
                              }
                              setEditingPositionId(null);
                              setEditPosStopLoss('');
                              setEditPosTarget('');
                            }}
                            className="btn btn-xs btn-primary"
                          >
                            <Check className="w-3 h-3" />
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        <div className="p-2 rounded-md bg-background-tertiary/50 text-center">
                          <p className="text-foreground-muted mb-0.5">Entry</p>
                          <p className="font-mono font-semibold text-foreground">${formatPrice(pos.entryPrice)}</p>
                        </div>
                        <div className="p-2 rounded-md bg-accent/10 text-center">
                          <p className="text-foreground-muted mb-0.5">Current</p>
                          <p className="font-mono font-semibold text-accent">${formatPrice(currentPrice)}</p>
                        </div>
                        <div 
                          className="p-2 rounded-md bg-danger/5 text-center border border-danger/20 cursor-pointer hover:bg-danger/10 transition-colors"
                          onClick={() => {
                            setEditPosStopLoss(pos.stopLoss.toString());
                            setEditPosTarget(pos.target1.toString());
                            setEditingPositionId(pos.id);
                          }}
                          title="Click to edit"
                        >
                          <p className="text-foreground-muted mb-0.5">Stop <Edit3 className="w-3 h-3 inline opacity-50" /></p>
                          <p className="font-mono font-semibold text-danger">${formatPrice(pos.stopLoss)}</p>
                        </div>
                        <div 
                          className="p-2 rounded-md bg-success/5 text-center border border-success/20 cursor-pointer hover:bg-success/10 transition-colors"
                          onClick={() => {
                            setEditPosStopLoss(pos.stopLoss.toString());
                            setEditPosTarget(pos.target1.toString());
                            setEditingPositionId(pos.id);
                          }}
                          title="Click to edit"
                        >
                          <p className="text-foreground-muted mb-0.5">Target <Edit3 className="w-3 h-3 inline opacity-50" /></p>
                          <p className="font-mono font-semibold text-success">${formatPrice(pos.target1)}</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Size info */}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/30 text-xs text-foreground-muted">
                      <span>Size: ${pos.size}</span>
                      <span>Opened: {new Date(pos.openedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {viewMode === 'analytics' && (
        <div className="space-y-6">
          {journal.length === 0 ? (
            <div className="card p-8 text-center">
              <BarChart3 className="w-12 h-12 text-foreground-muted mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Trading Data Yet</h3>
              <p className="text-foreground-secondary">
                Complete some trades to see your analytics
              </p>
            </div>
          ) : (
            <>
              {/* Performance Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="card p-4">
                  <p className="text-xs text-foreground-muted mb-1">Total P&L</p>
                  <p className={cn(
                    "text-2xl font-bold",
                    journal.reduce((sum, j) => sum + j.pnl, 0) >= 0 ? 'text-success' : 'text-danger'
                  )}>
                    {journal.reduce((sum, j) => sum + j.pnl, 0) >= 0 ? '+' : ''}
                    ${journal.reduce((sum, j) => sum + j.pnl, 0).toFixed(2)}
                  </p>
                </div>
                <div className="card p-4">
                  <p className="text-xs text-foreground-muted mb-1">Win Rate</p>
                  <p className="text-2xl font-bold text-foreground">
                    {((journal.filter(j => j.outcome === 'win').length / journal.length) * 100).toFixed(0)}%
                  </p>
                  <p className="text-xs text-foreground-muted">
                    {journal.filter(j => j.outcome === 'win').length}W / {journal.filter(j => j.outcome === 'loss').length}L
                  </p>
                </div>
                <div className="card p-4">
                  <p className="text-xs text-foreground-muted mb-1">Avg Win</p>
                  <p className="text-2xl font-bold text-success">
                    +${(journal.filter(j => j.pnl > 0).reduce((sum, j) => sum + j.pnl, 0) / (journal.filter(j => j.pnl > 0).length || 1)).toFixed(2)}
                  </p>
                </div>
                <div className="card p-4">
                  <p className="text-xs text-foreground-muted mb-1">Avg Loss</p>
                  <p className="text-2xl font-bold text-danger">
                    ${(journal.filter(j => j.pnl < 0).reduce((sum, j) => sum + j.pnl, 0) / (journal.filter(j => j.pnl < 0).length || 1)).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* P&L by Scenario Type */}
              <div className="card p-4">
                <h4 className="text-sm font-semibold text-foreground mb-4">P&L by Scenario Type</h4>
                <div className="grid grid-cols-4 gap-4">
                  {(['A', 'B', 'C', 'D'] as const).map(type => {
                    const scenarioTrades = journal.filter(j => j.scenarioType === type);
                    const totalPnl = scenarioTrades.reduce((sum, j) => sum + j.pnl, 0);
                    const wins = scenarioTrades.filter(j => j.outcome === 'win').length;
                    return (
                      <div key={type} className="text-center">
                        <div 
                          className="w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center font-bold text-white"
                          style={{ backgroundColor: getScenarioColor(type) }}
                        >
                          {type}
                        </div>
                        <p className={cn(
                          "font-bold",
                          totalPnl >= 0 ? 'text-success' : 'text-danger'
                        )}>
                          {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(0)}
                        </p>
                        <p className="text-xs text-foreground-muted">
                          {scenarioTrades.length} trades ({wins}W)
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Equity Curve */}
              <div className="card p-4">
                <h4 className="text-sm font-semibold text-foreground mb-4">Equity Curve</h4>
                <div className="h-40 relative">
                  {(() => {
                    const sortedJournal = [...journal].sort((a, b) => 
                      new Date(a.exitTime).getTime() - new Date(b.exitTime).getTime()
                    );
                    let cumulative = settings.startingBalance;
                    const points = sortedJournal.map((j, i) => {
                      cumulative += j.pnl;
                      return { x: i, y: cumulative };
                    });
                    
                    if (points.length < 2) {
                      return <p className="text-center text-foreground-muted py-8">Need at least 2 trades</p>;
                    }
                    
                    const minY = Math.min(...points.map(p => p.y), settings.startingBalance);
                    const maxY = Math.max(...points.map(p => p.y), settings.startingBalance);
                    const range = maxY - minY || 1;
                    const width = 100;
                    const height = 100;
                    
                    const pathD = points.map((p, i) => {
                      const x = (p.x / (points.length - 1)) * width;
                      const y = height - ((p.y - minY) / range) * height;
                      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                    }).join(' ');
                    
                    const lastPoint = points[points.length - 1];
                    const isProfit = lastPoint.y >= settings.startingBalance;
                    
                    return (
                      <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
                        {/* Grid lines */}
                        <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" strokeWidth="0.2" className="text-foreground-muted/30" strokeDasharray="2,2" />
                        {/* Starting balance line */}
                        <line 
                          x1="0" 
                          y1={height - ((settings.startingBalance - minY) / range) * height} 
                          x2="100" 
                          y2={height - ((settings.startingBalance - minY) / range) * height} 
                          stroke="currentColor" 
                          strokeWidth="0.3" 
                          className="text-foreground-muted" 
                          strokeDasharray="1,1" 
                        />
                        {/* Equity curve */}
                        <path 
                          d={pathD} 
                          fill="none" 
                          stroke={isProfit ? '#22c55e' : '#ef4444'} 
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        {/* End point */}
                        <circle 
                          cx={(points.length - 1) / (points.length - 1) * 100} 
                          cy={height - ((lastPoint.y - minY) / range) * height}
                          r="2"
                          fill={isProfit ? '#22c55e' : '#ef4444'}
                        />
                      </svg>
                    );
                  })()}
                </div>
                <div className="flex justify-between text-xs text-foreground-muted mt-2">
                  <span>Start: ${settings.startingBalance.toLocaleString()}</span>
                  <span>
                    Current: ${(settings.startingBalance + journal.reduce((sum, j) => sum + j.pnl, 0)).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Best & Worst Trades */}
              <div className="grid grid-cols-2 gap-4">
                <div className="card p-4">
                  <h4 className="text-sm font-semibold text-success mb-3">🏆 Best Trade</h4>
                  {(() => {
                    const best = [...journal].sort((a, b) => b.pnl - a.pnl)[0];
                    if (!best) return <p className="text-foreground-muted">No trades yet</p>;
                    return (
                      <div>
                        <p className="font-bold text-foreground">{best.instrument}</p>
                        <p className="text-success text-lg font-bold">+${best.pnl.toFixed(2)}</p>
                        <p className="text-xs text-foreground-muted">{best.scenarioName}</p>
                      </div>
                    );
                  })()}
                </div>
                <div className="card p-4">
                  <h4 className="text-sm font-semibold text-danger mb-3">💔 Worst Trade</h4>
                  {(() => {
                    const worst = [...journal].sort((a, b) => a.pnl - b.pnl)[0];
                    if (!worst) return <p className="text-foreground-muted">No trades yet</p>;
                    return (
                      <div>
                        <p className="font-bold text-foreground">{worst.instrument}</p>
                        <p className="text-danger text-lg font-bold">${worst.pnl.toFixed(2)}</p>
                        <p className="text-xs text-foreground-muted">{worst.scenarioName}</p>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Stat Card Component
interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: any;
  color: 'success' | 'danger' | 'warning' | 'info' | 'accent';
}

function StatCard({ title, value, subtitle, icon: Icon, color }: StatCardProps) {
  const colorClasses = {
    success: 'bg-success/10 text-success',
    danger: 'bg-danger/10 text-danger',
    warning: 'bg-warning/10 text-warning',
    info: 'bg-info/10 text-info',
    accent: 'bg-accent/10 text-accent',
  };

  return (
    <div className="card">
      <div className="flex items-center gap-3">
        <div className={cn('p-2 rounded-lg', colorClasses[color])}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <p className="text-xs text-foreground-muted">{title}</p>
          <p className="font-bold text-foreground">{value}</p>
          {subtitle && <p className="text-xs text-foreground-muted">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}
