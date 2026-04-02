'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { MessageSquare, Bot, AlertTriangle, Zap, Power } from 'lucide-react';

interface DashboardStats {
  conversations: number;
  messages: number;
  escalations: number;
  avgResponseMs: number;
  unresolved: number;
  botActive: boolean;
  businessName: string;
}

interface RecentConversation {
  id: string;
  customerIdentifier: string;
  channel: 'instagram' | 'whatsapp';
  status: string;
  lastMessageAt: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function KpiCard({
  title,
  value,
  icon: Icon,
  color = 'text-gray-600',
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-lg bg-gray-50 ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
      <div className="h-8 bg-gray-200 rounded w-16" />
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function DashboardPage() {
  const { data: stats, error, isLoading, mutate } = useSWR<DashboardStats>(
    '/api/dashboard/stats',
    fetcher,
    { refreshInterval: 30000 }
  );

  const { data: recentConvos } = useSWR<RecentConversation[]>(
    '/api/dashboard/recent',
    fetcher,
    { refreshInterval: 30000 }
  );

  const [toggling, setToggling] = useState(false);

  const toggleBot = async () => {
    if (!stats) return;
    setToggling(true);
    // Optimistic update
    mutate({ ...stats, botActive: !stats.botActive }, false);
    try {
      const res = await fetch('/api/settings/toggle', { method: 'POST' });
      const data = await res.json();
      mutate({ ...stats, botActive: data.isActive });
    } catch {
      mutate(stats); // Revert on error
    } finally {
      setToggling(false);
    }
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600 font-medium">Failed to load dashboard data</p>
          <p className="text-red-400 text-sm mt-1">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            {greeting()}, {stats?.businessName ?? 'there'}
          </h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">Here is your bot performance overview</p>
        </div>
        {stats && (
          <span
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium self-start ${
              stats.botActive
                ? 'bg-green-50 text-green-700'
                : 'bg-yellow-50 text-yellow-700'
            }`}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                stats.botActive ? 'bg-green-500' : 'bg-yellow-500'
              }`}
            />
            Bot is {stats.botActive ? 'Active' : 'Paused'}
          </span>
        )}
      </div>

      {/* Bot Status Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center ${
                stats?.botActive
                  ? 'bg-green-100 text-green-600'
                  : 'bg-yellow-100 text-yellow-600'
              }`}
            >
              <Power className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Bot Status</h2>
              <p className="text-sm text-gray-500">
                {stats?.botActive
                  ? 'Your bot is live and responding to customers'
                  : 'Your bot is paused. Messages will not be answered.'}
              </p>
            </div>
          </div>
          <button
            onClick={toggleBot}
            disabled={toggling || isLoading}
            className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 ${
              stats?.botActive
                ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                : 'bg-brand text-white hover:bg-brand-600'
            }`}
          >
            {toggling ? 'Updating...' : stats?.botActive ? 'Pause Bot' : 'Activate Bot'}
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <KpiCard
              title="Conversations this month"
              value={stats?.conversations ?? 0}
              icon={MessageSquare}
              color="text-brand"
            />
            <KpiCard
              title="Messages handled"
              value={stats?.messages ?? 0}
              icon={Bot}
              color="text-blue-600"
            />
            <KpiCard
              title="Escalations"
              value={stats?.escalations ?? 0}
              icon={AlertTriangle}
              color={(stats?.escalations ?? 0) > 0 ? 'text-red-500' : 'text-gray-600'}
            />
            <KpiCard
              title="Avg response time"
              value={`${((stats?.avgResponseMs ?? 0) / 1000).toFixed(1)}s`}
              icon={Zap}
              color="text-amber-500"
            />
          </>
        )}
      </div>

      {/* Escalations Alert */}
      {stats && stats.unresolved > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <span className="text-orange-700 font-medium">
              You have {stats.unresolved} unresolved escalation{stats.unresolved > 1 ? 's' : ''}
            </span>
          </div>
          <a href="/dashboard/escalations" className="text-orange-700 hover:text-orange-800 font-medium text-sm underline">
            View Escalations
          </a>
        </div>
      )}

      {/* Recent Conversations */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Recent Conversations</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {!recentConvos ? (
            <div className="p-6 text-center text-gray-400">Loading...</div>
          ) : recentConvos.length === 0 ? (
            <div className="p-6 text-center text-gray-400">No conversations yet</div>
          ) : (
            recentConvos.map((conv) => (
              <div key={conv.id} className="px-4 py-3 sm:px-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg">
                    {conv.channel === 'whatsapp' ? '\uD83D\uDCF1' : '\uD83D\uDCF8'}
                  </span>
                  <span className="font-mono text-sm text-gray-600">
                    ****{conv.customerIdentifier.slice(-4)}
                  </span>
                </div>
                <div className="flex items-center gap-2 sm:gap-4">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      conv.status === 'active'
                        ? 'bg-green-50 text-green-700'
                        : conv.status === 'escalated'
                        ? 'bg-red-50 text-red-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {conv.status.charAt(0).toUpperCase() + conv.status.slice(1)}
                  </span>
                  <span className="text-xs text-gray-400 hidden sm:inline">{timeAgo(conv.lastMessageAt)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
