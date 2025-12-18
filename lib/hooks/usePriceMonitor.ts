'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useBattleCardStore, useMarketDataStore, useAlertsStore } from '@/lib/stores';
import { usePaperTradingStore } from '@/lib/stores/paperTradingStore';
import type { BattleCard, Scenario } from '@/types';

interface TriggerStatus {
  scenario: Scenario;
  status: 'far' | 'approaching' | 'at_trigger' | 'triggered';
  distance: number;
  message: string;
}

export function usePriceMonitor() {
  const battleCards = useBattleCardStore(state => state.battleCards);
  const updateBattleCard = useBattleCardStore(state => state.updateBattleCard);
  const prices = useMarketDataStore(state => state.prices);
  const addAlert = useAlertsStore(state => state.addAlert);
  
  const paperSettings = usePaperTradingStore(state => state.settings);
  const openPosition = usePaperTradingStore(state => state.openPosition);
  const closePositionWithScenario = usePaperTradingStore(state => state.closePositionWithScenario);
  const getOpenPosition = usePaperTradingStore(state => state.getOpenPosition);
  const calculateLivePnl = usePaperTradingStore(state => state.calculateLivePnl);
  
  const processedActions = useRef<Set<string>>(new Set());

  const analyzeScenarioTrigger = useCallback((
    scenario: Scenario,
    currentPrice: number
  ): TriggerStatus => {
    const entry = scenario.entryPrice;
    
    if (!entry) {
      return { scenario, status: 'far', distance: 100, message: 'No trade scenario' };
    }

    const distanceToEntry = ((currentPrice - entry) / entry) * 100;
    const absDistance = Math.abs(distanceToEntry);

    let status: TriggerStatus['status'] = 'far';
    let message = '';

    if (absDistance <= 0.3) {
      status = 'at_trigger';
      message = `🎯 AT ENTRY: $${currentPrice.toLocaleString()}`;
    } else if (absDistance <= 1.5) {
      status = 'approaching';
      message = `⚡ ${absDistance.toFixed(1)}% from entry`;
    } else {
      status = 'far';
      message = `${absDistance.toFixed(1)}% away`;
    }

    return { scenario, status, distance: absDistance, message };
  }, []);

  // Check if C or D scenario conditions are met
  const checkInvalidationScenarios = useCallback((
    card: BattleCard,
    currentPrice: number,
    position: any
  ): { triggered: boolean; scenario: Scenario | null; reason: string } => {
    if (!card.scenarios) return { triggered: false, scenario: null, reason: '' };
    
    const isLong = position.direction === 'long';
    
    // Find C and D scenarios
    const scenarioC = card.scenarios.find(s => s.type === 'C');
    const scenarioD = card.scenarios.find(s => s.type === 'D');
    
    // Check Scenario D (Invalidation) first - it's more severe
    if (scenarioD) {
      // D scenarios often have triggerPrice for invalidation level
      // Or we can use the stop loss as invalidation
      const invalidationPrice = scenarioD.triggerPrice || scenarioD.stopLoss;
      
      if (invalidationPrice) {
        const invalidated = isLong 
          ? currentPrice <= invalidationPrice
          : currentPrice >= invalidationPrice;
          
        if (invalidated) {
          return {
            triggered: true,
            scenario: scenarioD,
            reason: `Scenario D (${scenarioD.name}) played out - Setup invalidated`
          };
        }
      }
    }
    
    // Check Scenario C (Chaos) - price grinding in range
    if (scenarioC && scenarioC.triggerPrice) {
      // For chaos, check if price is stuck in a certain zone
      const chaosLevel = scenarioC.triggerPrice;
      const distance = Math.abs((currentPrice - chaosLevel) / chaosLevel) * 100;
      
      // If price is very close to chaos trigger and has been there a while
      if (distance <= 0.5) {
        return {
          triggered: true,
          scenario: scenarioC,
          reason: `Scenario C (${scenarioC.name}) playing out - Choppy conditions`
        };
      }
    }
    
    return { triggered: false, scenario: null, reason: '' };
  }, []);

  useEffect(() => {
    if (!paperSettings.enabled) return;
    
    const activeCards = battleCards.filter(c => 
      c.status === 'active' || c.status === 'monitoring'
    );
    
    activeCards.forEach(card => {
      const symbol = card.instrument.replace('/USDT', 'USDT').replace('/', '');
      const priceData = prices[symbol];
      
      if (!priceData?.price || !card.scenarios) return;

      const currentPrice = priceData.price;
      const existingPosition = getOpenPosition(card.id);
      
      // ═══════════════════════════════════════════════════
      // HAVE OPEN POSITION - CHECK FOR EXIT
      // ═══════════════════════════════════════════════════
      if (existingPosition) {
        const { pnl, pnlPercent, rMultiple } = calculateLivePnl(existingPosition, currentPrice);
        const isLong = existingPosition.direction === 'long';
        
        // 1. Check for Scenario D INVALIDATION first
        const { triggered: dTriggered, scenario: dScenario, reason: dReason } = 
          checkInvalidationScenarios(card, currentPrice, existingPosition);
        
        if (dTriggered && dScenario) {
          const actionKey = `invalidation-${existingPosition.id}-${dScenario.type}`;
          if (!processedActions.current.has(actionKey)) {
            processedActions.current.add(actionKey);
            
            closePositionWithScenario(
              existingPosition.id, 
              currentPrice, 
              'invalidation',
              dScenario.type as 'A' | 'B' | 'C' | 'D',
              dScenario.name,
              dReason
            );
            updateBattleCard(card.id, { status: 'closed' });
            
            addAlert({
              type: 'danger',
              title: `🚫 INVALIDATED — ${card.instrument}`,
              message: `${dScenario.type}: ${dScenario.name} | P&L: $${pnl.toFixed(2)} (${rMultiple.toFixed(1)}R)`,
              battleCardId: card.id,
            });
            
            if (paperSettings.soundAlerts) playSound('loss');
          }
          return;
        }
        
        // 2. Check STOP LOSS
        const stopHit = isLong 
          ? currentPrice <= existingPosition.stopLoss
          : currentPrice >= existingPosition.stopLoss;
          
        if (stopHit && paperSettings.autoExitOnStop) {
          const actionKey = `stop-${existingPosition.id}`;
          if (!processedActions.current.has(actionKey)) {
            processedActions.current.add(actionKey);
            
            // Determine which scenario this aligns with (likely D)
            const scenarioD = card.scenarios?.find(s => s.type === 'D');
            
            closePositionWithScenario(
              existingPosition.id, 
              currentPrice, 
              'stop_hit',
              'D',
              scenarioD?.name || 'Stop Loss Hit',
              'Price hit stop loss level'
            );
            updateBattleCard(card.id, { status: 'closed' });
            
            addAlert({
              type: 'danger',
              title: `🛑 STOPPED OUT — ${card.instrument}`,
              message: `Loss: $${Math.abs(pnl).toFixed(2)} (${pnlPercent.toFixed(2)}%) | ${rMultiple.toFixed(1)}R`,
              battleCardId: card.id,
            });
            
            if (paperSettings.soundAlerts) playSound('loss');
          }
          return;
        }
        
        // 3. Check TARGET 1 (Scenario A/B success)
        if (existingPosition.target1 && paperSettings.autoExitOnTarget) {
          const t1Hit = isLong
            ? currentPrice >= existingPosition.target1
            : currentPrice <= existingPosition.target1;
            
          if (t1Hit) {
            const actionKey = `t1-${existingPosition.id}`;
            if (!processedActions.current.has(actionKey)) {
              processedActions.current.add(actionKey);
              
              closePositionWithScenario(
                existingPosition.id, 
                currentPrice, 
                'target1_hit',
                existingPosition.scenarioType,
                existingPosition.scenarioName,
                `Target hit - ${existingPosition.scenarioName} played out perfectly`
              );
              updateBattleCard(card.id, { status: 'completed' });
              
              addAlert({
                type: 'success',
                title: `🎯 TARGET HIT — ${card.instrument}`,
                message: `Profit: +$${pnl.toFixed(2)} (+${pnlPercent.toFixed(2)}%) | +${rMultiple.toFixed(1)}R`,
                battleCardId: card.id,
              });
              
              if (paperSettings.soundAlerts) playSound('win');
            }
            return;
          }
        }
        
        return;
      }
      
      // ═══════════════════════════════════════════════════
      // NO POSITION - CHECK FOR ENTRY
      // ═══════════════════════════════════════════════════
      for (const scenario of card.scenarios) {
        if (!scenario.entryPrice || !scenario.stopLoss || !scenario.target1) continue;
        
        const { status, distance } = analyzeScenarioTrigger(scenario, currentPrice);
        
        // ENTRY TRIGGERED
        if (status === 'at_trigger' && paperSettings.autoExecuteOnTrigger) {
          const actionKey = `entry-${card.id}-${scenario.type}`;
          if (processedActions.current.has(actionKey)) continue;
          processedActions.current.add(actionKey);
          
          const isLong = scenario.target1 > scenario.entryPrice;
          
          openPosition({
            battleCardId: card.id,
            scenarioType: scenario.type as 'A' | 'B' | 'C' | 'D',
            scenarioName: scenario.name,
            instrument: card.instrument,
            timeframe: card.timeframe,
            direction: isLong ? 'long' : 'short',
            thesis: card.thesis || '',
            entryPrice: currentPrice,  // Use actual market price when triggered (simulates market order fill)
            openedAt: new Date(),
            size: paperSettings.defaultSize,
            stopLoss: scenario.stopLoss,
            target1: scenario.target1,
            target2: scenario.target2 ?? undefined,
            target3: scenario.target3 ?? undefined,
          });
          
          updateBattleCard(card.id, { status: 'monitoring' });
          
          addAlert({
            type: 'success',
            title: `📈 POSITION OPENED — ${card.instrument}`,
            message: `${isLong ? 'LONG' : 'SHORT'} @ $${currentPrice.toLocaleString()} | Scenario ${scenario.type}: ${scenario.name}`,
            battleCardId: card.id,
            scenarioType: scenario.type as 'A' | 'B' | 'C' | 'D',
          });
          
          if (paperSettings.soundAlerts) playSound('entry');
          break;
        }
        
        // APPROACHING
        if (status === 'approaching' && distance <= 1) {
          const alertKey = `approach-${card.id}-${scenario.type}`;
          if (!processedActions.current.has(alertKey)) {
            processedActions.current.add(alertKey);
            addAlert({
              type: 'warning',
              title: `⚡ APPROACHING — ${card.instrument}`,
              message: `Scenario ${scenario.type}: ${distance.toFixed(1)}% from entry $${scenario.entryPrice.toLocaleString()}`,
              battleCardId: card.id,
              scenarioType: scenario.type as 'A' | 'B' | 'C' | 'D',
            });
          }
        }
      }
    });
  }, [battleCards, prices, paperSettings, getOpenPosition, calculateLivePnl, openPosition, closePositionWithScenario, updateBattleCard, addAlert, analyzeScenarioTrigger, checkInvalidationScenarios]);

  useEffect(() => {
    const cardIds = new Set(battleCards.map(c => c.id));
    processedActions.current.forEach(key => {
      const parts = key.split('-');
      const cardId = parts[1];
      if (cardId && !cardIds.has(cardId)) {
        processedActions.current.delete(key);
      }
    });
  }, [battleCards]);

  const getCardTriggerStatus = useCallback((card: BattleCard): TriggerStatus[] => {
    const symbol = card.instrument.replace('/USDT', 'USDT').replace('/', '');
    const priceData = prices[symbol];
    
    if (!priceData?.price || !card.scenarios) return [];

    return card.scenarios.map(scenario => 
      analyzeScenarioTrigger(scenario, priceData.price)
    );
  }, [prices, analyzeScenarioTrigger]);

  const getClosestScenario = useCallback((card: BattleCard): TriggerStatus | null => {
    const statuses = getCardTriggerStatus(card);
    const tradeable = statuses.filter(s => s.scenario.entryPrice !== null);
    
    if (tradeable.length === 0) return null;
    
    return tradeable.reduce((closest, current) => 
      current.distance < closest.distance ? current : closest
    );
  }, [getCardTriggerStatus]);

  return { getCardTriggerStatus, getClosestScenario };
}

function playSound(type: 'entry' | 'win' | 'loss') {
  try {
    const frequencies: Record<string, number[]> = {
      entry: [523, 659, 784],
      win: [523, 659, 784, 1047],
      loss: [392, 349, 311],
    };
    
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContext();
    
    frequencies[type].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.value = 0.1;
      osc.start(ctx.currentTime + i * 0.1);
      osc.stop(ctx.currentTime + i * 0.1 + 0.15);
    });
  } catch (e) {}
}
