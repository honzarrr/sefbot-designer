'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { fetchChatbot, generatePreviewLink } from '@/lib/chatbot-api';
import {
  ChatbotData,
  ChatbotStepData,
  OutputBlock,
  StepType,
  ButtonInput,
  CarouselInput,
  EmailInput,
  PhoneInput,
  AnswerInput,
  StarsInput,
} from '@/types/chatbot';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  RotateCcw,
  Share,
  Copy,
  CheckCircle,
  Bot,
  User,
  Star,
  Send,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  type: 'bot' | 'user';
  content: string;
  blocks?: OutputBlock[];
  inputType?: string;
}

export default function PreviewPage() {
  const params = useParams() ?? {};
  const chatbotId = (params?.id as string) || '';

  const [chatbot, setChatbot] = useState<ChatbotData | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [waitingForInput, setWaitingForInput] = useState(false);
  const [previewLink, setPreviewLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [ended, setEnded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchChatbot(chatbotId)
      .then((data) => {
        setChatbot(data);
        if (data.steps.length > 0) {
          processStep(data.steps[0], data.steps);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [chatbotId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const processStep = (step: ChatbotStepData, allSteps: ChatbotStepData[]) => {
    // Add output messages
    if (step.output && step.output.length > 0) {
      const botMsg: ChatMessage = {
        id: `bot-${step.id}-${Date.now()}`,
        type: 'bot',
        content: step.output.map((b) => b.content).join('\n'),
        blocks: step.output,
        inputType: step.type,
      };
      setMessages((prev) => [...prev, botMsg]);
    }

    // Wait for input
    setWaitingForInput(true);
    setCurrentStepIndex(allSteps.findIndex((s) => s.id === step.id));
  };

  const handleUserResponse = (response: string, selectedStepId?: string) => {
    if (!chatbot) return;
    const steps = chatbot.steps;
    const currentStep = steps[currentStepIndex];
    if (!currentStep) return;

    // Add user message
    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, type: 'user', content: response },
    ]);
    setWaitingForInput(false);
    setUserInput('');

    // Find next step via jump rules
    let nextStepId: string | null = null;

    if (selectedStepId) {
      nextStepId = selectedStepId;
    } else {
      // Check jump rules
      for (const rule of currentStep.jump) {
        if (rule.target === 'exit') {
          setEnded(true);
          setMessages((prev) => [
            ...prev,
            { id: `end-${Date.now()}`, type: 'bot', content: 'Conversation ended.' },
          ]);
          return;
        }

        if (rule.target === 'url') {
          setMessages((prev) => [
            ...prev,
            { id: `url-${Date.now()}`, type: 'bot', content: `Redirecting to URL...` },
          ]);
          setEnded(true);
          return;
        }

        // Check trigger match
        if (!rule.trigger || rule.trigger === response || rule.trigger === '*') {
          nextStepId = rule.target;
          break;
        }
      }

      // Default: go to next step in order if no jump rule matched
      if (!nextStepId) {
        const nextIndex = currentStepIndex + 1;
        if (nextIndex < steps.length) {
          nextStepId = steps[nextIndex].id;
        }
      }
    }

    if (nextStepId) {
      const nextStep = steps.find((s) => s.id === nextStepId);
      if (nextStep) {
        setTimeout(() => processStep(nextStep, steps), 500);
      } else {
        setEnded(true);
      }
    } else {
      setEnded(true);
      setMessages((prev) => [
        ...prev,
        { id: `end-${Date.now()}`, type: 'bot', content: 'Conversation ended.' },
      ]);
    }
  };

  const handleReset = () => {
    setMessages([]);
    setCurrentStepIndex(0);
    setWaitingForInput(false);
    setEnded(false);
    setUserInput('');

    if (chatbot && chatbot.steps.length > 0) {
      setTimeout(() => processStep(chatbot.steps[0], chatbot.steps), 100);
    }
  };

  const handleGenerateLink = async () => {
    try {
      const { previewUrl } = await generatePreviewLink(chatbotId);
      const full = `${window.location.origin}${previewUrl}`;
      setPreviewLink(full);
    } catch (e) {
      console.error('Failed to generate preview link:', e);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(previewLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentStep = chatbot?.steps[currentStepIndex] || null;

  if (loading) {
    return <div className="flex-1 flex items-center justify-center text-muted-foreground">Loading preview...</div>;
  }

  if (!chatbot || chatbot.steps.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No steps to preview. Add steps in the Edit tab.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center p-6">
      {/* Controls */}
      <div className="w-full max-w-md flex items-center gap-2 mb-4">
        <Button size="sm" variant="outline" onClick={handleReset} className="gap-1.5">
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </Button>
        <div className="flex-1" />
        <Button size="sm" variant="outline" onClick={handleGenerateLink} className="gap-1.5">
          <Share className="h-3.5 w-3.5" />
          Share
        </Button>
      </div>

      {/* Shareable link */}
      {previewLink && (
        <div className="w-full max-w-md mb-4 flex items-center gap-2">
          <Input value={previewLink} readOnly className="text-xs font-mono" />
          <Button size="sm" variant="outline" onClick={handleCopyLink} className="shrink-0 gap-1">
            {copied ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
      )}

      {/* Chat widget simulation */}
      <div className="w-full max-w-md border rounded-xl shadow-lg overflow-hidden bg-background flex flex-col" style={{ height: 'calc(100vh - 250px)', minHeight: 400 }}>
        {/* Widget header */}
        <div className="bg-primary px-4 py-3 text-primary-foreground flex items-center gap-2">
          <Bot className="h-5 w-5" />
          <span className="font-semibold text-sm">{chatbot.name}</span>
          {chatbot.active && (
            <Badge className="ml-auto bg-green-500/20 text-green-100 text-xs">Active</Badge>
          )}
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.type === 'bot' && (
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    msg.type === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  {msg.blocks ? (
                    <div className="space-y-1.5">
                      {msg.blocks.map((block) => (
                        <div key={block.id}>
                          {block.type === 'text' && <p className="whitespace-pre-wrap">{block.content}</p>}
                          {block.type === 'html' && (
                            <div className="text-xs bg-background/50 rounded p-1.5 font-mono" dangerouslySetInnerHTML={{ __html: block.content }} />
                          )}
                          {block.type === 'info' && (
                            <div className="text-xs bg-blue-100 dark:bg-blue-900/30 rounded p-2 text-blue-800 dark:text-blue-200">
                              {block.content}
                            </div>
                          )}
                          {block.type === 'warning' && (
                            <div className="text-xs bg-amber-100 dark:bg-amber-900/30 rounded p-2 text-amber-800 dark:text-amber-200">
                              {block.content}
                            </div>
                          )}
                          {block.type === 'image' && block.content && (
                            <div className="text-xs text-muted-foreground italic">[Image: {block.content}]</div>
                          )}
                          {block.type === 'video' && block.content && (
                            <div className="text-xs text-muted-foreground italic">[Video: {block.content}]</div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
                {msg.type === 'user' && (
                  <div className="h-7 w-7 rounded-full bg-foreground/10 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input area */}
        {waitingForInput && !ended && currentStep && (
          <div className="border-t p-3 space-y-2">
            {/* Button input */}
            {currentStep.type === StepType.Button && (currentStep.input as ButtonInput).buttons && (
              <div className="flex flex-wrap gap-1.5">
                {(currentStep.input as ButtonInput).buttons.map((btn) => (
                  <Button
                    key={btn.id}
                    size="sm"
                    variant={btn.highlighted ? 'default' : 'outline'}
                    className="text-xs"
                    onClick={() => handleUserResponse(btn.text)}
                  >
                    {btn.icon && <span className="mr-1">{btn.icon}</span>}
                    {btn.text}
                  </Button>
                ))}
              </div>
            )}

            {/* Carousel input */}
            {currentStep.type === StepType.Carousel && (currentStep.input as CarouselInput).items && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {(currentStep.input as CarouselInput).items.map((card) => (
                  <div key={card.id} className="border rounded-lg p-2 min-w-[140px] text-xs space-y-1">
                    {card.image && <div className="text-muted-foreground italic">[Image]</div>}
                    <div className="font-medium">{card.title}</div>
                    {card.description && <div className="text-muted-foreground">{card.description}</div>}
                    <Button
                      size="sm"
                      className="w-full text-xs h-6"
                      onClick={() => handleUserResponse(card.buttonText)}
                    >
                      {card.buttonText}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Stars input */}
            {currentStep.type === StepType.Stars && (
              <div className="space-y-2">
                <div className="flex gap-1 justify-center">
                  {Array.from({ length: (currentStep.input as StarsInput).count || 5 }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => handleUserResponse(`${i + 1}`)}
                      className="hover:scale-110 transition-transform"
                    >
                      <Star className="h-6 w-6 text-yellow-400 fill-yellow-400" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Text/email/phone/answer input */}
            {(currentStep.type === StepType.Answer ||
              currentStep.type === StepType.Email ||
              currentStep.type === StepType.Phone ||
              currentStep.type === StepType.Location ||
              currentStep.type === StepType.File ||
              currentStep.type === StepType.Calendar) && (
              <div className="flex gap-2">
                <Input
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && userInput.trim()) {
                      handleUserResponse(userInput.trim());
                    }
                  }}
                  placeholder={
                    currentStep.type === StepType.Email
                      ? (currentStep.input as EmailInput).placeholder || 'Enter email...'
                      : currentStep.type === StepType.Phone
                      ? (currentStep.input as PhoneInput).placeholder || 'Enter phone...'
                      : currentStep.type === StepType.Answer
                      ? (currentStep.input as AnswerInput).placeholder || 'Type here...'
                      : currentStep.type === StepType.Calendar
                      ? 'Select date...'
                      : currentStep.type === StepType.File
                      ? 'Upload file...'
                      : 'Type here...'
                  }
                  className="text-sm flex-1"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    if (userInput.trim()) handleUserResponse(userInput.trim());
                  }}
                  disabled={!userInput.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Logic input - auto-proceed */}
            {currentStep.type === StepType.Logic && (
              <div className="text-center">
                <Button size="sm" variant="outline" onClick={() => handleUserResponse('auto')}>
                  Continue
                </Button>
              </div>
            )}
          </div>
        )}

        {ended && (
          <div className="border-t p-3 text-center">
            <p className="text-xs text-muted-foreground mb-2">Conversation ended</p>
            <Button size="sm" variant="outline" onClick={handleReset} className="gap-1.5">
              <RotateCcw className="h-3 w-3" />
              Restart
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
