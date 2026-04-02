'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { ArrowLeft, AlertTriangle, CheckCircle } from 'lucide-react';
import Link from 'next/link';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  inputTokens: number | null;
  outputTokens: number | null;
}

interface ConversationDetail {
  id: string;
  customerIdentifier: string;
  channel: 'instagram' | 'whatsapp';
  status: string;
  messageCount: number;
  startedAt: string;
  lastMessageAt: string;
  languageDetected: string | null;
  escalatedAt: string | null;
  resolvedAt: string | null;
}

interface ConversationResponse {
  conversation: ConversationDetail;
  messages: Message[];
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const languageFlags: Record<string, string> = {
  he: '\uD83C\uDDEE\uD83C\uDDF1',
  ru: '\uD83C\uDDF7\uD83C\uDDFA',
  en: '\uD83C\uDDEC\uD83C\uDDE7',
};

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ConversationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [resolving, setResolving] = useState(false);

  const { data, mutate } = useSWR<ConversationResponse>(
    `/api/conversations/${params.id}`,
    fetcher,
  );

  const conv = data?.conversation ?? null;
  const messages = data?.messages ?? [];

  // Auto-scroll to bottom on load
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleResolve = async () => {
    if (!conv) return;
    setResolving(true);

    // Optimistic update
    mutate(
      {
        ...data!,
        conversation: { ...conv, status: 'resolved', resolvedAt: new Date().toISOString() },
      },
      false,
    );

    try {
      await fetch(`/api/conversations/${params.id}/resolve`, {
        method: 'PATCH',
      });
      mutate();
    } catch {
      mutate(); // Revert
    } finally {
      setResolving(false);
    }
  };

  if (!data || !conv) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-6" />
          <div className="space-y-4">
            <div className="h-16 bg-gray-200 rounded-2xl w-3/4" />
            <div className="h-16 bg-gray-200 rounded-2xl w-2/3 ml-auto" />
            <div className="h-16 bg-gray-200 rounded-2xl w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/conversations"
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-lg">
              {conv.channel === 'whatsapp' ? '\uD83D\uDCF1' : '\uD83D\uDCF8'}
            </span>
            <span className="font-mono text-gray-600">
              ***{conv.customerIdentifier.slice(-4)}
            </span>
            {conv.languageDetected && (
              <span className="text-sm">
                {languageFlags[conv.languageDetected] ?? conv.languageDetected}
              </span>
            )}
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                conv.status === 'active'
                  ? 'bg-blue-50 text-blue-700'
                  : conv.status === 'escalated'
                  ? 'bg-red-50 text-red-700'
                  : 'bg-green-50 text-green-700'
              }`}
            >
              {conv.status.charAt(0).toUpperCase() + conv.status.slice(1)}
            </span>
          </div>
        </div>
      </div>

      {/* Escalation banner */}
      {conv.status === 'escalated' && !conv.resolvedAt && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0" />
            <span className="text-orange-700 font-medium text-sm sm:text-base">
              This conversation was escalated
              {conv.escalatedAt && ` on ${formatDate(conv.escalatedAt)}`}.
              Follow up with the customer.
            </span>
          </div>
          <button
            onClick={handleResolve}
            disabled={resolving}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-lg text-sm font-medium hover:bg-orange-200 disabled:opacity-50 w-full sm:w-auto"
          >
            <CheckCircle className="w-4 h-4" />
            {resolving ? 'Resolving...' : 'Mark as Resolved'}
          </button>
        </div>
      )}

      {/* Chat messages */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex flex-col gap-4 max-h-[600px] overflow-y-auto">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.role === 'user' ? 'items-start' : 'items-end'
              }`}
            >
              <span className="text-xs text-gray-400 mb-1 px-1">
                {msg.role === 'user' ? 'Customer' : 'Bot'}
              </span>
              <div
                className={`max-w-[85%] sm:max-w-[70%] px-4 py-2 ${
                  msg.role === 'user'
                    ? 'bg-gray-100 rounded-2xl rounded-tl-sm text-gray-900'
                    : 'bg-[#5B4FCF] rounded-2xl rounded-tr-sm text-white'
                }`}
              >
                <p className="text-sm leading-relaxed">{msg.content}</p>
              </div>
              <div className="flex items-center gap-2 mt-1 px-1">
                <span className="text-xs text-gray-400">
                  {formatTime(msg.createdAt)}
                </span>
                {msg.role === 'assistant' &&
                  msg.inputTokens != null &&
                  msg.outputTokens != null && (
                    <span className="text-xs text-gray-300">
                      {msg.inputTokens}&rarr;{msg.outputTokens} tokens
                    </span>
                  )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Action bar */}
      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <Link
          href="/dashboard/conversations"
          className="text-gray-500 hover:text-gray-700 text-sm font-medium flex items-center justify-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Conversations
        </Link>
        {conv.status === 'escalated' && !conv.resolvedAt && (
          <button
            onClick={handleResolve}
            disabled={resolving}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-50"
          >
            <CheckCircle className="w-4 h-4" />
            {resolving ? 'Resolving...' : 'Mark Resolved'}
          </button>
        )}
      </div>
    </div>
  );
}
