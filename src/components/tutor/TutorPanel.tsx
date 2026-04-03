"use client";

import { useState, useRef, useEffect, memo } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send, Sparkles, MessageCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { TutorContext } from '@/lib/llm';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

// Generate unique message ID
let messageCounter = 0;
function generateMessageId(): string {
  return `msg-${Date.now()}-${++messageCounter}`;
}

const FRIENDLY_TOOL_NAMES: Record<string, string> = {
  get_study_progress: 'your study progress',
  get_question_details: 'question details',
  search_study_content: 'study content',
  get_topic_metadata: 'topic information',
  get_assessment_history: 'your assessment history',
  get_weak_area_questions: 'your weak areas',
  suggest_next_study_topic: 'study recommendations',
};

// Memoized message component to prevent re-renders when new messages arrive
const MessageItem = memo(function MessageItem({ message }: { message: Message }) {
  return (
    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-lg px-4 py-2 ${
          message.role === 'user'
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted'
        }`}
      >
        {message.role === 'assistant' ? (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
          </div>
        ) : (
          <p className="text-sm">{message.content}</p>
        )}
      </div>
    </div>
  );
});

interface TutorPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context?: TutorContext;
  examId: string;
  examName: string;
}

export function TutorPanel({ open, onOpenChange, context, examId, examName }: TutorPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [providerDisplayName, setProviderDisplayName] = useState<string | null>(null);
  const [toolStatus, setToolStatus] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch provider info on mount
  useEffect(() => {
    fetch('/api/tutor/provider')
      .then(res => res.json())
      .then(data => setProviderDisplayName(data.displayName))
      .catch(() => setProviderDisplayName(null));
  }, []);

  // Auto-scroll to bottom when new messages arrive or content streams
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, toolStatus]);

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim()) return;

    const userMessage: Message = { id: generateMessageId(), role: 'user', content: messageText };
    const assistantId = generateMessageId();
    setMessages(prev => [...prev, userMessage, { id: assistantId, role: 'assistant', content: '' }]);
    setInput('');
    setIsLoading(true);
    setToolStatus(null);

    try {
      const response = await fetch('/api/tutor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          message: messageText,
          examId,
          context,
          conversationId,
        }),
      });

      if (!response.ok || !response.body) {
        // Non-streaming error response — read as JSON
        const errorData = await response.json().catch(() => null);
        const errorText = errorData?.error || 'I apologize, but I encountered an error. Please try again.';
        setMessages(prev =>
          prev.map(m => m.id === assistantId ? { ...m, content: errorText } : m)
        );
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const eventBlock of events) {
          const lines = eventBlock.split('\n');
          let eventType = '';
          let eventData = '';

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              eventType = line.slice(7);
            } else if (line.startsWith('data: ')) {
              eventData = line.slice(6);
            }
          }

          if (!eventType || !eventData) continue;

          let data: Record<string, unknown>;
          try {
            data = JSON.parse(eventData);
          } catch {
            continue;
          }

          switch (eventType) {
            case 'stream_start':
              if (data.conversationId) {
                setConversationId(data.conversationId as string);
              }
              break;

            case 'tool_start':
              setToolStatus(
                `Looking up ${FRIENDLY_TOOL_NAMES[data.toolName as string] || data.toolName}...`
              );
              break;

            case 'tool_end':
              setToolStatus(null);
              break;

            case 'text_delta':
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId
                    ? { ...m, content: m.content + (data.delta as string) }
                    : m
                )
              );
              break;

            case 'stream_end':
              setConversationId(data.conversationId as string);
              setSuggestedQuestions((data.suggestedQuestions as string[]) || []);
              break;

            case 'error':
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId
                    ? { ...m, content: data.error as string }
                    : m
                )
              );
              break;
          }
        }
      }
    } catch (error) {
      console.error('Tutor error:', error);
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? { ...m, content: 'I apologize, but I encountered an error. Please try again.' }
            : m
        )
      );
    } finally {
      setIsLoading(false);
      setToolStatus(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleSuggestedQuestion = (question: string) => {
    sendMessage(question);
  };

  const clearConversation = () => {
    setMessages([]);
    setConversationId(undefined);
    setSuggestedQuestions([]);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Study Tutor
          </SheetTitle>
          <SheetDescription>
            Ask questions about AWS services, exam topics, or get help with practice questions
          </SheetDescription>
        </SheetHeader>

        {/* Context indicator */}
        {context && (context.domainName || context.topicName) && (
          <div className="px-6 py-3 bg-muted/50 border-b">
            <div className="flex items-center gap-2 text-sm">
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Context:</span>
              <Badge variant="outline">
                {context.topicName || context.domainName}
              </Badge>
            </div>
          </div>
        )}

        {/* Messages */}
        <ScrollArea className="flex-1 px-6" ref={scrollRef}>
          <div className="py-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium mb-1">Start a conversation</p>
                <p className="text-xs">
                  Ask me anything about {examName} exam topics
                </p>
              </div>
            )}

            {messages.map((message) => (
              <MessageItem key={message.id} message={message} />
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-4 py-2 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {toolStatus && (
                    <span className="text-sm text-muted-foreground">{toolStatus}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Suggested questions */}
        {suggestedQuestions.length > 0 && !isLoading && (
          <div className="px-6 py-3 border-t bg-muted/30">
            <p className="text-xs font-medium text-muted-foreground mb-2">Suggested questions:</p>
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((question, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  className="text-xs h-auto py-1.5"
                  onClick={() => handleSuggestedQuestion(question)}
                >
                  {question}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="px-6 py-4 border-t">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2 text-xs"
              onClick={clearConversation}
            >
              Clear conversation
            </Button>
          )}
          {providerDisplayName && (
            <p className="text-center text-xs text-muted-foreground mt-3">
              Powered by {providerDisplayName}
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
