import { NextRequest, NextResponse } from 'next/server';

// System prompt for chart analysis
const SYSTEM_PROMPT = `You are an expert technical analyst and trading mentor using the Scenario Trading™ methodology.

Based on the market data provided, generate a complete Battle Card trading setup.

You must return ONLY a valid JSON object with this EXACT structure (no markdown, no explanation, just JSON):

{
  "instrument": "BTC/USDT",
  "timeframe": "4H",
  "setupType": "Breakout|Breakdown|Reversal|Continuation|Range Play|Liquidity Grab",
  
  "situation": {
    "htfTrend": "Bullish/Bearish/Ranging - brief description",
    "structure": "Current market structure description",
    "keyLevels": ["$85,000 support", "$89,000 resistance"],
    "volatility": "Expanding/Contracting/Transitioning"
  },
  
  "problem": {
    "priceStuck": "Where and why price is stuck or challenged",
    "failedTests": "Recent failed breakouts/breakdowns",
    "trappedParticipants": "Who is trapped and where (longs/shorts at what levels)"
  },
  
  "implication": {
    "cascade": "What happens if key level breaks",
    "stopClusters": "Where stops are likely clustered",
    "forcedActions": "Who gets forced to act and how"
  },
  
  "thesis": "One clear sentence thesis statement",
  "narrative": "What is the dominant market narrative that most traders believe",
  "contradiction": "What contradicts that narrative - this is the edge",
  "challengerScore": 7,
  
  "scenarios": [
    {
      "type": "A",
      "name": "Primary Setup Name",
      "probability": 45,
      "description": "Detailed scenario description",
      "trigger": "SPECIFIC price action trigger - e.g. '4H close above $X' or 'Sweep below $Y then reclaim'",
      "entry": 89200,
      "stop": 87000,
      "targets": [92000, 95000, 98000]
    },
    {
      "type": "B",
      "name": "Secondary Setup Name",
      "probability": 30,
      "description": "Alternative scenario description",
      "trigger": "Specific alternative trigger condition",
      "entry": 85500,
      "stop": 83000,
      "targets": [89000, 92000]
    },
    {
      "type": "C",
      "name": "Chaos Scenario",
      "probability": 15,
      "description": "What unexpected/messy price action looks like - usually means NO TRADE",
      "trigger": "What triggers the chaos scenario",
      "entry": null,
      "stop": null,
      "targets": []
    },
    {
      "type": "D",
      "name": "Invalidation",
      "probability": 10,
      "description": "What completely kills this setup - thesis is wrong",
      "trigger": "Specific invalidation condition",
      "entry": null,
      "stop": null,
      "targets": []
    }
  ],
  
  "reasoning": "Your detailed reasoning for this analysis - why you see what you see",
  "risks": ["Risk 1", "Risk 2", "Risk 3"],
  "edgeDescription": "What is the specific edge - why this trade has positive expectancy"
}

CRITICAL RULES:
- Probabilities MUST sum to exactly 100
- Entry/Stop/Target prices must be realistic numbers based on current price
- All prices should be numbers (not strings)
- challengerScore: 1-3 = following crowd, 4-6 = moderate contrarian view, 7-10 = strong contrarian thesis
- Triggers must be SPECIFIC and actionable (not vague like "if price goes up")
- For long setups: entry > stop, targets > entry
- For short setups: entry < stop, targets < entry
- ONLY return valid JSON, no markdown code blocks, no explanation text`;

// Generate smart fallback analysis based on real price data
function generateFallbackAnalysis(instrument: string, timeframe: string, currentPrice: number, klineData?: any[]) {
  const symbol = instrument.replace('USDT', '/USDT');
  const coin = instrument.replace('USDT', '');
  
  // Calculate technical levels from kline data if available
  let support = currentPrice * 0.95;
  let resistance = currentPrice * 1.05;
  let trend = 'Neutral';
  let volatility = 5;
  let sma20 = currentPrice;
  
  if (klineData && klineData.length >= 20) {
    const closes = klineData.map((k: any) => parseFloat(k.close || k[4]));
    const highs = klineData.map((k: any) => parseFloat(k.high || k[2]));
    const lows = klineData.map((k: any) => parseFloat(k.low || k[3]));
    
    // Calculate SMA20
    const last20Closes = closes.slice(-20);
    sma20 = last20Closes.reduce((a, b) => a + b, 0) / 20;
    
    // Find support/resistance from recent highs/lows
    const recentHighs = highs.slice(-20);
    const recentLows = lows.slice(-20);
    resistance = Math.max(...recentHighs);
    support = Math.min(...recentLows);
    
    // Calculate volatility
    volatility = ((resistance - support) / support) * 100;
    
    // Determine trend
    const firstHalf = closes.slice(-20, -10).reduce((a, b) => a + b, 0) / 10;
    const secondHalf = closes.slice(-10).reduce((a, b) => a + b, 0) / 10;
    if (secondHalf > firstHalf * 1.02) trend = 'Bullish';
    else if (secondHalf < firstHalf * 0.98) trend = 'Bearish';
  }
  
  const isBullish = trend === 'Bullish' || (trend === 'Neutral' && currentPrice > sma20);
  const range = resistance - support;
  
  // Format prices based on magnitude
  const formatP = (p: number) => {
    if (p >= 1000) return Math.round(p);
    if (p >= 1) return Math.round(p * 100) / 100;
    return Math.round(p * 10000) / 10000;
  };

  return {
    instrument: symbol,
    timeframe,
    setupType: isBullish ? 'Breakout' : 'Breakdown',
    
    situation: {
      htfTrend: `${trend} - Price ${currentPrice > sma20 ? 'above' : 'below'} 20-period MA`,
      structure: isBullish 
        ? `Building higher lows, testing resistance at $${formatP(resistance)}`
        : `Making lower highs, testing support at $${formatP(support)}`,
      keyLevels: [`$${formatP(support)} support`, `$${formatP(resistance)} resistance`],
      volatility: volatility > 8 ? 'Expanding' : volatility < 3 ? 'Contracting' : 'Normal',
    },
    
    problem: {
      priceStuck: isBullish 
        ? `Price consolidating below $${formatP(resistance)} resistance`
        : `Price trapped below $${formatP(sma20)} moving average`,
      failedTests: isBullish
        ? `Multiple rejections at $${formatP(resistance)} zone`
        : `Failed to reclaim $${formatP(sma20)} on bounces`,
      trappedParticipants: isBullish
        ? `Shorts trapped above $${formatP(support)}`
        : `Longs trapped below $${formatP(resistance)}`,
    },
    
    implication: {
      cascade: isBullish
        ? `Break above $${formatP(resistance)} triggers short squeeze to $${formatP(resistance + range * 0.5)}`
        : `Break below $${formatP(support)} triggers long liquidations to $${formatP(support - range * 0.5)}`,
      stopClusters: isBullish
        ? `Stops clustered below $${formatP(support)}`
        : `Stops clustered above $${formatP(resistance)}`,
      forcedActions: isBullish
        ? 'Shorts forced to cover on breakout'
        : 'Longs forced to sell on breakdown',
    },
    
    thesis: isBullish
      ? `${coin} poised for breakout above $${formatP(resistance)} with stops below $${formatP(support)}`
      : `${coin} likely to break down below $${formatP(support)} targeting $${formatP(support - range * 0.5)}`,
    
    narrative: isBullish
      ? 'Market expects continuation higher after consolidation'
      : 'Market fears further downside after failed recovery',
    
    contradiction: isBullish
      ? `Volume declining suggests breakout may fail - watch for rejection at $${formatP(resistance)}`
      : `Oversold conditions may trigger relief rally before continuation`,
    
    challengerScore: 6,
    
    scenarios: isBullish ? [
      {
        type: 'A',
        name: 'Bullish Breakout',
        probability: 45,
        description: `Clean break above $${formatP(resistance)} with volume confirmation`,
        trigger: `${timeframe} close above $${formatP(resistance)} with increasing volume`,
        entry: formatP(resistance * 1.005),
        stop: formatP(support),
        targets: [formatP(resistance + range * 0.5), formatP(resistance + range), formatP(resistance + range * 1.5)],
        triggerPrice: formatP(resistance),
      },
      {
        type: 'B',
        name: 'Pullback Entry',
        probability: 30,
        description: `Retest of $${formatP(support)} support then bounce`,
        trigger: `Bounce off $${formatP(support)} with bullish candle`,
        entry: formatP(support * 1.01),
        stop: formatP(support * 0.97),
        targets: [formatP(currentPrice), formatP(resistance)],
        triggerPrice: formatP(support * 1.02),
      },
      {
        type: 'C',
        name: 'Chop Zone',
        probability: 15,
        description: `Price grinds sideways between $${formatP(support)} and $${formatP(resistance)}`,
        trigger: 'Multiple failed breakouts both directions',
        entry: null,
        stop: null,
        targets: [],
        triggerPrice: formatP(currentPrice),
      },
      {
        type: 'D',
        name: 'Setup Invalid',
        probability: 10,
        description: `Daily close below $${formatP(support * 0.95)} kills all bullish scenarios`,
        trigger: `Daily close below $${formatP(support * 0.95)}`,
        entry: null,
        stop: null,
        targets: [],
        triggerPrice: formatP(support * 0.95),
      },
    ] : [
      {
        type: 'A',
        name: 'Bearish Breakdown',
        probability: 45,
        description: `Clean break below $${formatP(support)} with volume`,
        trigger: `${timeframe} close below $${formatP(support)}`,
        entry: formatP(support * 0.995),
        stop: formatP(resistance),
        targets: [formatP(support - range * 0.5), formatP(support - range)],
        triggerPrice: formatP(support),
      },
      {
        type: 'B',
        name: 'Relief Rally Short',
        probability: 30,
        description: `Bounce to $${formatP(resistance)} then rejection`,
        trigger: `Rejection candle at $${formatP(resistance)}`,
        entry: formatP(resistance * 0.99),
        stop: formatP(resistance * 1.03),
        targets: [formatP(currentPrice), formatP(support)],
        triggerPrice: formatP(resistance * 0.98),
      },
      {
        type: 'C',
        name: 'Grind Mode',
        probability: 15,
        description: 'Slow bleed without clear trigger',
        trigger: 'No clean levels, choppy price action',
        entry: null,
        stop: null,
        targets: [],
        triggerPrice: formatP(currentPrice),
      },
      {
        type: 'D',
        name: 'Setup Invalid',
        probability: 10,
        description: `Daily close above $${formatP(resistance * 1.05)} kills bearish thesis`,
        trigger: `Daily close above $${formatP(resistance * 1.05)}`,
        entry: null,
        stop: null,
        targets: [],
        triggerPrice: formatP(resistance * 1.05),
      },
    ],
    
    reasoning: `Based on ${timeframe} price action, ${coin} is showing ${trend.toLowerCase()} structure. ` +
      `Price is currently ${currentPrice > sma20 ? 'above' : 'below'} the 20-period SMA ($${formatP(sma20)}). ` +
      `Key support at $${formatP(support)}, resistance at $${formatP(resistance)}. ` +
      `Volatility is ${volatility.toFixed(1)}% which is ${volatility > 8 ? 'elevated' : volatility < 3 ? 'compressed' : 'normal'}.`,
    
    risks: [
      'Unexpected news could invalidate technical setup',
      `False breakout risk ${isBullish ? 'above' : 'below'} key level`,
      'Market correlation - watch BTC for overall direction',
    ],
    
    edgeDescription: isBullish
      ? `Trapped shorts above $${formatP(support)} create fuel for breakout squeeze`
      : `Trapped longs below $${formatP(resistance)} will accelerate breakdown`,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      instrument, 
      timeframe, 
      direction = 'auto', 
      currentPrice,
      klineData, // Optional: kline data for better analysis
      apiKey, // Client sends the API key
      userThesis // Optional: user-provided thesis to build battle card from
    } = body;

    // Format instrument for display
    const symbol = instrument?.replace('USDT', '/USDT') || 'BTC/USDT';
    
    // Get price from currentPrice or calculate from klines - NEVER use hardcoded default
    let price = currentPrice;
    
    if (!price && klineData && klineData.length > 0) {
      // Get last close price from klines
      const lastKline = klineData[klineData.length - 1];
      price = parseFloat(lastKline[4] || lastKline.close);
    }
    
    if (!price) {
      return NextResponse.json({
        success: false,
        error: 'Could not determine current price. Please try again.',
      }, { status: 400 });
    }

    console.log(`Analyzing ${symbol} at price $${price}`);

    // Require user's API key - no fallback to env variable for shared deployment
    if (!apiKey) {
      console.log('No API key provided - using fallback analysis');
      const fallbackAnalysis = generateFallbackAnalysis(instrument, timeframe, price, klineData);
      return NextResponse.json({
        success: true,
        analysis: fallbackAnalysis,
        model: 'fallback-technical',
        timestamp: new Date().toISOString(),
        note: '⚠️ Add your Anthropic API key in Settings for AI-powered analysis',
      });
    }
    
    const anthropicKey = apiKey;

    // Build the analysis prompt
    const userPrompt = userThesis 
      ? `Create a Battle Card based on the trader's thesis:

TRADER'S THESIS:
"${userThesis}"

MARKET DATA:
- Instrument: ${symbol}
- Timeframe: ${timeframe || '4H'}
- Current Price: $${price.toLocaleString()}
- Direction Bias: ${direction === 'auto' ? 'Determine from thesis' : direction.toUpperCase()}
- Analysis Time: ${new Date().toISOString()}

BUILD A COMPLETE Battle Card that:
1. Uses the trader's thesis as the PRIMARY Scenario A
2. Generate full SPIN Analysis supporting this thesis
3. Create Scenario B as a reasonable alternative/contrary view
4. Add Scenario C (Chaos/chop) and D (Complete Invalidation)
5. Calculate specific entry/stop/target levels based on current price ($${price.toLocaleString()})
6. Challenge the thesis - give honest Challenger Score (1-10)

Important:
- Scenario A should reflect the trader's idea with proper levels
- Be honest in contradiction/challenger - point out potential weaknesses
- Use realistic price levels relative to current price
- Provide clear trigger conditions`
      : `Analyze this trading setup and generate a complete Battle Card:

MARKET DATA:
- Instrument: ${symbol}
- Timeframe: ${timeframe || '4H'}
- Current Price: $${price.toLocaleString()}
- Direction Bias: ${direction === 'auto' ? 'Determine based on your analysis' : direction.toUpperCase()}
- Analysis Time: ${new Date().toISOString()}

Generate a complete Scenario Trading™ Battle Card with:
1. SPIN Analysis (Situation, Problem, Implication, Need/Edge)
2. Challenger Thesis (contrarian view with score 1-10)
3. Four scenarios (A=Primary, B=Secondary, C=Chaos, D=Invalidation)
4. Specific entry/stop/target levels for tradeable scenarios
5. Clear trigger conditions for each scenario

Remember: 
- Use realistic price levels relative to current price ($${price.toLocaleString()})
- Scenario A and B should have concrete entry/stop/targets
- Scenario C and D typically have null entries (no trade scenarios)
- Be specific with triggers (e.g., "4H close above $X" not "price breaks out")`;

    // Call Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Claude API error:', response.status, errorData);
      
      // Fallback to technical analysis on API error
      console.log('API error - using fallback analysis');
      const fallbackAnalysis = generateFallbackAnalysis(instrument, timeframe, price, klineData);
      return NextResponse.json({
        success: true,
        analysis: fallbackAnalysis,
        model: 'fallback-technical',
        timestamp: new Date().toISOString(),
        note: 'API error - using technical analysis fallback',
      });
    }

    const data = await response.json();
    
    // Extract the text response
    const textContent = data.content?.find((c: any) => c.type === 'text');
    if (!textContent?.text) {
      throw new Error('No text response from Claude');
    }

    // Parse the JSON response
    let analysis;
    try {
      // Clean up response - remove any markdown code blocks if present
      let jsonText = textContent.text.trim();
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.slice(7);
      }
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.slice(3);
      }
      if (jsonText.endsWith('```')) {
        jsonText = jsonText.slice(0, -3);
      }
      jsonText = jsonText.trim();
      
      analysis = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('Failed to parse Claude response:', textContent.text);
      // Fallback on parse error
      const fallbackAnalysis = generateFallbackAnalysis(instrument, timeframe, price, klineData);
      return NextResponse.json({
        success: true,
        analysis: fallbackAnalysis,
        model: 'fallback-technical',
        timestamp: new Date().toISOString(),
        note: 'Parse error - using technical analysis fallback',
      });
    }

    // Validate required fields
    if (!analysis.scenarios || analysis.scenarios.length !== 4) {
      const fallbackAnalysis = generateFallbackAnalysis(instrument, timeframe, price, klineData);
      return NextResponse.json({
        success: true,
        analysis: fallbackAnalysis,
        model: 'fallback-technical',
        timestamp: new Date().toISOString(),
      });
    }

    // Ensure probabilities sum to 100
    const totalProb = analysis.scenarios.reduce((sum: number, s: any) => sum + (s.probability || 0), 0);
    if (totalProb !== 100) {
      const adjustment = (100 - totalProb) / 4;
      analysis.scenarios = analysis.scenarios.map((s: any) => ({
        ...s,
        probability: Math.round(s.probability + adjustment),
      }));
    }

    return NextResponse.json({
      success: true,
      analysis,
      model: 'claude-sonnet-4-20250514',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Chart analysis error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to analyze chart',
    }, { status: 500 });
  }
}
