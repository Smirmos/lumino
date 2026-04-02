# Mobile Responsiveness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every dashboard and admin panel page fully functional and visually polished on mobile screens (below 768px), while keeping the desktop experience unchanged.

**Architecture:** Add a `MobileTabBar` component for mobile navigation (bottom tab bar, visible below `md:` breakpoint). Convert data tables to card layouts on mobile using Tailwind responsive utilities. Adjust spacing, button sizes, and chart heights for touch-friendly mobile use. No new dependencies.

**Tech Stack:** Next.js 14, React 18, Tailwind CSS 3.4, Lucide React icons, Recharts, SWR

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/components/MobileTabBar.tsx` | Create | Bottom tab bar navigation component (mobile only) |
| `src/app/dashboard/layout.tsx` | Modify | Import MobileTabBar, add mobile bottom padding |
| `src/app/dashboard/page.tsx` | Modify | Recent conversations → cards on mobile |
| `src/app/dashboard/conversations/page.tsx` | Modify | Table → cards on mobile, filters stack |
| `src/app/dashboard/conversations/[id]/page.tsx` | Modify | Wider chat bubbles on mobile, responsive header |
| `src/app/dashboard/escalations/page.tsx` | Modify | Full-width buttons on mobile |
| `src/app/dashboard/analytics/page.tsx` | Modify | Chart height reduction, period selector wrap |
| `src/app/dashboard/settings/page.tsx` | Modify | Stack grid fields, full-width buttons on mobile |
| `src/app/admin/page.tsx` | Modify | Tables → cards on mobile, add MobileTabBar for admin |

---

### Task 1: Create MobileTabBar Component

**Files:**
- Create: `src/components/MobileTabBar.tsx`

- [ ] **Step 1: Create the MobileTabBar component**

```tsx
// src/components/MobileTabBar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  MessageSquare,
  AlertTriangle,
  BarChart3,
  Settings,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/conversations', label: 'Chats', icon: MessageSquare },
  { href: '/dashboard/escalations', label: 'Escalations', icon: AlertTriangle },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function MobileTabBar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname.startsWith(href);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 md:hidden">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 ${
                active ? 'text-brand' : 'text-gray-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Verify the file was created**

Run: `ls -la src/components/MobileTabBar.tsx`
Expected: File exists

- [ ] **Step 3: Commit**

```bash
git add src/components/MobileTabBar.tsx
git commit -m "feat: add MobileTabBar component for mobile navigation"
```

---

### Task 2: Integrate MobileTabBar into Dashboard Layout

**Files:**
- Modify: `src/app/dashboard/layout.tsx`

- [ ] **Step 1: Add MobileTabBar import and render it, add bottom padding for mobile**

In `src/app/dashboard/layout.tsx`, add the import at the top:

```tsx
import MobileTabBar from '@/components/MobileTabBar';
```

Change the main content wrapper to add mobile bottom padding so content isn't hidden behind the tab bar. Replace:

```tsx
        {/* Main content */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
```

With:

```tsx
        {/* Main content */}
        <main className="flex-1 min-w-0 pb-20 md:pb-0">
          {children}
        </main>
```

Add `<MobileTabBar />` right before the closing `</div>` of the root element. Replace:

```tsx
      </div>
    </div>
  );
```

With:

```tsx
      </div>

      <MobileTabBar />
    </div>
  );
```

- [ ] **Step 2: Verify the app builds**

Run: `cd /Users/arkadiy.smirnov/Documents/studying/lumino/dashboard && npx next build 2>&1 | tail -20`
Expected: Build succeeds (or at least no errors related to MobileTabBar)

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/layout.tsx
git commit -m "feat: integrate MobileTabBar into dashboard layout with bottom padding"
```

---

### Task 3: Dashboard Overview — Mobile Recent Conversations Cards

**Files:**
- Modify: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Convert recent conversations list to cards on mobile**

In `src/app/dashboard/page.tsx`, find the recent conversations rendering block (the `recentConvos.map` section). Replace this block:

```tsx
            recentConvos.map((conv) => (
              <div key={conv.id} className="px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg">
                    {conv.channel === 'whatsapp' ? '\uD83D\uDCF1' : '\uD83D\uDCF8'}
                  </span>
                  <span className="font-mono text-sm text-gray-600">
                    ****{conv.customerIdentifier.slice(-4)}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      conv.status === 'active'
                        ? 'bg-green-50 text-green-700'
                        : conv.status === 'escalated'
                        ? 'bg-red-50 text-red-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {conv.status.charAt(0).toUpperCase() + conv.status.slice(1)}
                  </span>
                  <span className="text-xs text-gray-400">{timeAgo(conv.lastMessageAt)}</span>
                </div>
              </div>
            ))
```

With:

```tsx
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
```

Also update the header section to stack on mobile. Replace:

```tsx
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {greeting()}, {stats?.businessName ?? 'there'}
          </h1>
          <p className="text-gray-500 mt-1">Here is your bot performance overview</p>
        </div>
        {stats && (
          <span
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
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
```

With:

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "feat: improve dashboard overview mobile layout"
```

---

### Task 4: Conversations Page — Table to Cards on Mobile

**Files:**
- Modify: `src/app/dashboard/conversations/page.tsx`

- [ ] **Step 1: Add a ConversationCard component and switch between table/cards by breakpoint**

In `src/app/dashboard/conversations/page.tsx`, add a new component above `ConversationsContent`:

```tsx
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
```

Then in the `ConversationsContent` return, replace the entire table container (the `<div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">` that wraps the `<table>`) with:

```tsx
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
```

Also update the filters section min-width to prevent overflow on mobile. Replace:

```tsx
          <div className="relative flex-1 min-w-[200px]">
```

With:

```tsx
          <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
```

- [ ] **Step 2: Commit**

```bash
git add src/app/dashboard/conversations/page.tsx
git commit -m "feat: add mobile card layout for conversations list"
```

---

### Task 5: Conversation Detail — Mobile Adjustments

**Files:**
- Modify: `src/app/dashboard/conversations/[id]/page.tsx`

- [ ] **Step 1: Widen chat bubbles on mobile and make header responsive**

In `src/app/dashboard/conversations/[id]/page.tsx`, replace the chat bubble max-width:

```tsx
                className={`max-w-[70%] px-4 py-2 ${
```

With:

```tsx
                className={`max-w-[85%] sm:max-w-[70%] px-4 py-2 ${
```

Make the escalation banner stack on mobile. Replace:

```tsx
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <span className="text-orange-700 font-medium">
              This conversation was escalated
              {conv.escalatedAt && ` on ${formatDate(conv.escalatedAt)}`}.
              Follow up with the customer.
            </span>
          </div>
          <button
            onClick={handleResolve}
            disabled={resolving}
            className="flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-lg text-sm font-medium hover:bg-orange-200 disabled:opacity-50"
          >
            <CheckCircle className="w-4 h-4" />
            {resolving ? 'Resolving...' : 'Mark as Resolved'}
          </button>
        </div>
```

With:

```tsx
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
```

Make the action bar stack on mobile. Replace:

```tsx
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/conversations"
          className="text-gray-500 hover:text-gray-700 text-sm font-medium flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Conversations
        </Link>
        {conv.status === 'escalated' && !conv.resolvedAt && (
          <button
            onClick={handleResolve}
            disabled={resolving}
            className="flex items-center gap-2 px-6 py-2.5 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-50"
          >
            <CheckCircle className="w-4 h-4" />
            {resolving ? 'Resolving...' : 'Mark Resolved'}
          </button>
        )}
      </div>
```

With:

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add src/app/dashboard/conversations/\[id\]/page.tsx
git commit -m "feat: improve conversation detail mobile layout"
```

---

### Task 6: Escalations Page — Mobile Button Sizing

**Files:**
- Modify: `src/app/dashboard/escalations/page.tsx`

- [ ] **Step 1: Make escalation card buttons full-width on mobile**

In `src/app/dashboard/escalations/page.tsx`, replace the top row of each escalation card:

```tsx
              {/* Top row */}
              <div className="flex items-center justify-between mb-3">
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
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    View
                  </Link>
                  <button
                    onClick={() => resolve(esc.id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Resolve
                  </button>
                </div>
              </div>
```

With:

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add src/app/dashboard/escalations/page.tsx
git commit -m "feat: improve escalations page mobile layout"
```

---

### Task 7: Analytics Page — Mobile Chart Heights and Period Selector

**Files:**
- Modify: `src/app/dashboard/analytics/page.tsx`

- [ ] **Step 1: Make period selector wrap-friendly and reduce chart heights on mobile**

In `src/app/dashboard/analytics/page.tsx`, replace the header section:

```tsx
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        </div>

        {/* Period selector */}
        <div className="flex bg-gray-100 rounded-lg p-1">
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
```

With:

```tsx
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
```

Next, reduce chart heights on mobile. Replace all four `ResponsiveContainer` height values. For each chart, change:

```tsx
                <ResponsiveContainer width="100%" height={240}>
```

To:

```tsx
                <ResponsiveContainer width="100%" height={200}>
```

This applies to all four chart containers (messages per day, language breakdown, channel breakdown, peak hours). All four use `height={240}` — change all to `height={200}`.

- [ ] **Step 2: Commit**

```bash
git add src/app/dashboard/analytics/page.tsx
git commit -m "feat: improve analytics page mobile layout"
```

---

### Task 8: Settings Page — Stack Fields and Full-Width Buttons on Mobile

**Files:**
- Modify: `src/app/dashboard/settings/page.tsx`

- [ ] **Step 1: Make the location/website grid stack on mobile**

In `src/app/dashboard/settings/page.tsx`, replace:

```tsx
            <div className="grid grid-cols-2 gap-4">
```

With:

```tsx
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
```

- [ ] **Step 2: Make form footer buttons full-width on mobile**

Replace the form footer:

```tsx
        <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <span className="text-xs text-gray-400">
            Last saved: {data.updatedAt ? timeAgo(data.updatedAt) : 'never'}
          </span>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => reset()}
              disabled={!isDirty}
              className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={!isDirty || saving}
              className="px-6 py-2 text-sm font-medium text-white bg-brand rounded-lg hover:bg-brand-600 disabled:opacity-30"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
```

With:

```tsx
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <span className="text-xs text-gray-400">
            Last saved: {data.updatedAt ? timeAgo(data.updatedAt) : 'never'}
          </span>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => reset()}
              disabled={!isDirty}
              className="flex-1 sm:flex-initial px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={!isDirty || saving}
              className="flex-1 sm:flex-initial px-6 py-2 text-sm font-medium text-white bg-brand rounded-lg hover:bg-brand-600 disabled:opacity-30"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
```

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/settings/page.tsx
git commit -m "feat: improve settings page mobile layout"
```

---

### Task 9: Admin Panel — Tables to Cards and MobileTabBar

**Files:**
- Modify: `src/app/admin/page.tsx`

- [ ] **Step 1: Add MobileTabBar import and a simple admin mobile nav**

At the top of `src/app/admin/page.tsx`, add the import:

```tsx
import Link from 'next/link';
import { Shield, Users, MessageSquare, DollarSign, X, LayoutDashboard } from 'lucide-react';
```

- [ ] **Step 2: Convert client accounts table to cards on mobile**

After the existing `<div className="overflow-x-auto">` table section for Client Accounts, add a mobile cards view. Replace the entire Client Accounts section (from `{/* Client Accounts Table */}` to its closing `</div></div>`):

```tsx
      {/* Client Accounts */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Client Accounts</h2>
        </div>

        {/* Desktop table */}
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
```

- [ ] **Step 3: Convert usage table to cards on mobile**

Replace the entire Usage Summary Table section:

```tsx
      {/* Usage Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Usage This Month</h2>
        </div>

        {/* Desktop table */}
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
```

- [ ] **Step 4: Add a mobile back-to-dashboard link at the top of admin page**

Replace the admin header:

```tsx
      <div className="flex items-center gap-3 mb-8">
        <Shield className="w-6 h-6 text-brand" />
        <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
      </div>
```

With:

```tsx
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
```

- [ ] **Step 5: Add bottom padding for mobile (admin page has no layout wrapper with padding)**

Add a wrapping padding to the admin page's outermost div. Replace:

```tsx
    <div className="max-w-6xl mx-auto px-4 py-8">
```

With:

```tsx
    <div className="max-w-6xl mx-auto px-4 py-8 pb-8">
```

- [ ] **Step 6: Ensure the reset password modal is responsive**

Replace the modal container max-width:

```tsx
        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
```

With:

```tsx
        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm mx-4 sm:mx-auto">
```

- [ ] **Step 7: Commit**

```bash
git add src/app/admin/page.tsx
git commit -m "feat: add mobile card layout for admin panel tables and navigation"
```

---

### Task 10: Build Verification

- [ ] **Step 1: Run the build to check for TypeScript and compilation errors**

Run: `cd /Users/arkadiy.smirnov/Documents/studying/lumino/dashboard && npx next build 2>&1 | tail -30`
Expected: Build succeeds with no errors

- [ ] **Step 2: Fix any build errors found**

If there are build errors, fix them in the relevant files.

- [ ] **Step 3: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: resolve build errors from mobile responsiveness changes"
```
