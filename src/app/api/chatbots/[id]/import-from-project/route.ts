import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/chatbots/[id]/import-from-project — import steps from a designer project
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { projectId } = body;

  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  // Load the chatbot
  const chatbot = await prisma.chatbot.findUnique({ where: { id } });
  if (!chatbot) {
    return NextResponse.json({ error: 'Chatbot not found' }, { status: 404 });
  }

  // Load the designer project
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const projectData = JSON.parse(project.data);
  const steps = projectData.steps || [];

  // Get current max number and sortOrder
  const lastStep = await prisma.chatbotStep.findFirst({
    where: { chatbotId: id },
    orderBy: { number: 'desc' },
  });
  const lastSort = await prisma.chatbotStep.findFirst({
    where: { chatbotId: id },
    orderBy: { sortOrder: 'desc' },
  });

  let nextNumber = (lastStep?.number ?? 0) + 1;
  let nextSort = (lastSort?.sortOrder ?? 0) + 1;

  // Convert designer steps to chatbot steps
  const createdSteps = [];
  for (const step of steps) {
    // Build output blocks from text blocks
    const outputBlocks = (step.blocks || [])
      .filter((b: { type: string }) => b.type === 'text')
      .map((b: { id: string; content: string }) => ({
        id: b.id,
        type: 'text',
        content: b.content,
      }));

    // Build input from buttons/user-input block
    const buttonBlock = (step.blocks || []).find((b: { type: string }) => b.type === 'buttons');
    const userInputBlock = (step.blocks || []).find((b: { type: string }) => b.type === 'user-input');

    let inputData = {};
    let stepType = 'button';

    if (buttonBlock) {
      stepType = 'button';
      inputData = {
        buttons: (buttonBlock.buttons || []).map((btn: { id: string; label: string }) => ({
          id: btn.id,
          text: btn.label,
          displayMode: 'list',
        })),
      };
    } else if (userInputBlock) {
      stepType = 'answer';
      inputData = {
        placeholder: userInputBlock.placeholder || 'Type here...',
        sendOnEnter: true,
        optional: false,
        numbersOnly: false,
      };
    }

    const created = await prisma.chatbotStep.create({
      data: {
        chatbotId: id,
        projectId,
        sourceBlockId: step.id,
        number: nextNumber++,
        name: step.name,
        type: stepType,
        color: step.color || '#607D8B',
        output: JSON.stringify(outputBlocks),
        input: JSON.stringify(inputData),
        jump: JSON.stringify([]),
        settings: JSON.stringify({}),
        sortOrder: nextSort++,
      },
    });

    createdSteps.push({
      id: created.id,
      name: created.name,
      type: created.type,
      sourceBlockId: created.sourceBlockId,
    });
  }

  // Link project to chatbot
  await prisma.chatbot.update({
    where: { id },
    data: { projectId },
  });

  return NextResponse.json({
    imported: createdSteps.length,
    steps: createdSteps,
  }, { status: 201 });
}
