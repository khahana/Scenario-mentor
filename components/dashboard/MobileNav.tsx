'use client';

import { useState } from 'react';
import { 
  LayoutDashboard, 
  Target, 
  BookOpen, 
  Brain,
  Search,
  Settings as SettingsIcon
} from 'lucide-react';
import { useUIStore, useBattleCardStore } from '@/lib/stores';
import { cn } from '@/lib/utils/helpers';
import { Settings } from '@/components/settings/Settings';

const navItems = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { id: 'scanner', label: 'Scan', icon: Search },
  { id: 'battle-card', label: 'Create', icon: Target },
  { id: 'journal', label: 'Journal', icon: BookOpen },
  { id: 'chat', label: 'AI', icon: Brain },
];

export function MobileNav() {
  const { activeView, setActiveView } = useUIStore();
  const battleCards = useBattleCardStore(state => state.battleCards);
  const [showSettings, setShowSettings] = useState(false);
  
  const activeCards = battleCards.filter(c => c.status === 'active' || c.status === 'monitoring');

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-background-secondary border-t border-border z-40 safe-area-bottom">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id as any)}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 px-3 py-2 min-w-[60px] relative transition-all',
                  isActive 
                    ? 'text-accent' 
                    : 'text-foreground-muted'
                )}
              >
                <div className="relative">
                  <Icon className={cn('w-5 h-5', isActive && 'scale-110')} />
                  {item.id === 'battle-card' && activeCards.length > 0 && (
                    <span className="absolute -top-1 -right-2 bg-accent text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                      {activeCards.length}
                    </span>
                  )}
                  {item.id === 'scanner' && (
                    <span className="absolute -top-1 -right-2 text-[10px]">🔥</span>
                  )}
                </div>
                <span className={cn(
                  'text-[10px] font-medium',
                  isActive && 'text-accent'
                )}>
                  {item.label}
                </span>
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-accent rounded-full" />
                )}
              </button>
            );
          })}
          
          {/* Settings button */}
          <button
            onClick={() => setShowSettings(true)}
            className="flex flex-col items-center justify-center gap-0.5 px-3 py-2 min-w-[60px] text-foreground-muted"
          >
            <SettingsIcon className="w-5 h-5" />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>

      {/* Settings Modal */}
      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
    </>
  );
}
