'use client';

import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { Shield, Users, MessageSquare, DollarSign, X, LayoutDashboard } from 'lucide-react';

interface ClientRow {
  userId: string;
  email: string;
  isActive: boolean;
  isAdmin: boolean;
  createdAt: string;
  clientId: string | null;
  businessName: string | null;
  waConnected: boolean;
  igConnected: boolean;
  monthMessages: number;
  monthInputTokens: number;
  monthOutputTokens: number;
}

interface AdminData {
  clients: ClientRow[];
  activeClients: number;
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

function ResetPasswordModal({
  user,
  onClose,
  onSuccess,
}: {
  user: ClientRow;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleReset() {
    if (password.length < 8) {
      setError('Minimum 8 characters');
      return;
    }
    setLoading(true);
    setError('');
    const res = await fetch(`/api/admin/clients/${user.userId}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword: password }),
    });
    if (res.ok) {
      onSuccess();
    } else {
      setError('Failed to reset password');
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm mx-4 sm:mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Reset Password</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Set new password for <span className="font-medium">{user.email}</span>
        </p>
        {error && (
          <p className="text-red-500 text-sm mb-2">{error}</p>
        )}
        <input
          type="text"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="New password (min 8 chars)"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
        />
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleReset}
            disabled={loading}
            className="px-4 py-2 text-sm bg-brand text-white rounded-lg hover:bg-brand-600 disabled:opacity-50"
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { data, mutate, isLoading } = useSWR<AdminData>('/api/admin/clients', fetcher);
  const [resetTarget, setResetTarget] = useState<ClientRow | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function toggleActive(user: ClientRow) {
    setTogglingId(user.userId);
    await fetch(`/api/admin/clients/${user.userId}/toggle`, { method: 'POST' });
    await mutate();
    setTogglingId(null);
  }

  const clients = data?.clients ?? [];
  const nonAdminClients = clients.filter(c => !c.isAdmin);
  const totalMonthMessages = clients.reduce((sum, c) => sum + c.monthMessages, 0);
  const totalMonthTokens = clients.reduce((sum, c) => sum + c.monthInputTokens + c.monthOutputTokens, 0);
  const estCost = (totalMonthTokens * 0.002 / 1000).toFixed(2);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-brand" />
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Admin Panel</h1>
        </div>
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 md:hidden"
        >
          <LayoutDashboard className="w-4 h-4" />
          Dashboard
        </Link>
      </div>

      {/* System Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-brand-50 text-brand">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Clients</p>
              <p className="text-2xl font-bold text-gray-900">
                {isLoading ? '-' : data?.activeClients ?? 0}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Messages This Month</p>
              <p className="text-2xl font-bold text-gray-900">
                {isLoading ? '-' : totalMonthMessages}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-50 text-green-600">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Est. Token Cost</p>
              <p className="text-2xl font-bold text-gray-900">
                {isLoading ? '-' : `$${estCost}`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Client Accounts Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Client Accounts</h2>
        </div>
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="px-6 py-3 font-medium">Email</th>
                <th className="px-6 py-3 font-medium">Business</th>
                <th className="px-6 py-3 font-medium">Active</th>
                <th className="px-6 py-3 font-medium">WA</th>
                <th className="px-6 py-3 font-medium">Created</th>
                <th className="px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : nonAdminClients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                    No client accounts yet
                  </td>
                </tr>
              ) : (
                nonAdminClients.map(client => (
                  <tr key={client.userId} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-mono text-xs">{client.email}</td>
                    <td className="px-6 py-3">{client.businessName ?? 'N/A'}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${
                        client.isActive ? 'bg-green-500' : 'bg-red-400'
                      }`} />
                      {client.isActive ? 'Yes' : 'No'}
                    </td>
                    <td className="px-6 py-3">
                      {client.waConnected ? (
                        <span className="text-green-600">Connected</span>
                      ) : (
                        <span className="text-gray-400">No</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-gray-500">
                      {client.createdAt ? new Date(client.createdAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleActive(client)}
                          disabled={togglingId === client.userId}
                          className={`px-2.5 py-1 rounded text-xs font-medium ${
                            client.isActive
                              ? 'bg-red-50 text-red-600 hover:bg-red-100'
                              : 'bg-green-50 text-green-600 hover:bg-green-100'
                          } disabled:opacity-50`}
                        >
                          {client.isActive ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          onClick={() => setResetTarget(client)}
                          className="px-2.5 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200"
                        >
                          Reset PW
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-gray-100">
          {isLoading ? (
            <div className="p-6 text-center text-gray-400">Loading...</div>
          ) : nonAdminClients.length === 0 ? (
            <div className="p-6 text-center text-gray-400">No client accounts yet</div>
          ) : (
            nonAdminClients.map(client => (
              <div key={client.userId} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs text-gray-600">{client.email}</span>
                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                    client.isActive ? 'text-green-600' : 'text-red-500'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${
                      client.isActive ? 'bg-green-500' : 'bg-red-400'
                    }`} />
                    {client.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-900 mb-1">{client.businessName ?? 'N/A'}</p>
                <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                  <span>WA: {client.waConnected ? 'Connected' : 'No'}</span>
                  <span>Created: {client.createdAt ? new Date(client.createdAt).toLocaleDateString() : '-'}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleActive(client)}
                    disabled={togglingId === client.userId}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium ${
                      client.isActive
                        ? 'bg-red-50 text-red-600 hover:bg-red-100'
                        : 'bg-green-50 text-green-600 hover:bg-green-100'
                    } disabled:opacity-50`}
                  >
                    {client.isActive ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => setResetTarget(client)}
                    className="flex-1 py-2 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200"
                  >
                    Reset Password
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Usage Summary Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Usage This Month</h2>
        </div>
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="px-6 py-3 font-medium">Business</th>
                <th className="px-6 py-3 font-medium text-right">Messages</th>
                <th className="px-6 py-3 font-medium text-right">Tokens</th>
                <th className="px-6 py-3 font-medium text-right">Est. Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : nonAdminClients.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                    No usage data
                  </td>
                </tr>
              ) : (
                nonAdminClients.map(client => {
                  const tokens = client.monthInputTokens + client.monthOutputTokens;
                  return (
                    <tr key={client.userId} className="hover:bg-gray-50">
                      <td className="px-6 py-3">{client.businessName ?? 'N/A'}</td>
                      <td className="px-6 py-3 text-right font-mono">
                        {client.monthMessages.toLocaleString()}
                      </td>
                      <td className="px-6 py-3 text-right font-mono">
                        {tokens.toLocaleString()}
                      </td>
                      <td className="px-6 py-3 text-right font-mono">
                        ${(tokens * 0.002 / 1000).toFixed(2)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-gray-100">
          {isLoading ? (
            <div className="p-6 text-center text-gray-400">Loading...</div>
          ) : nonAdminClients.length === 0 ? (
            <div className="p-6 text-center text-gray-400">No usage data</div>
          ) : (
            nonAdminClients.map(client => {
              const tokens = client.monthInputTokens + client.monthOutputTokens;
              return (
                <div key={client.userId} className="p-4">
                  <p className="text-sm font-medium text-gray-900 mb-2">{client.businessName ?? 'N/A'}</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-xs text-gray-400">Messages</p>
                      <p className="text-sm font-mono font-medium text-gray-900">{client.monthMessages.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Tokens</p>
                      <p className="text-sm font-mono font-medium text-gray-900">{tokens.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Cost</p>
                      <p className="text-sm font-mono font-medium text-gray-900">${(tokens * 0.002 / 1000).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Reset Password Modal */}
      {resetTarget && (
        <ResetPasswordModal
          user={resetTarget}
          onClose={() => setResetTarget(null)}
          onSuccess={() => {
            setResetTarget(null);
          }}
        />
      )}
    </div>
  );
}
