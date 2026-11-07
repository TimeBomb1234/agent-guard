import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Server configuration error: GROQ_API_KEY is missing in .env.local' },
        { status: 500 }
      );
    }

    const groq = new Groq({ apiKey });

    const body = await req.json();
    const transaction = body.transaction ?? body;

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction payload is required' },
        { status: 400 }
      );
    }

    const systemPrompt = `You are AgentGuard AI, a security analysis agent for the Solana blockchain.
Your task is to analyze incoming transaction payloads and provide a security audit in strict JSON format.

Return ONLY a valid JSON object matching this TypeScript interface:
{
  "riskLevel": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "riskScore": number,
  "summary": "Short 1-2 sentence plain english explanation of what this transaction does",
  "warnings": string[],
  "recommendation": "ALLOW" | "BLOCK" | "PROCEED_WITH_CAUTION"
}

Analyze carefully for phishing attempts, drained approvals, unknown program IDs, or unusual token transfers.`;

    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Analyze this Solana transaction: ${JSON.stringify(transaction, null, 2)}`,
        },
      ],
      model: 'qwen/qwen3.8-27b',
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response content received from Groq AI');
    }

    const aiResult = JSON.parse(content);

    return NextResponse.json({ success: true, data: aiResult });
  } catch (error: unknown) {
    console.error('DETAILED AI Analysis Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown server error occurred';
    return NextResponse.json(
          { error: 'Failed to analyze transaction', details: errorMessage },
          { status: 500 }
        );
  }
}
