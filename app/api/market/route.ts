import { NextRequest, NextResponse } from 'next/server';

// Binance Futures REST API endpoint for perpetual contracts
const BINANCE_FUTURES_API = 'https://fapi.binance.com/fapi/v1';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || 'BTCUSDT';
  const type = searchParams.get('type') || 'ticker';

  try {
    switch (type) {
      case 'ticker': {
        const response = await fetch(`${BINANCE_FUTURES_API}/ticker/24hr?symbol=${symbol}`);
        const data = await response.json();
        
        return NextResponse.json({
          symbol: data.symbol,
          price: parseFloat(data.lastPrice),
          change24h: parseFloat(data.priceChange),
          changePercent24h: parseFloat(data.priceChangePercent),
          high24h: parseFloat(data.highPrice),
          low24h: parseFloat(data.lowPrice),
          volume24h: parseFloat(data.quoteVolume),
          timestamp: data.closeTime,
        });
      }

      case 'klines': {
        const interval = searchParams.get('interval') || '1h';
        const limit = searchParams.get('limit') || '100';
        
        const response = await fetch(
          `${BINANCE_FUTURES_API}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
        );
        const data = await response.json();
        
        const klines = data.map((k: any[]) => ({
          time: k[0] / 1000,
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4]),
          volume: parseFloat(k[5]),
        }));
        
        return NextResponse.json(klines);
      }

      case 'depth': {
        const limit = searchParams.get('limit') || '20';
        
        const response = await fetch(
          `${BINANCE_FUTURES_API}/depth?symbol=${symbol}&limit=${limit}`
        );
        const data = await response.json();
        
        return NextResponse.json({
          bids: data.bids.map((b: string[]) => ({
            price: parseFloat(b[0]),
            quantity: parseFloat(b[1]),
          })),
          asks: data.asks.map((a: string[]) => ({
            price: parseFloat(a[0]),
            quantity: parseFloat(a[1]),
          })),
          timestamp: Date.now(),
        });
      }

      case 'tickers': {
        // Futures API uses different endpoint for multiple tickers
        const response = await fetch(`${BINANCE_FUTURES_API}/ticker/24hr`);
        const allData = await response.json();
        
        const symbols = searchParams.get('symbols')?.split(',') || ['BTCUSDT', 'ETHUSDT'];
        const filteredData = allData.filter((d: any) => symbols.includes(d.symbol));
        
        const tickers = filteredData.map((d: any) => ({
          symbol: d.symbol,
          price: parseFloat(d.lastPrice),
          change24h: parseFloat(d.priceChange),
          changePercent24h: parseFloat(d.priceChangePercent),
          high24h: parseFloat(d.highPrice),
          low24h: parseFloat(d.lowPrice),
          volume24h: parseFloat(d.quoteVolume),
          timestamp: d.closeTime,
        }));
        
        return NextResponse.json(tickers);
      }

      default:
        return NextResponse.json(
          { error: 'Invalid type parameter' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Market data API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market data' },
      { status: 500 }
    );
  }
}
