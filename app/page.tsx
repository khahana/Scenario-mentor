'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { TopBar } from '@/components/dashboard/TopBar';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { SmartBattleCardCreator } from '@/components/battle-card/SmartBattleCardCreator';
import { Journal } from '@/components/dashboard/Journal';
import { AIChat } from '@/components/ai-mentor/AIChat';
import { FloatingAIMentor } from '@/components/ai-mentor/FloatingAIMentor';
import { MarketScanner } from '@/components/scanner/MarketScanner';
import { WelcomeTour } from '@/components/onboarding/WelcomeTour';
import { MobileNav } from '@/components/dashboard/MobileNav';
import { useUIStore } from '@/lib/stores';
import { useBinanceWebSocket } from '@/lib/hooks/useBinanceWebSocket';
import { useMarketDataStore } from '@/lib/stores';
import { usePriceMonitor } from '@/lib/hooks/usePriceMonitor';

export default function Home() {
  const { activeView, showAIChat, toggleAIChat, showTour, setShowTour, completeTour } = useUIStore();
  const watchlist = useMarketDataStore(state => state.watchlist);
  const [isMobile, setIsMobile] = useState(false);
  
  // Connect to Binance Futures WebSocket for real-time prices
  const { isConnected } = useBinanceWebSocket(watchlist);
  
  // Enable price monitoring for alerts and auto-trading
  usePriceMonitor();
  
  // Detect mobile screen
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Check if first-time user and show tour
  useEffect(() => {
    const hasSeenTour = localStorage.getItem('scenario_tour_completed');
    if (!hasSeenTour) {
      // Small delay to let the UI render first
      const timer = setTimeout(() => {
        setShowTour(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [setShowTour]);

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard />;
      case 'scanner':
        return <MarketScanner />;
      case 'battle-card':
        return <SmartBattleCardCreator />;
      case 'journal':
        return <Journal />;
      case 'chat':
        return <AIChat fullScreen />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex overflow-x-hidden">
      {/* Desktop Sidebar - hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar />
      </div>
      
      {/* Main Content */}
      <div className="flex-1 md:ml-64 min-w-0 overflow-x-hidden">
        {/* Top Bar */}
        <TopBar isConnected={isConnected} />
        
        {/* Page Content - extra bottom padding on mobile for nav */}
        <main className="p-3 md:p-6 pt-16 md:pt-20 pb-20 md:pb-6">
          {renderContent()}
        </main>
      </div>
      
      {/* Mobile Bottom Navigation */}
      <div className="md:hidden">
        <MobileNav />
      </div>
      
      {/* Floating AI Mentor - available on all tabs */}
      {activeView !== 'chat' && (
        <FloatingAIMentor />
      )}
      
      {/* Welcome Tour */}
      <WelcomeTour 
        isOpen={showTour}
        onClose={() => setShowTour(false)}
        onComplete={completeTour}
      />
    </div>
  );
}
