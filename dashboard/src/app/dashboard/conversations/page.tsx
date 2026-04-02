'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { ArrowLeft, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface Conversation {
  id: string;
  customerIdentifier: string;
  channel: 'instagram' | 'whatsapp';
  status: string;
  messageCount: number;
  startedAt: string;
  lastMessageAt: string;
  languageDetected: string | null;
  lastMessagePreview: string;
}

interface ConversationsResponse {
  data: Conversation[];
  total: number;
  page: number;
  totalPages: number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-blue-50 text-blue-700',
    escalated: 'bg-red-50 text-red-700',
    resolved: 'bg-green-50 text-green-700',
  };
  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
        styles[status] ?? 'bg-gray-100 text-gray-600'
      }`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-6" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-8" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-14" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-12" /></td>
    </tr>
  );
}

function ConversationCard({ conv }: { conv: Conversation }) {
  return (
    <Link
      href={`/dashboard/conversations/${conv.id}`}
      className="block p-4 hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">
            {conv.channel === 'whatsapp' ? '\uD83D\uDCF1' : '\uD83D\uDCF8'}
          </span>
          <span className="font-mono text-sm text-gray-600">
            ***{conv.customerIdentifier.slice(-4)}
          </span>
        </div>
        <StatusBadge status={conv.status} />
      </div>
      {conv.lastMessagePreview && (
        <p className="text-sm text-gray-500 line-clamp-1 mb-1">
          {conv.lastMessagePreview}
        </p>
      )}
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>{conv.messageCount} messages</span>
        <span>{timeAgo(conv.lastMessageAt)}</span>
      </div>
    </Link>
  );
}

export default function ConversationsPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="h-8 bg-gray-200 rounded w-48 mb-6 animate-pulse" />
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-full mb-3" />
            <div className="h-4 bg-gray-200 rounded w-3/4" />
          </div>
        </div>
      }
    >
      <ConversationsContent />
    </Suspense>
  );
}

function ConversationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const page = parseInt(searchParams.get('page') ?? '1');
  const status = searchParams.get('status') ?? 'all';
  const channel = searchParams.get('channel') ?? 'all';
  const q = searchParams.get('q') ?? '';

  const [searchInput, setSearchInput] = useState(q);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      updateParams({ q: searchInput, page: '1' });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value && value !== 'all' && value !== '') {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      router.push(`/dashboard/conversations?${params.toString()}`);
    },
    [searchParams, router],
  );

  const apiUrl = `/api/conversations?page=${page}&limit=20${
    status !== 'all' ? `&status=${status}` : ''
  }${channel !== 'all' ? `&channel=${channel}` : ''}${q ? `&q=${q}` : ''}`;

  const { data, isLoading } = useSWR<ConversationsResponse>(apiUrl, fetcher);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Conversations
              {data && (
                <span className="ml-2 text-sm font-normal text-gray-400">
                  ({data.total})
                </span>
              )}
            </h1>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search messages..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
            />
          </div>

          {/* Channel filter */}
          <select
            value={channel}
            onChange={(e) => updateParams({ channel: e.target.value, page: '1' })}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
          >
            <option value="all">All Channels</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="instagram">Instagram</option>
          </select>

          {/* Status filter */}
          <select
            value={status}
            onChange={(e) => updateParams({ status: e.target.value, page: '1' })}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="escalated">Escalated</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* Table — desktop */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hidden md:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Channel</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Msgs</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Activity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </>
            ) : !data?.data.length ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                  No conversations found
                </td>
              </tr>
            ) : (
              data.data.map((conv) => (
                <tr
                  key={conv.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm text-gray-600">
                      ***{conv.customerIdentifier.slice(-4)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-lg">
                    {conv.channel === 'whatsapp' ? '\uD83D\uDCF1' : '\uD83D\uDCF8'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {conv.messageCount}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {timeAgo(conv.lastMessageAt)}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={conv.status} />
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/dashboard/conversations/${conv.id}`}
                      className="text-brand hover:text-brand-700 text-sm font-medium"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <span className="text-sm text-gray-500">
              Page {data.page} of {data.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => updateParams({ page: String(page - 1) })}
                disabled={page <= 1}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => updateParams({ page: String(page + 1) })}
                disabled={page >= data.totalPages}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Cards — mobile */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden md:hidden">
        {isLoading ? (
          <div className="p-6 text-center text-gray-400 animate-pulse">Loading...</div>
        ) : !data?.data.length ? (
          <div className="p-6 text-center text-gray-400">No conversations found</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {data.data.map((conv) => (
              <ConversationCard key={conv.id} conv={conv} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">
              Page {data.page} of {data.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => updateParams({ page: String(page - 1) })}
                disabled={page <= 1}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => updateParams({ page: String(page + 1) })}
                disabled={page >= data.totalPages}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
