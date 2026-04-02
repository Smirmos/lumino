'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { ArrowLeft, CheckCircle2, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface EscalationRow {
  id: string;
  customerIdentifier: string;
  channel: 'whatsapp' | 'instagram';
  escalatedAt: string;
  lastMessagePreview: string;
  messageCount: number;
  languageDetected: string | null;
}

interface EscalationsResponse {
  escalations: EscalationRow[];
  count: number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const languageNames: Record<string, string> = {
  he: 'Hebrew',
  ru: 'Russian',
  en: 'English',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  return `${Math.floor(hours / 24)} day${Math.floor(hours / 24) > 1 ? 's' : ''} ago`;
}

export default function EscalationsPage() {
  const { data, mutate } = useSWR<EscalationsResponse>(
    '/api/escalations',
    fetcher,
    { refreshInterval: 60000 },
  );

  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' }[]>([]);

  const addToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };

  const resolve = async (escalationId: string) => {
    if (!data) return;

    // Optimistic: remove from list immediately
    mutate(
      {
        escalations: data.escalations.filter((e) => e.id !== escalationId),
        count: data.count - 1,
      },
      false,
    );

    try {
      await fetch(`/api/escalations/${escalationId}/resolve`, {
        method: 'PATCH',
      });
      mutate();
      addToast('Conversation marked as resolved', 'success');
    } catch {
      mutate(); // Revert by revalidating
      addToast('Failed to resolve — please try again', 'error');
    }
  };

  const escalations = data?.escalations ?? [];
  const count = data?.count ?? 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-slide-in ${
              toast.type === 'success'
                ? 'bg-green-600 text-white'
                : 'bg-red-600 text-white'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/dashboard"
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Escalations Inbox</h1>
          {count > 0 && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
              {count}
            </span>
          )}
        </div>
      </div>

      {/* Empty state */}
      {data && count === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-50 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            No open escalations
          </h2>
          <p className="text-gray-500 mb-4">
            All customer issues have been resolved.
          </p>
          <Link
            href="/dashboard/conversations?status=resolved"
            className="text-brand hover:text-brand-700 text-sm font-medium"
          >
            View resolved escalations &rarr;
          </Link>
        </div>
      )}

      {/* Loading state */}
      {!data && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 animate-pulse"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="h-5 bg-gray-200 rounded w-32" />
                <div className="h-8 bg-gray-200 rounded w-20" />
              </div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-24" />
            </div>
          ))}
        </div>
      )}

      {/* Escalation cards */}
      {data && count > 0 && (
        <div className="space-y-4">
          {escalations.map((esc) => (
            <div
              key={esc.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:border-gray-200 transition-colors"
            >
              {/* Top row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-lg">
                    {esc.channel === 'whatsapp' ? '\uD83D\uDCF1' : '\uD83D\uDCF8'}
                  </span>
                  <span className="font-mono text-sm text-gray-600">
                    ***{esc.customerIdentifier.slice(-4)}
                  </span>
                  <span className="text-xs text-gray-400">
                    Escalated {timeAgo(esc.escalatedAt)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/dashboard/conversations/${esc.id}`}
                    className="flex items-center justify-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 flex-1 sm:flex-initial"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    View
                  </Link>
                  <button
                    onClick={() => resolve(esc.id)}
                    className="flex items-center justify-center gap-1 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 flex-1 sm:flex-initial"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Resolve
                  </button>
                </div>
              </div>

              {/* Message preview */}
              <p className="text-sm text-gray-700 mb-2 line-clamp-2">
                &ldquo;{esc.lastMessagePreview}&rdquo;
              </p>

              {/* Meta */}
              <div className="flex items-center gap-3 text-xs text-gray-400">
                {esc.languageDetected && (
                  <span>{languageNames[esc.languageDetected] ?? esc.languageDetected}</span>
                )}
                <span>&middot;</span>
                <span>{esc.messageCount} messages</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
