import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      apiKey,
      instrument,
      timeframe,
      currentPrice,
      change24h,
      priceContext,
      thesis,
      scenarios
    } = body;

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'API key required'
      }, { status: 400 });
    }

    const prompt = `You are a professional trading analyst. Reassess this Battle Card setup BRIEFLY (max 100 words):

ASSET: ${instrument} (${timeframe})
CURRENT PRICE: $${currentPrice}
24H CHANGE: ${change24h || 'N/A'}%
${priceContext || ''}

ORIGINAL THESIS: ${thesis || 'Not specified'}

SCENARIOS:
${scenarios || 'None defined'}

Provide brief reassessment:
1. Are entry levels still valid?
2. Any stops breached or at risk?
3. Recommendation: MAINTAIN / ADJUST / INVALIDATE

Start with recommendation in CAPS, then 2-3 sentences explanation.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Anthropic API error:', response.status, errorData);
      return NextResponse.json({
        success: false,
        error: errorData.error?.message || `API error: ${response.status}`
      }, { status: response.status });
    }

    const data = await response.json();
    const analysis = data.content?.[0]?.text || 'No response';

    return NextResponse.json({
      success: true,
      analysis
    });

  } catch (error) {
    console.error('Reassessment API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
