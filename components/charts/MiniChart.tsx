'use client';

import { useEffect, useRef } from 'react';
import { createChart } from 'lightweight-charts';
import { useBinanceKlines } from '@/lib/hooks/useBinanceWebSocket';

interface MiniChartProps {
  symbol: string;
  interval?: string;
  height?: number;
  showVolume?: boolean;
  lineColor?: string;
}

export function MiniChart({ 
  symbol, 
  interval = '1h', 
  height = 80,
  showVolume = false,
  lineColor = '#3b82f6'
}: MiniChartProps) {
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
      lineColor: lineColor,
      topColor: `${lineColor}30`,
      bottomColor: `${lineColor}00`,
      lineWidth: 2,
    });

    fetchKlines().then(klines => {
      if (klines.length > 0) {
        areaSeries.setData(klines.map((k: any) => ({ time: k.time, value: k.close })));
        chart.timeScale().fitContent();
      }
    });

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [symbol, interval, fetchKlines, lineColor]);

  return (
    <div 
      ref={chartContainerRef} 
      style={{ height: `${height}px` }}
      className="w-full"
    />
  );
}

// Sparkline Component
interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  showDots?: boolean;
}

export function Sparkline({ 
  data, 
  width = 100, 
  height = 30, 
  color = '#3b82f6',
  showDots = false 
}: SparklineProps) {
  if (data.length === 0) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      {/* Area fill */}
      <polygon
        points={areaPoints}
        fill={`${color}20`}
      />
      
      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Dots */}
      {showDots && data.map((value, index) => {
        const x = (index / (data.length - 1)) * width;
        const y = height - ((value - min) / range) * height;
        return (
          <circle
            key={index}
            cx={x}
            cy={y}
            r={2}
            fill={color}
          />
        );
      })}

      {/* End dot (always show) */}
      <circle
        cx={width}
        cy={height - ((data[data.length - 1] - min) / range) * height}
        r={3}
        fill={color}
        style={{ filter: `drop-shadow(0 0 4px ${color})` }}
      />
    </svg>
  );
}

// Price Change Indicator
interface PriceChangeProps {
  value: number;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function PriceChange({ value, showIcon = true, size = 'md' }: PriceChangeProps) {
  const isPositive = value >= 0;
  
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <span className={`
      inline-flex items-center gap-1 font-mono
      ${isPositive ? 'text-success' : 'text-danger'}
      ${sizeClasses[size]}
    `}>
      {showIcon && (
        <svg 
          className={`w-3 h-3 ${isPositive ? '' : 'rotate-180'}`} 
          fill="currentColor" 
          viewBox="0 0 20 20"
        >
          <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
      )}
      {isPositive ? '+' : ''}{value.toFixed(2)}%
    </span>
  );
}
