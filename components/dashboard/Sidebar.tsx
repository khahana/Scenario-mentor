'use client';

import { useState } from 'react';
import { 
  LayoutDashboard, 
  Target, 
  BookOpen, 
  MessageSquare, 
  Settings as SettingsIcon,
  TrendingUp,
  Zap,
  Brain,
  ChevronRight,
  Search
} from 'lucide-react';
import { useUIStore, useBattleCardStore } from '@/lib/stores';
import { cn } from '@/lib/utils/helpers';
import { Settings } from '@/components/settings/Settings';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'scanner', label: 'Scanner', icon: Search, badge: '🔥' },
  { id: 'battle-card', label: 'Battle Card', icon: Target },
  { id: 'journal', label: 'Journal', icon: BookOpen },
  { id: 'chat', label: 'AI Mentor', icon: Brain },
];

export function Sidebar() {
  const { activeView, setActiveView } = useUIStore();
  const battleCards = useBattleCardStore(state => state.battleCards);
  const [showSettings, setShowSettings] = useState(false);
  
  const activeCards = battleCards.filter(c => c.status === 'active' || c.status === 'monitoring');

  return (
    <>
      <aside className="sidebar">
        {/* Logo */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-cyan-500 flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-foreground">Scenario</h1>
              <p className="text-xs text-foreground-muted">Trading Mentor™</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id as any)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                  isActive 
                    ? 'bg-accent/10 text-accent border border-accent/20' 
                    : 'text-foreground-secondary hover:text-foreground hover:bg-background-tertiary'
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
                {'badge' in item && item.badge && (
                  <span className="text-sm">{item.badge}</span>
                )}
                {item.id === 'battle-card' && activeCards.length > 0 && (
                  <span className="ml-auto bg-accent/20 text-accent text-xs px-2 py-0.5 rounded-full">
                    {activeCards.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Settings */}
        <div className="p-4 border-t border-border">
          <button 
            onClick={() => setShowSettings(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-foreground-secondary hover:text-foreground hover:bg-background-tertiary transition-all"
          >
            <SettingsIcon className="w-5 h-5" />
            <span className="font-medium">Settings</span>
          </button>
        </div>
      </aside>

      {/* Settings Modal */}
      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
    </>
  );
}
