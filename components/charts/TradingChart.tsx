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

export function TradingChart({ symbol, interval = '1h', scenarios = [], height = 400 }: TradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
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
      // Use Futures API for perpetual contracts
      const response = await fetch(
        `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${binanceInterval}&limit=100`
      );
      
      if (!response.ok) {
        // Fallback to Spot API if Futures fails
        console.log('Futures API failed, trying Spot...');
        const spotResponse = await fetch(
          `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${binanceInterval}&limit=100`
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
  }, [symbol, interval]);

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
  }, []);

  // Fetch and set data
  useEffect(() => {
    const loadData = async () => {
      const klines = await fetchKlines();
      if (candleSeriesRef.current && klines.length > 0) {
        candleSeriesRef.current.setData(klines);
        chartRef.current?.timeScale().fitContent();
      }
    };

    loadData();
  }, [symbol, interval, fetchKlines]);

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
