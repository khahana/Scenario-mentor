'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, LineStyle } from 'lightweight-charts';
import { useMarketDataStore } from '@/lib/stores';
import { useBinanceKlines } from '@/lib/hooks/useBinanceWebSocket';
import { getScenarioColor } from '@/lib/utils/helpers';
import type { Scenario, ScenarioType } from '@/types';

interface TradingChartProps {
  symbol: string;
  interval?: string;
  scenarios?: Scenario[];
  height?: number;
  showEMAs?: boolean; // New prop to control EMA display
}

// Convert interval to Binance format
function toBinanceInterval(interval: string): string {
  const map: Record<string, string> = {
    '1m': '1m',
    '5m': '5m',
    '15m': '15m',
    '1h': '1h',
    '1H': '1h',
    '4h': '4h',
    '4H': '4h',
    '1d': '1d',
    '1D': '1d',
    '1w': '1w',
    '1W': '1w',
  };
  return map[interval] || '1h';
}

// Calculate EMA
function calculateEMA(data: number[], period: number): number[] {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);
  
  // Start with SMA for first value
  let sum = 0;
  for (let i = 0; i < Math.min(period, data.length); i++) {
    sum += data[i];
  }
  ema.push(sum / Math.min(period, data.length));
  
  // Calculate EMA for rest
  for (let i = 1; i < data.length; i++) {
    if (i < period) {
      // Use SMA until we have enough data
      let smaSum = 0;
      for (let j = 0; j <= i; j++) {
        smaSum += data[j];
      }
      ema.push(smaSum / (i + 1));
    } else {
      ema.push((data[i] - ema[i - 1]) * multiplier + ema[i - 1]);
    }
  }
  
  return ema;
}

// Get decimal precision based on price magnitude
function getPriceDecimals(price: number): number {
  if (price >= 10000) return 2;      // BTC: 2 decimals
  if (price >= 100) return 3;        // ETH, SOL: 3 decimals
  if (price >= 1) return 4;          // Most alts: 4 decimals
  if (price >= 0.01) return 5;       // Small alts: 5 decimals
  return 6;                          // Micro alts: 6 decimals
}

export function TradingChart({ symbol, interval = '1h', scenarios = [], height = 400, showEMAs = false }: TradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const ema50SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const ema70SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const priceLineRefs = useRef<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const currentPrice = useMarketDataStore(state => state.prices[symbol]?.price);
  
  // Fetch klines from Binance FUTURES API (USDT-M Perpetuals)
  const fetchKlines = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const binanceInterval = toBinanceInterval(interval);
      // Use Futures API for perpetual contracts - fetch more for EMA calculation
      const limit = showEMAs ? 150 : 100;
      const response = await fetch(
        `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${binanceInterval}&limit=${limit}`
      );
      
      if (!response.ok) {
        // Fallback to Spot API if Futures fails
        console.log('Futures API failed, trying Spot...');
        const spotResponse = await fetch(
          `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${binanceInterval}&limit=${limit}`
        );
        if (!spotResponse.ok) {
          throw new Error('Failed to fetch chart data');
        }
        const spotData = await spotResponse.json();
        return spotData.map((kline: any[]) => ({
          time: kline[0] / 1000,
          open: parseFloat(kline[1]),
          high: parseFloat(kline[2]),
          low: parseFloat(kline[3]),
          close: parseFloat(kline[4]),
          volume: parseFloat(kline[5]),
        }));
      }
      
      const data = await response.json();
      
      return data.map((kline: any[]) => ({
        time: kline[0] / 1000,
        open: parseFloat(kline[1]),
        high: parseFloat(kline[2]),
        low: parseFloat(kline[3]),
        close: parseFloat(kline[4]),
        volume: parseFloat(kline[5]),
      }));
    } catch (err) {
      console.error('Error fetching klines:', err);
      setError('Failed to load chart data');
      return [];
    } finally {
      setLoading(false);
    }
  }, [symbol, interval, showEMAs]);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#0a0a0f' },
        textColor: '#a1a1aa',
      },
      grid: {
        vertLines: { color: '#1a1a24' },
        horzLines: { color: '#1a1a24' },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: '#3b82f6',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#3b82f6',
        },
        horzLine: {
          color: '#3b82f6',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#3b82f6',
        },
      },
      timeScale: {
        borderColor: '#27272a',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#27272a',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      localization: {
        priceFormatter: (price: number) => {
          const decimals = getPriceDecimals(price);
          return price.toFixed(decimals);
        },
      },
      handleScale: {
        axisPressedMouseMove: true,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderUpColor: '#10b981',
      borderDownColor: '#ef4444',
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;

    // Add EMA lines if enabled
    if (showEMAs) {
      const ema50Series = chart.addLineSeries({
        color: '#10b981', // Green for EMA 50
        lineWidth: 2,
        title: 'EMA 50',
        priceLineVisible: false,
        lastValueVisible: false,
      });
      ema50SeriesRef.current = ema50Series;

      const ema70Series = chart.addLineSeries({
        color: '#ef4444', // Red for EMA 70
        lineWidth: 2,
        title: 'EMA 70',
        priceLineVisible: false,
        lastValueVisible: false,
      });
      ema70SeriesRef.current = ema70Series;
    }

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial size

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [showEMAs]);

  // Fetch and set data
  useEffect(() => {
    const loadData = async () => {
      const klines = await fetchKlines();
      if (candleSeriesRef.current && klines.length > 0) {
        // Set candle data
        candleSeriesRef.current.setData(klines);
        
        // Calculate and set EMAs if enabled
        if (showEMAs && ema50SeriesRef.current && ema70SeriesRef.current) {
          const closes = klines.map((k: any) => k.close);
          const times = klines.map((k: any) => k.time);
          
          const ema50Values = calculateEMA(closes, 50);
          const ema70Values = calculateEMA(closes, 70);
          
          const ema50Data = times.map((time: number, i: number) => ({
            time,
            value: ema50Values[i],
          }));
          
          const ema70Data = times.map((time: number, i: number) => ({
            time,
            value: ema70Values[i],
          }));
          
          ema50SeriesRef.current.setData(ema50Data);
          ema70SeriesRef.current.setData(ema70Data);
        }
        
        chartRef.current?.timeScale().fitContent();
      }
    };

    loadData();
  }, [symbol, interval, fetchKlines, showEMAs]);

  // Update with current price
  useEffect(() => {
    if (candleSeriesRef.current && currentPrice) {
      try {
        const data = candleSeriesRef.current.data();
        const lastCandle = data.length > 0 ? data[data.length - 1] as CandlestickData : null;
        if (lastCandle) {
          candleSeriesRef.current.update({
            ...lastCandle,
            close: currentPrice,
            high: Math.max(lastCandle.high, currentPrice),
            low: Math.min(lastCandle.low, currentPrice),
          });
        }
      } catch (e) {
        // Ignore update errors
      }
    }
  }, [currentPrice]);

  // Draw scenario price lines
  useEffect(() => {
    if (!candleSeriesRef.current || !scenarios || scenarios.length === 0) return;

    // Remove existing price lines
    priceLineRefs.current.forEach(line => {
      try {
        candleSeriesRef.current?.removePriceLine(line);
      } catch (e) {
        // Line might already be removed
      }
    });
    priceLineRefs.current = [];

    // Add new price lines for each scenario
    scenarios.forEach((scenario) => {
      if (!scenario.entryPrice) return; // Skip C and D
      
      const color = getScenarioColor(scenario.type as ScenarioType);
      
      // Entry line
      const entryLine = candleSeriesRef.current?.createPriceLine({
        price: scenario.entryPrice,
        color: color,
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: `${scenario.type} Entry`,
      });
      if (entryLine) priceLineRefs.current.push(entryLine);

      // Stop loss line
      if (scenario.stopLoss) {
        const stopLine = candleSeriesRef.current?.createPriceLine({
          price: scenario.stopLoss,
          color: '#ef4444',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `${scenario.type} Stop`,
        });
        if (stopLine) priceLineRefs.current.push(stopLine);
      }

      // Target lines
      if (scenario.target1) {
        const t1Line = candleSeriesRef.current?.createPriceLine({
          price: scenario.target1,
          color: '#10b981',
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title: `${scenario.type} T1`,
        });
        if (t1Line) priceLineRefs.current.push(t1Line);
      }

      if (scenario.target2) {
        const t2Line = candleSeriesRef.current?.createPriceLine({
          price: scenario.target2,
          color: '#10b981',
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title: `${scenario.type} T2`,
        });
        if (t2Line) priceLineRefs.current.push(t2Line);
      }
    });
  }, [scenarios]);

  return (
    <div className="relative" style={{ height: `${height}px` }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <div className="text-foreground-muted">Loading chart...</div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <div className="text-danger">{error}</div>
        </div>
      )}
      {/* EMA Legend */}
      {showEMAs && !loading && (
        <div className="absolute top-2 left-2 z-10 flex gap-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-[#10b981]"></div>
            <span className="text-[#10b981]">EMA 50</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-[#ef4444]"></div>
            <span className="text-[#ef4444]">EMA 70</span>
          </div>
        </div>
      )}
      <div 
        ref={chartContainerRef} 
        className="w-full h-full"
      />
    </div>
  );
}

// Mini chart for dashboard
interface MiniChartProps {
  symbol: string;
  interval?: string;
  height?: number;
}

export function MiniChart({ symbol, interval = '1h', height = 80 }: MiniChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const { fetchKlines } = useBinanceKlines(symbol, interval, 50);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: 'transparent' },
        textColor: 'transparent',
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { visible: false },
      },
      timeScale: { visible: false },
      rightPriceScale: { visible: false },
      leftPriceScale: { visible: false },
      crosshair: { mode: 0 },
      handleScale: false,
      handleScroll: false,
    });

    const areaSeries = chart.addAreaSeries({
      lineColor: '#3b82f6',
      topColor: 'rgba(59, 130, 246, 0.3)',
      bottomColor: 'rgba(59, 130, 246, 0.0)',
      lineWidth: 2,
    });

    fetchKlines().then(klines => {
      if (klines.length > 0) {
        areaSeries.setData(klines.map((k: any) => ({ time: k.time, value: k.close })));
        chart.timeScale().fitContent();
      }
    });

    return () => chart.remove();
  }, [symbol, interval, fetchKlines]);

  return (
    <div 
      ref={chartContainerRef} 
      style={{ height: `${height}px` }}
      className="w-full"
    />
  );
}
