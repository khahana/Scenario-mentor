import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, systemPrompt, apiKey } = body;

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'API key required. Add your Anthropic API key in Settings.'
      }, { status: 400 });
    }

    if (!messages || messages.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No messages provided'
      }, { status: 400 });
    }

    // Call Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: systemPrompt || 'You are a helpful trading mentor.',
        messages: messages.map((m: any) => ({
          role: m.role,
          content: m.content
        })),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Claude API error:', response.status, errorData);
      
      if (response.status === 401) {
        return NextResponse.json({
          success: false,
          error: 'Invalid API key. Check your key in Settings.'
        }, { status: 401 });
      }
      
      return NextResponse.json({
        success: false,
        error: errorData.error?.message || 'API request failed'
      }, { status: response.status });
    }

    const data = await response.json();
    
    // Extract text response
    const textContent = data.content?.find((c: any) => c.type === 'text');
    
    if (!textContent?.text) {
      return NextResponse.json({
        success: false,
        error: 'No response from AI'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      response: textContent.text,
      model: 'claude-sonnet-4-20250514'
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to connect to AI'
    }, { status: 500 });
  }
}
