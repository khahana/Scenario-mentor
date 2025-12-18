'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useMarketDataStore } from '@/lib/stores';
import type { PriceData } from '@/types';

// Binance FUTURES WebSocket (USDT-M perpetuals)
const BINANCE_WS_URL = 'wss://fstream.binance.com/ws';

interface BinanceTickerData {
  e: string;      // Event type
  E: number;      // Event time
  s: string;      // Symbol
  c: string;      // Close price
  o: string;      // Open price
  h: string;      // High price
  l: string;      // Low price
  v: string;      // Total traded base asset volume
  q: string;      // Total traded quote asset volume
  P: string;      // Price change percent
  p: string;      // Price change
}

// Fetch FUTURES prices via REST API (fallback)
async function fetchPricesREST(symbols: string[]): Promise<Record<string, PriceData>> {
  const prices: Record<string, PriceData> = {};
  
  try {
    // Fetch all FUTURES tickers at once
    const response = await fetch('https://fapi.binance.com/fapi/v1/ticker/24hr');
    if (!response.ok) throw new Error('Failed to fetch');
    
    const allTickers = await response.json();
    
    // Filter to only our symbols
    const symbolSet = new Set(symbols.map(s => s.toUpperCase()));
    
    for (const ticker of allTickers) {
      if (symbolSet.has(ticker.symbol)) {
        prices[ticker.symbol] = {
          symbol: ticker.symbol,
          price: parseFloat(ticker.lastPrice),
          change24h: parseFloat(ticker.priceChange),
          changePercent24h: parseFloat(ticker.priceChangePercent),
          high24h: parseFloat(ticker.highPrice),
          low24h: parseFloat(ticker.lowPrice),
          volume24h: parseFloat(ticker.quoteVolume),
          timestamp: Date.now(),
        };
      }
    }
  } catch (error) {
    console.error('REST API fallback error:', error);
  }
  
  return prices;
}

export function useBinanceWebSocket(symbols: string[]) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const wsFailedRef = useRef(false);
  const { updatePrice, updatePrices, setConnected } = useMarketDataStore();

  // REST API polling fallback
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) return; // Already polling
    
    console.log('Starting REST API polling fallback...');
    
    const poll = async () => {
      const prices = await fetchPricesREST(symbols);
      if (Object.keys(prices).length > 0) {
        updatePrices(prices);
        setConnected(true); // Show as connected when we have data
      }
    };
    
    // Initial fetch
    poll();
    
    // Poll every 3 seconds
    pollingIntervalRef.current = setInterval(poll, 3000);
  }, [symbols, updatePrices, setConnected]);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (symbols.length === 0) return;

    // Create stream name for multiple symbols
    const streams = symbols.map(s => `${s.toLowerCase()}@ticker`).join('/');
    const wsUrl = `${BINANCE_WS_URL}/${streams}`;

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('Binance WebSocket connected');
        setConnected(true);
        wsFailedRef.current = false;
        stopPolling(); // Stop REST polling if WS connects
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as BinanceTickerData;
          
          if (data.e === '24hrTicker') {
            const priceData: PriceData = {
              symbol: data.s,
              price: parseFloat(data.c),
              change24h: parseFloat(data.p),
              changePercent24h: parseFloat(data.P),
              high24h: parseFloat(data.h),
              low24h: parseFloat(data.l),
              volume24h: parseFloat(data.q),
              timestamp: data.E,
            };
            
            updatePrice(data.s, priceData);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        wsFailedRef.current = true;
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setConnected(false);
        
        // If WS failed, use REST API fallback
        if (wsFailedRef.current) {
          startPolling();
        }
        
        // Try to reconnect WebSocket after 10 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 10000);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('WebSocket connection error:', error);
      wsFailedRef.current = true;
      startPolling();
    }
  }, [symbols, updatePrice, setConnected, startPolling, stopPolling]);

  // Track previous symbols to detect changes
  const prevSymbolsRef = useRef<string[]>([]);

  useEffect(() => {
    // Check if symbols actually changed
    const symbolsChanged = JSON.stringify(symbols.sort()) !== JSON.stringify(prevSymbolsRef.current.sort());
    prevSymbolsRef.current = [...symbols];

    // If symbols changed and we have an existing connection, reconnect
    if (symbolsChanged && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('Watchlist changed, reconnecting WebSocket...');
      wsRef.current.close();
    }

    // Start with REST API to get initial prices immediately
    // This ensures we show "Live" status quickly
    fetchPricesREST(symbols).then(prices => {
      if (Object.keys(prices).length > 0) {
        updatePrices(prices);
        setConnected(true); // Show as connected once we have data
        console.log('Initial prices loaded via REST');
      }
    }).catch(err => {
      console.error('REST fetch failed:', err);
    });
    
    // Then try WebSocket for real-time updates
    // Small delay to let REST complete first
    const wsTimeout = setTimeout(() => {
      connect();
    }, 500);

    return () => {
      clearTimeout(wsTimeout);
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      stopPolling();
    };
  }, [connect, symbols, updatePrices, setConnected, stopPolling]);

  return {
    isConnected: useMarketDataStore(state => state.isConnected),
  };
}

// Hook for fetching historical klines/candles from Binance SPOT
export function useBinanceKlines(
  symbol: string, 
  interval: string = '1h', 
  limit: number = 100
) {
  const fetchKlines = useCallback(async () => {
    try {
      // Use Futures API for perpetual contracts
      const response = await fetch(
        `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
      );
      const data = await response.json();
      
      return data.map((kline: any[]) => ({
        time: kline[0] / 1000, // Convert to seconds for lightweight-charts
        open: parseFloat(kline[1]),
        high: parseFloat(kline[2]),
        low: parseFloat(kline[3]),
        close: parseFloat(kline[4]),
        volume: parseFloat(kline[5]),
      }));
    } catch (error) {
      console.error('Error fetching klines:', error);
      return [];
    }
  }, [symbol, interval, limit]);

  return { fetchKlines };
}

// Hook for order book data
export function useBinanceOrderBook(symbol: string, limit: number = 20) {
  const fetchOrderBook = useCallback(async () => {
    try {
      // Use Futures API for perpetual contracts
      const response = await fetch(
        `https://fapi.binance.com/fapi/v1/depth?symbol=${symbol}&limit=${limit}`
      );
      const data = await response.json();
      
      return {
        bids: data.bids.map((bid: string[]) => ({
          price: parseFloat(bid[0]),
          quantity: parseFloat(bid[1]),
        })),
        asks: data.asks.map((ask: string[]) => ({
          price: parseFloat(ask[0]),
          quantity: parseFloat(ask[1]),
        })),
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('Error fetching order book:', error);
      return null;
    }
  }, [symbol, limit]);

  return { fetchOrderBook };
}

// Custom hook to get price with flash animation
export function usePriceWithFlash(symbol: string) {
  const price = useMarketDataStore(state => state.prices[symbol]?.price);
  const prevPriceRef = useRef<number | undefined>(price);
  const flashRef = useRef<'up' | 'down' | null>(null);

  useEffect(() => {
    if (prevPriceRef.current !== undefined && price !== undefined) {
      if (price > prevPriceRef.current) {
        flashRef.current = 'up';
      } else if (price < prevPriceRef.current) {
        flashRef.current = 'down';
      }
      
      // Reset flash after animation
      setTimeout(() => {
        flashRef.current = null;
      }, 500);
    }
    prevPriceRef.current = price;
  }, [price]);

  return {
    price,
    flash: flashRef.current,
  };
}
