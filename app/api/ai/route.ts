import { NextRequest, NextResponse } from 'next/server';

// AI Mentor System Prompts
const SYSTEM_PROMPTS = {
  builder: `You are an expert trading mentor helping traders build comprehensive Battle Cards using the Scenario Trading methodology. 

Your role is to guide traders through:
1. Setup Capture - Identifying and documenting trading setups
2. SPIN Analysis - Structured market interrogation (Situation, Problem, Implication, Need-Payoff)
3. Thesis Development - Articulating clear trading theses
4. Scenario Planning - Defining 4 scenarios (Primary, Secondary, Chaos, Invalidation)

Be conversational but structured. Ask probing questions to ensure completeness. Provide specific, actionable guidance.

Key principles:
- Never predict markets, help prepare for multiple outcomes
- Focus on process over prediction
- Emphasize risk management and position sizing
- Challenge vague thinking with specific questions`,

  challenger: `You are a critical thinking partner designed to stress-test trading theses. Your role is to play devil's advocate and challenge assumptions.

Your approach:
1. Identify the weakest points in the thesis
2. Present counter-arguments forcefully but constructively
3. Ask "what if you're wrong?" questions
4. Point out confirmation bias
5. Suggest alternative interpretations of the same data

Be challenging but not discouraging. The goal is to strengthen the trader's thinking, not to demoralize them.

Key challenges to explore:
- Evidence quality: Is the supporting data strong?
- Alternative explanations: What else could explain this pattern?
- Trapped participants: Are they really trapped?
- Timing: Why now?
- Invalidation: What would prove you completely wrong?

End each response with a specific question that forces deeper thinking.`,

  coach: `You are a real-time trading coach helping traders execute their pre-planned scenarios with discipline.

Your role:
1. Help traders stay objective during live markets
2. Prompt probability updates based on new information
3. Detect emotional language and redirect to process
4. Remind traders of their pre-defined rules
5. Support difficult decisions (cutting losses, taking profits)

Key principles:
- The plan was made when thinking was clear - trust it
- Emotions are information, not instructions
- Position size is the primary risk control
- It's okay to miss a trade, not okay to abandon process

Watch for signs of:
- FOMO language ("I need to get in now")
- Revenge trading setup ("I need to make it back")
- Overconfidence ("This is guaranteed")
- Fear paralysis ("I can't pull the trigger")

Respond with calm, process-focused guidance.`,

  debrief: `You are a post-trade analyst helping traders extract lessons from their trades.

Your approach:
1. Separate process from outcome (good process can have bad outcomes)
2. Identify what was within control vs. not
3. Look for recurring patterns (both good and bad)
4. Extract specific, actionable lessons
5. Build the trader's pattern library

Questions to explore:
- Did you follow your Battle Card?
- Which scenario played out?
- Were your probabilities accurate?
- What would you do differently?
- What did you do well?

Focus on growth mindset - every trade is a learning opportunity, regardless of P&L.

Structure lessons as:
1. What happened vs. what was expected
2. Why the divergence occurred
3. Specific adjustment for next time`
};

export async function POST(request: NextRequest) {
  try {
    const { mode, messages, battleCard } = await request.json();

    // Get the appropriate system prompt
    const systemPrompt = SYSTEM_PROMPTS[mode as keyof typeof SYSTEM_PROMPTS] || SYSTEM_PROMPTS.builder;

    // Build context from battle card if available
    let context = '';
    if (battleCard) {
      context = `
Current Battle Card Context:
- Instrument: ${battleCard.instrument || 'Not set'}
- Timeframe: ${battleCard.timeframe || 'Not set'}
- Setup Type: ${battleCard.setupType || 'Not set'}
- Thesis: ${battleCard.thesis || 'Not set'}
- Challenger Score: ${battleCard.challengerScore || 5}/10
- Status: ${battleCard.status || 'draft'}
${battleCard.narrative ? `- Market Narrative: ${battleCard.narrative}` : ''}
${battleCard.contradiction ? `- Contrarian View: ${battleCard.contradiction}` : ''}

Scenarios:
${battleCard.scenarios?.map((s: any) => `- ${s.type} (${s.name}): ${s.probability}% ${s.isActive ? '[ACTIVE]' : ''}`).join('\n') || 'No scenarios defined'}
`;
    }

    // For production, you would call the Claude API here
    // const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    // const response = await anthropic.messages.create({
    //   model: 'claude-sonnet-4-20250514',
    //   max_tokens: 1024,
    //   system: systemPrompt + (context ? `\n\n${context}` : ''),
    //   messages: messages.map((m: any) => ({
    //     role: m.role,
    //     content: m.content
    //   }))
    // });

    // Simulated response for demo
    const simulatedResponse = generateSimulatedResponse(mode, messages[messages.length - 1]?.content || '', battleCard);

    return NextResponse.json({
      success: true,
      response: {
        content: simulatedResponse.content,
        insights: simulatedResponse.insights,
        suggestions: simulatedResponse.suggestions,
        challengePoints: simulatedResponse.challengePoints,
      }
    });
  } catch (error) {
    console.error('AI API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process AI request' },
      { status: 500 }
    );
  }
}

// Simulated response generator (replace with actual Claude API in production)
function generateSimulatedResponse(mode: string, userMessage: string, battleCard: any) {
  const responses: Record<string, any> = {
    builder: {
      content: `Let's build out your Battle Card systematically.

Based on what you've shared, here are the key questions to consider:

**Setup Analysis:**
1. What's the higher timeframe context? We need to establish if this is with-trend or counter-trend.
2. Where are the key levels that will define your scenarios?
3. What's the specific trigger you're watching for?

**For your SPIN analysis:**
- **Situation**: What's the current market structure telling us?
- **Problem**: Where is price stuck and why?
- **Implication**: If your thesis is correct, who gets squeezed?
- **Need-Payoff**: What's the R:R and is it worth the risk?

What aspect would you like to explore first?`,
      insights: [
        'Higher timeframe context determines trade type',
        'Key levels form the foundation of scenario triggers',
        'Clear triggers prevent emotional entries'
      ],
      suggestions: [
        'Define HTF trend first',
        'Mark 3-5 key levels',
        'Write down your trigger before it happens'
      ]
    },
    
    challenger: {
      content: `I'm going to push back hard on this thesis. Let's stress-test it:

**Challenge #1: Evidence Quality**
You're seeing what you want to see. The "support" you're identifying has been tested multiple times - each test actually weakens it, doesn't strengthen it. Where's the absorption evidence?

**Challenge #2: Consensus Assumption**
You assume everyone else is wrong. But what if the "trapped traders" aren't actually trapped? What if they're positioned correctly and you're about to become the trapped participant?

**Challenge #3: Timing**
Why now? What makes this the moment to act rather than tomorrow or next week? Urgency without clear catalyst is often FOMO in disguise.

**Challenge #4: Invalidation**
You haven't clearly defined what would prove you wrong. Without this, you're not trading a thesis - you're hoping.

**Critical Question:**
If you woke up tomorrow and this trade went completely against you, what would you wish you had considered today?`,
      challengePoints: [
        'Multiple tests weaken support, they don\'t strengthen it',
        'Trapped traders might not be as trapped as assumed',
        'Urgency without catalyst may indicate FOMO',
        'Undefined invalidation = unmanaged risk'
      ]
    },
    
    coach: {
      content: `Let's check in on where you are mentally and with your position.

**Position Status:**
${battleCard ? `You're tracking ${battleCard.instrument} - your thesis was: "${battleCard.thesis?.slice(0, 100)}..."` : 'I don\'t see an active Battle Card loaded.'}

**Key Questions:**
1. Has any new information emerged since you created this Battle Card?
2. Are your scenario probabilities still accurate, or do they need updating?
3. On a scale of 1-10, how clear is your thinking right now?

**Process Reminders:**
- The plan was made when you were thinking clearly
- Stick to pre-defined scenarios unless NEW information (not new emotions) warrants a change
- If you're feeling strong emotions, that's usually a signal to do less, not more

What's your current state? Any urge to deviate from the plan?`,
      insights: [
        'Plans made in calm are better than decisions made in heat',
        'Emotions are information, not instructions',
        'New emotions ≠ new information'
      ]
    },
    
    debrief: {
      content: `Let's analyze this trade objectively. No judgment - just learning.

**Process Analysis Framework:**

1. **Pre-Trade**
   - Did you complete a full Battle Card?
   - Which scenario were you positioned for?
   - Was your position size according to plan?

2. **Execution**
   - Entry: Per plan, or did you chase/anticipate?
   - During: Did you manage according to scenarios?
   - Exit: Per plan, or emotional?

3. **Outcome Analysis**
   - Which scenario actually played out?
   - Was it one you had prepared for?
   - What was your probability estimate vs. reality?

4. **Lesson Extraction**
   - What did you do well? (Repeat this)
   - What would you change? (Specific action)
   - What pattern does this reveal?

Share the details of this trade and I'll help you extract the key lessons.`,
      insights: [
        'Process quality matters more than outcome',
        'Every trade teaches something valuable',
        'Patterns repeat - find yours'
      ]
    }
  };

  return responses[mode] || responses.builder;
}
