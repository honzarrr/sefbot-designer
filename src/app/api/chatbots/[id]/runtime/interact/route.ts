import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// POST /api/chatbots/[id]/runtime/interact — process user interaction
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: chatbotId } = params;
    const body = await req.json();
    const { sessionId, stepId, userInput, inputType, deviceType, pageUrl } = body;

    if (!sessionId || !stepId) {
      return NextResponse.json(
        { error: 'sessionId and stepId are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const chatbot = await prisma.chatbot.findUnique({
      where: { id: chatbotId },
      include: {
        steps: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!chatbot || !chatbot.active || chatbot.deletedAt) {
      return NextResponse.json(
        { error: 'Chatbot not found or inactive' },
        { status: 404, headers: corsHeaders }
      );
    }

    const settings = chatbot.settings ? JSON.parse(chatbot.settings) : {};
    const steps = chatbot.steps.map((s) => ({
      ...s,
      output: safeJsonParse(s.output, []),
      input: safeJsonParse(s.input, {}),
      jump: safeJsonParse(s.jump, []),
      settings: safeJsonParse(s.settings, {}),
    }));

    const currentStep = steps.find((s) => s.id === stepId);
    if (!currentStep) {
      return NextResponse.json(
        { error: 'Step not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Ensure conversation exists for logging
    await ensureConversation(chatbotId, sessionId, deviceType, pageUrl, settings.workHours);

    // Log the interaction
    await logInteraction(sessionId, stepId, currentStep.name, inputType || 'user_input', userInput);

    // Determine next step
    const jumpRules = currentStep.jump as JumpRule[];
    let nextStepId: string | null = null;
    let isEnd = false;
    let redirectUrl: string | null = null;

    for (const rule of jumpRules) {
      if (rule.target === 'exit') {
        isEnd = true;
        break;
      }

      if (rule.target === 'url') {
        isEnd = true;
        redirectUrl = rule.trigger || null;
        break;
      }

      // Check trigger match
      if (!rule.trigger || rule.trigger === userInput || rule.trigger === '*') {
        // Evaluate conditions if present
        if (rule.condition && rule.condition.rules && rule.condition.rules.length > 0) {
          // For now, skip condition evaluation (would need variable context)
          // Default to matching if no complex condition
          nextStepId = rule.target;
          break;
        }
        nextStepId = rule.target;
        break;
      }
    }

    // Default: go to next step in sort order
    if (!nextStepId && !isEnd) {
      const currentIndex = steps.findIndex((s) => s.id === stepId);
      if (currentIndex >= 0 && currentIndex + 1 < steps.length) {
        nextStepId = steps[currentIndex + 1].id;
      } else {
        isEnd = true;
      }
    }

    // Build response
    let nextStep = null;
    if (nextStepId) {
      const found = steps.find((s) => s.id === nextStepId);
      if (found) {
        nextStep = {
          id: found.id,
          number: found.number,
          name: found.name,
          type: found.type,
          color: found.color,
          output: found.output,
          input: found.input,
          settings: found.settings,
        };
      } else {
        isEnd = true;
      }
    }

    if (isEnd) {
      // Mark conversation as ended
      await endConversation(sessionId);
    }

    return NextResponse.json(
      {
        nextStep,
        isEnd,
        redirectUrl,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('Runtime interact error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

interface JumpRule {
  id: string;
  condition?: {
    logic: 'AND' | 'OR';
    rules: { variable: string; operator: string; value: string }[];
  };
  trigger?: string;
  target: string;
}

function safeJsonParse(value: string | null | undefined, fallback: unknown) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

async function ensureConversation(
  chatbotId: string,
  sessionId: string,
  deviceType?: string,
  pageUrl?: string,
  workHours?: { start: string; end: string; days: number[] }
) {
  try {
    const existing = await prisma.conversation.findUnique({
      where: { sessionId },
    });
    if (existing) return existing;

    const now = new Date();
    const day = now.getDay();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const isWeekend = day === 0 || day === 6;

    let isWorkHoursNow = false;
    if (workHours) {
      const inDays = workHours.days.includes(day);
      const inTime = timeStr >= workHours.start && timeStr <= workHours.end;
      isWorkHoursNow = inDays && inTime;
    }

    return await prisma.conversation.create({
      data: {
        chatbotId,
        sessionId,
        deviceType: deviceType || null,
        pageUrl: pageUrl || null,
        isWeekend,
        isWorkHours: isWorkHoursNow,
      },
    });
  } catch {
    // Table might not exist or unique constraint — skip gracefully
    return null;
  }
}

async function logInteraction(
  sessionId: string,
  stepId: string,
  stepName: string,
  type: string,
  content?: string
) {
  try {
    const conversation = await prisma.conversation.findUnique({
      where: { sessionId },
    });
    if (!conversation) return;

    await prisma.conversationInteraction.create({
      data: {
        conversationId: conversation.id,
        stepId,
        stepName,
        type,
        content: content ? JSON.stringify({ value: content }) : null,
      },
    });
  } catch {
    // Skip gracefully if tables don't exist
  }
}

async function endConversation(sessionId: string) {
  try {
    await prisma.conversation.update({
      where: { sessionId },
      data: { endedAt: new Date() },
    });
  } catch {
    // Skip gracefully
  }
}
