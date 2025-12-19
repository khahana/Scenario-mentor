'use client';

import { useEffect } from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { TopBar } from '@/components/dashboard/TopBar';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { SmartBattleCardCreator } from '@/components/battle-card/SmartBattleCardCreator';
import { Journal } from '@/components/dashboard/Journal';
import { AIChat } from '@/components/ai-mentor/AIChat';
import { MarketScanner } from '@/components/scanner/MarketScanner';
import { WelcomeTour } from '@/components/onboarding/WelcomeTour';
import { useUIStore } from '@/lib/stores';
import { useBinanceWebSocket } from '@/lib/hooks/useBinanceWebSocket';
import { useMarketDataStore } from '@/lib/stores';
import { usePriceMonitor } from '@/lib/hooks/usePriceMonitor';

export default function Home() {
  const { activeView, showAIChat, toggleAIChat, showTour, setShowTour, completeTour } = useUIStore();
  const watchlist = useMarketDataStore(state => state.watchlist);
  
  // Connect to Binance Futures WebSocket for real-time prices
  const { isConnected } = useBinanceWebSocket(watchlist);
  
  // Enable price monitoring for alerts and auto-trading
  usePriceMonitor();
  
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
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-1 ml-64">
        {/* Top Bar */}
        <TopBar isConnected={isConnected} />
        
        {/* Page Content */}
        <main className="p-6 pt-20">
          {renderContent()}
        </main>
      </div>
      
      {/* AI Chat Slide-out Panel */}
      {showAIChat && activeView !== 'chat' && (
        <div className="fixed right-0 top-0 h-full w-[520px] bg-background-secondary border-l border-border shadow-2xl z-50 animate-slide-up">
          <AIChat onClose={toggleAIChat} />
        </div>
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
