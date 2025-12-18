'use client';

import { useState, useEffect, useRef } from 'react';
import { cn, getScenarioColor } from '@/lib/utils/helpers';
import type { ScenarioType } from '@/types';

// Probability Gauge Component
interface ProbabilityGaugeProps {
  scenarios: Array<{
    type: ScenarioType;
    probability: number;
  }>;
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
  animated?: boolean;
}

export function ProbabilityGauge({ 
  scenarios, 
  size = 'md', 
  showLabels = true,
  animated = true 
}: ProbabilityGaugeProps) {
  const [animatedProbabilities, setAnimatedProbabilities] = useState(
    scenarios.map(s => ({ ...s, animatedValue: 0 }))
  );

  useEffect(() => {
    if (!animated) {
      setAnimatedProbabilities(scenarios.map(s => ({ ...s, animatedValue: s.probability })));
      return;
    }

    const duration = 1000;
    const startTime = Date.now();
    const startValues = animatedProbabilities.map(s => s.animatedValue);

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // Ease out cubic

      setAnimatedProbabilities(
        scenarios.map((s, i) => ({
          ...s,
          animatedValue: startValues[i] + (s.probability - startValues[i]) * eased,
        }))
      );

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [scenarios, animated]);

  const sizeConfig = {
    sm: { size: 80, stroke: 8, fontSize: 'text-lg' },
    md: { size: 120, stroke: 10, fontSize: 'text-2xl' },
    lg: { size: 160, stroke: 12, fontSize: 'text-3xl' },
  };

  const config = sizeConfig[size];
  const radius = (config.size - config.stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  let currentOffset = 0;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={config.size} height={config.size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={config.size / 2}
          cy={config.size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={config.stroke}
          className="text-background-tertiary"
        />
        
        {/* Scenario segments */}
        {animatedProbabilities.map((scenario, index) => {
          const segmentLength = (scenario.animatedValue / 100) * circumference;
          const offset = currentOffset;
          currentOffset += segmentLength;

          return (
            <circle
              key={scenario.type}
              cx={config.size / 2}
              cy={config.size / 2}
              r={radius}
              fill="none"
              stroke={getScenarioColor(scenario.type)}
              strokeWidth={config.stroke}
              strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
              strokeDashoffset={-offset}
              className="transition-all duration-300"
              style={{
                filter: `drop-shadow(0 0 4px ${getScenarioColor(scenario.type)}40)`,
              }}
            />
          );
        })}
      </svg>

      {/* Center content */}
      {showLabels && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('font-bold text-foreground', config.fontSize)}>
            {Math.round(animatedProbabilities[0]?.animatedValue || 0)}%
          </span>
          <span className="text-xs text-foreground-muted">Primary</span>
        </div>
      )}
    </div>
  );
}

// Mini Probability Bars
interface ProbabilityBarsProps {
  scenarios: Array<{
    type: ScenarioType;
    probability: number;
  }>;
  height?: number;
}

export function ProbabilityBars({ scenarios, height = 8 }: ProbabilityBarsProps) {
  return (
    <div className="flex gap-1 w-full" style={{ height }}>
      {scenarios.map((scenario) => (
        <div
          key={scenario.type}
          className="rounded-full transition-all duration-500"
          style={{
            width: `${scenario.probability}%`,
            backgroundColor: getScenarioColor(scenario.type),
            boxShadow: `0 0 8px ${getScenarioColor(scenario.type)}40`,
          }}
        />
      ))}
    </div>
  );
}

// Scenario Badge
interface ScenarioBadgeProps {
  type: ScenarioType;
  probability?: number;
  isActive?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ScenarioBadge({ type, probability, isActive, size = 'md' }: ScenarioBadgeProps) {
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  };

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          'rounded-lg flex items-center justify-center font-bold text-white',
          sizeClasses[size],
          isActive && 'ring-2 ring-offset-2 ring-offset-background'
        )}
        style={{ 
          backgroundColor: getScenarioColor(type),
          boxShadow: isActive ? `0 0 12px ${getScenarioColor(type)}60` : undefined,
        }}
      >
        {type}
      </div>
      {probability !== undefined && (
        <span className="font-mono text-sm" style={{ color: getScenarioColor(type) }}>
          {probability}%
        </span>
      )}
    </div>
  );
}

// Loading Spinner
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <svg
      className={cn('animate-spin', sizeClasses[size], className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

// Tooltip
interface TooltipProps {
  children: React.ReactNode;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function Tooltip({ children, content, position = 'top' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div className={cn(
          'absolute z-50 px-2 py-1 text-xs bg-background-elevated border border-border rounded shadow-lg whitespace-nowrap animate-fade-in',
          positionClasses[position]
        )}>
          {content}
        </div>
      )}
    </div>
  );
}

// Modal
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Content */}
      <div className={cn(
        'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
        'w-full bg-background-secondary border border-border rounded-2xl shadow-2xl',
        'animate-slide-up',
        sizeClasses[size]
      )}>
        {title && (
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            <button 
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-background-tertiary transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
}

// Tabs
interface TabsProps {
  tabs: Array<{
    id: string;
    label: string;
    icon?: React.ComponentType<{ className?: string }>;
  }>;
  activeTab: string;
  onChange: (id: string) => void;
}

export function Tabs({ tabs, activeTab, onChange }: TabsProps) {
  return (
    <div className="flex gap-1 bg-background-secondary rounded-lg p-1">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              isActive
                ? 'bg-accent text-white'
                : 'text-foreground-secondary hover:text-foreground'
            )}
          >
            {Icon && <Icon className="w-4 h-4" />}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

// Progress Ring
interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  className?: string;
}

export function ProgressRing({ 
  progress, 
  size = 60, 
  strokeWidth = 4, 
  color = '#3b82f6',
  className 
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg width={size} height={size} className={cn('transform -rotate-90', className)}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-background-tertiary"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-500"
        style={{
          filter: `drop-shadow(0 0 4px ${color}40)`,
        }}
      />
    </svg>
  );
}

// Alert/Toast
interface AlertProps {
  type: 'info' | 'success' | 'warning' | 'danger';
  title: string;
  message?: string;
  onClose?: () => void;
}

export function Alert({ type, title, message, onClose }: AlertProps) {
  const config = {
    info: { bg: 'bg-info/10', border: 'border-info/30', text: 'text-info' },
    success: { bg: 'bg-success/10', border: 'border-success/30', text: 'text-success' },
    warning: { bg: 'bg-warning/10', border: 'border-warning/30', text: 'text-warning' },
    danger: { bg: 'bg-danger/10', border: 'border-danger/30', text: 'text-danger' },
  };

  const { bg, border, text } = config[type];

  return (
    <div className={cn('flex items-start gap-3 p-4 rounded-xl border', bg, border)}>
      <div className="flex-1">
        <h4 className={cn('font-medium', text)}>{title}</h4>
        {message && <p className="text-sm text-foreground-secondary mt-1">{message}</p>}
      </div>
      {onClose && (
        <button onClick={onClose} className="p-1 hover:bg-background-tertiary rounded">
          <svg className="w-4 h-4 text-foreground-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

// Empty State
interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-accent" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-foreground-secondary mb-4 max-w-sm">{description}</p>
      {action && (
        <button onClick={action.onClick} className="btn btn-primary">
          {action.label}
        </button>
      )}
    </div>
  );
}

// Skeleton Loader
interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={cn(
      'animate-pulse bg-background-tertiary rounded',
      className
    )} />
  );
}
