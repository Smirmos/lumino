'use client';

import useSWR from 'swr';
import { ArrowLeft, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface ChannelStatus {
  whatsapp: {
    connected: boolean;
    phoneNumberId: string | null;
    phoneDisplay: string | null;
  };
  instagram: {
    connected: boolean;
    pageId: string | null;
    pageName: string | null;
    tokenExpiresAt: string | null;
    tokenExpiringSoon: boolean;
  };
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function StatusDot({ connected }: { connected: boolean }) {
  return (
    <span className={`inline-block w-2.5 h-2.5 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-300'}`} />
  );
}

export default function ChannelConnectPage() {
  const { data } = useSWR<ChannelStatus>('/api/settings/channels', fetcher);

  if (!data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-48 bg-gray-200 rounded-xl" />
          <div className="h-48 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard/settings" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Channel Connections</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* WhatsApp Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">{'\uD83D\uDCF1'}</span>
            <h2 className="text-lg font-semibold text-gray-900">WhatsApp</h2>
          </div>

          {data.whatsapp.connected ? (
            <>
              <div className="flex items-center gap-2 mb-3">
                <StatusDot connected />
                <span className="text-sm font-medium text-green-700">Connected</span>
              </div>
              <p className="text-sm text-gray-600 mb-1">
                Number: {data.whatsapp.phoneDisplay ?? `ID: ***${data.whatsapp.phoneNumberId?.slice(-4)}`}
              </p>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-400">
                  WhatsApp connection is managed via Meta Developer Portal.
                  Contact Lumino support to change the connected number.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-3">
                <StatusDot connected={false} />
                <span className="text-sm font-medium text-gray-500">Not connected</span>
              </div>
              <p className="text-sm text-gray-500">
                WhatsApp Business connection is set up through Meta Developer Portal.
                Contact the Lumino team to get started.
              </p>
            </>
          )}
        </div>

        {/* Instagram Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">{'\uD83D\uDCF8'}</span>
            <h2 className="text-lg font-semibold text-gray-900">Instagram</h2>
          </div>

          {data.instagram.connected ? (
            <>
              {data.instagram.tokenExpiringSoon && (
                <div className="flex items-center gap-2 mb-3 p-2 bg-yellow-50 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  <span className="text-xs text-yellow-700">
                    Token expires soon. Reconnect to avoid interruption.
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 mb-3">
                <StatusDot connected />
                <span className="text-sm font-medium text-green-700">Connected</span>
              </div>
              {data.instagram.pageName && (
                <p className="text-sm text-gray-600 mb-1">
                  Page: @{data.instagram.pageName}
                </p>
              )}
              {data.instagram.tokenExpiresAt && (
                <p className="text-xs text-gray-400 mb-3">
                  Token expires: {new Date(data.instagram.tokenExpiresAt).toLocaleDateString('en', { month: 'short', year: 'numeric' })}
                </p>
              )}
              <button className="w-full mt-2 px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50">
                Disconnect
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-3">
                <StatusDot connected={false} />
                <span className="text-sm font-medium text-gray-500">Not connected</span>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Connect your Instagram Business account to receive and respond to DMs automatically.
              </p>
              <button className="w-full px-4 py-2 text-sm font-medium text-white bg-brand rounded-lg hover:bg-brand-600">
                Connect Instagram Account
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
