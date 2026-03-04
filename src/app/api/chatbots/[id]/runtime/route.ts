import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// GET /api/chatbots/[id]/runtime — public endpoint, no auth required
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const chatbot = await prisma.chatbot.findUnique({
      where: { id },
      include: {
        steps: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!chatbot || !chatbot.active || chatbot.deletedAt) {
      return NextResponse.json(
        { error: 'Chatbot not found or inactive' },
        { status: 404, headers: corsHeaders }
      );
    }

    const settings = chatbot.settings ? JSON.parse(chatbot.settings) : {};

    // Build public steps — strip internal/DB fields
    const steps = chatbot.steps.map((step) => ({
      id: step.id,
      number: step.number,
      name: step.name,
      type: step.type,
      color: step.color,
      output: safeJsonParse(step.output, []),
      input: safeJsonParse(step.input, {}),
      jump: safeJsonParse(step.jump, []),
      settings: safeJsonParse(step.settings, {}),
      sortOrder: step.sortOrder,
    }));

    return NextResponse.json(
      {
        chatbotId: chatbot.id,
        name: chatbot.name,
        steps,
        settings: {
          name: settings.name || chatbot.name,
          welcomeMessage: settings.welcomeMessage || null,
          languages: settings.languages || ['en'],
          workHours: settings.workHours || null,
          design: settings.design || {},
          smartStart: settings.smartStart || {},
          smartStartConditions: settings.smartStartConditions || [],
          defaultResponses: settings.defaultResponses || [],
        },
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('Runtime GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

function safeJsonParse(value: string | null | undefined, fallback: unknown) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
