import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { transaction } = await req.json();

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction payload is required' },
        { status: 400 }
      );
    }

    const systemPrompt = `You are AgentGuard AI, a security analysis agent for the Solana blockchain.
Your task is to analyze incoming transaction payloads and provide a security audit in strict JSON format.

Return ONLY a valid JSON object matching this format:
{
  "riskLevel": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "riskScore": number, // 0 to 100
  "summary": "Short 1-2 sentence plain english explanation of what this transaction does",
  "warnings": string[], // List of potential risks or empty array
  "recommendation": "ALLOW" | "BLOCK" | "PROCEED_WITH_CAUTION"
}`;

    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Analyze this Solana transaction: ${JSON.stringify(transaction, null, 2)}`,
        },
      ],
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
    });

    const aiResult = JSON.parse(completion.choices[0]?.message?.content || '{}');

    return NextResponse.json({ success: true, data: aiResult });
  } catch (error: unknown) {
      console.error('AI Analysis Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return NextResponse.json(
        { error: 'Failed to analyze transaction', details: errorMessage },
        { status: 500 }
      );
    }
}
