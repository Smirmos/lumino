'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react';
import Link from 'next/link';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  BarChart, Bar,
} from 'recharts';

interface AnalyticsData {
  messagesPerDay: { date: string; count: number }[];
  languageBreakdown: { language: string; name: string; count: number }[];
  channelBreakdown: { channel: string; count: number }[];
  peakHours: { hour: number; count: number }[];
  monthlyComparison: {
    thisConversations: number;
    lastConversations: number;
    thisMessages: number;
    lastMessages: number;
    thisEscalations: number;
    lastEscalations: number;
  };
  period: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const LANGUAGE_COLORS: Record<string, string> = {
  he: '#5B4FCF',
  ru: '#F5A623',
  en: '#10B981',
};

const CHANNEL_COLORS: Record<string, string> = {
  WhatsApp: '#25D366',
  Instagram: '#E1306C',
};

function formatHour(hour: number): string {
  if (hour === 0) return '12am';
  if (hour === 12) return '12pm';
  return hour < 12 ? `${hour}am` : `${hour - 12}pm`;
}

function pctChange(current: number, previous: number): { value: string; positive: boolean } {
  if (previous === 0) return { value: '+100%', positive: true };
  const pct = ((current - previous) / previous) * 100;
  return {
    value: `${pct > 0 ? '+' : ''}${pct.toFixed(0)}%`,
    positive: pct >= 0,
  };
}

function ComparisonCard({
  title,
  current,
  previous,
  invertColor,
}: {
  title: string;
  current: number;
  previous: number;
  invertColor?: boolean;
}) {
  const change = pctChange(current, previous);
  const isGood = invertColor ? !change.positive : change.positive;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <p className="text-sm text-gray-500 mb-1">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{current.toLocaleString()}</p>
      <div className="flex items-center gap-1 mt-2">
        {isGood ? (
          <TrendingUp className="w-4 h-4 text-green-500" />
        ) : (
          <TrendingDown className="w-4 h-4 text-red-500" />
        )}
        <span
          className={`text-sm font-medium ${isGood ? 'text-green-600' : 'text-red-600'}`}
        >
          {change.value}
        </span>
        <span className="text-xs text-gray-400">vs last month</span>
      </div>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-32 mb-4" />
      <div className="h-48 bg-gray-100 rounded" />
    </div>
  );
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');

  const { data, isLoading } = useSWR<AnalyticsData>(
    `/api/analytics?period=${period}`,
    fetcher,
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Analytics</h1>
        </div>

        {/* Period selector */}
        <div className="flex bg-gray-100 rounded-lg p-1 self-start">
          {(['7d', '30d', '90d'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                period === p
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {isLoading || !data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ChartSkeleton />
          <ChartSkeleton />
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      ) : (
        <>
          {/* Row 1: Line chart + Pie chart */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Messages per day */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Messages per day</h3>
              {data.messagesPerDay.length === 0 ? (
                <p className="text-gray-400 text-sm py-12 text-center">No data yet</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={data.messagesPerDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d: string) => {
                        const date = new Date(d);
                        return `${date.toLocaleDateString('en', { month: 'short', day: 'numeric' })}`;
                      }}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      labelFormatter={(d) => new Date(String(d)).toLocaleDateString('en', { month: 'long', day: 'numeric' })}
                      formatter={(v) => [`${v} messages`, 'Count']}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#5B4FCF"
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Language breakdown */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Language breakdown</h3>
              {data.languageBreakdown.length === 0 ? (
                <p className="text-gray-400 text-sm py-12 text-center">No data yet</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={data.languageBreakdown}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) =>
                        `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                    >
                      {data.languageBreakdown.map((entry) => (
                        <Cell
                          key={entry.language}
                          fill={LANGUAGE_COLORS[entry.language] ?? '#94A3B8'}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => [`${v} conversations`, 'Count']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Row 2: Channel breakdown + Peak hours */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Channel breakdown */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Channel breakdown</h3>
              {data.channelBreakdown.length === 0 ? (
                <p className="text-gray-400 text-sm py-12 text-center">No data yet</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.channelBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="channel" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => [`${v} conversations`, 'Count']} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {data.channelBreakdown.map((entry) => (
                        <Cell
                          key={entry.channel}
                          fill={CHANNEL_COLORS[entry.channel] ?? '#94A3B8'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Peak hours */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Peak hours</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.peakHours}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="hour"
                    tickFormatter={formatHour}
                    tick={{ fontSize: 10 }}
                    interval={2}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    labelFormatter={(h) => `${formatHour(Number(h))}`}
                    formatter={(v) => [`${v} messages`, 'Count']}
                  />
                  <Bar dataKey="count" fill="#5B4FCF" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Row 3: Monthly comparison cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ComparisonCard
              title="Conversations"
              current={data.monthlyComparison.thisConversations}
              previous={data.monthlyComparison.lastConversations}
            />
            <ComparisonCard
              title="Messages"
              current={data.monthlyComparison.thisMessages}
              previous={data.monthlyComparison.lastMessages}
            />
            <ComparisonCard
              title="Escalations"
              current={data.monthlyComparison.thisEscalations}
              previous={data.monthlyComparison.lastEscalations}
              invertColor
            />
          </div>
        </>
      )}
    </div>
  );
}
