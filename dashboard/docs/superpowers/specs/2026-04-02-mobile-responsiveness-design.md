# Mobile Responsiveness — Lumino Dashboard & Admin Panel

**Date:** 2026-04-02
**Status:** Approved
**Scope:** Make all dashboard and admin panel pages fully functional and visually polished on mobile screens, while keeping the desktop experience unchanged.

## Context

The dashboard sidebar navigation is completely hidden on mobile (`hidden md:block`) with no alternative — users on phones cannot navigate between pages. Tables horizontally scroll, which is unusable on small screens. Both mobile and desktop must be equal experiences.

## Design Decisions

| Question | Decision |
|----------|----------|
| Navigation pattern (mobile) | Bottom tab bar — 5 icons, always visible |
| Desktop navigation | Unchanged — sidebar stays as-is |
| Table display (mobile) | Card layout — each row becomes a stacked card |
| Settings form (mobile) | Scrollable form — inputs go full-width, fields stack |
| Analytics charts (mobile) | Full Recharts scaled down — single column, shorter height |
| Breakpoint | `md:` (768px) — below triggers mobile layout |

## 1. Bottom Tab Bar (mobile only)

**New component: `MobileTabBar`**

- Fixed to bottom of viewport, visible only below `md:` breakpoint
- 5 tabs matching existing sidebar navigation:
  - Overview (`/dashboard`) — LayoutDashboard icon
  - Conversations (`/dashboard/conversations`) — MessageSquare icon
  - Escalations (`/dashboard/escalations`) — AlertTriangle icon
  - Analytics (`/dashboard/analytics`) — BarChart3 icon
  - Settings (`/dashboard/settings`) — Settings icon
- Active tab: brand color icon + label; inactive: gray icon + label
- Background: white with top border, matches existing card styling
- Uses same `isActive` logic as current sidebar
- Add `pb-16` bottom padding to main content on mobile to prevent content hidden behind tab bar

**Placement:** Rendered inside `src/app/dashboard/layout.tsx`, conditionally shown via Tailwind (`md:hidden`).

**Admin panel note:** The admin page lives at `/admin` (outside the `/dashboard` layout), so it won't automatically get the tab bar. The admin page should include its own `MobileTabBar` instance with an additional "Admin" tab (Shield icon), or a back-to-dashboard link. Since only admins access `/admin`, the tab bar on admin should show: a "Dashboard" link (to go back to `/dashboard`) plus the admin page itself. Simplest approach: render the same `MobileTabBar` component on the admin page with an extra `adminMode` prop that swaps the tab set to show "Dashboard" (back link) + "Admin" (current).

## 2. Tables to Card Layout (mobile only)

### Conversations List (`/dashboard/conversations`)
- Below `md:`: each conversation renders as a card
- Card shows: channel icon, masked phone number, status badge, message count, time ago
- Tap card to navigate to conversation detail (`/dashboard/conversations/[id]`)
- Filters (search, channel, status) stack vertically on mobile
- Pagination controls stay as-is (already simple enough)

### Admin Clients Table (`/admin`)
- Below `md:`: each client renders as a card
- Card shows: email, business name, active status (green/red dot), WhatsApp connected status
- Action buttons (Enable/Disable, Reset Password) stacked below card content
- Full-width buttons on mobile for easy tap targets

### Admin Usage Table (`/admin`)
- Below `md:`: each usage row renders as a card
- Card shows: business name, message count, token count, estimated cost
- Key metrics displayed as label-value pairs

### Desktop behavior: Tables remain completely unchanged.

## 3. Header Adjustments

- Keep current compact header on mobile (logo + logout icon)
- No hamburger menu needed — bottom tab bar handles navigation
- User email already hidden on mobile (`hidden sm:block`) — keep as-is
- Ensure header doesn't overlap with page content on any screen size

## 4. Page-Specific Mobile Fixes

### Dashboard Overview (`/dashboard`)
- KPI grid: already responsive (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`) — no changes
- Recent conversations: convert from table rows to card layout on mobile (same pattern as conversations page)
- Bot status card: already full-width — no changes
- Escalation alert banner: already full-width — no changes

### Conversation Detail (`/dashboard/conversations/[id]`)
- Chat bubbles: increase `max-w` from 70% to 85% on mobile for better space usage
- Header: stack channel info if needed, ensure back button is easily tappable
- Action bar: full-width buttons on mobile

### Escalations (`/dashboard/escalations`)
- Already card-based layout — ensure cards are full-width on mobile
- "View" and "Resolve" buttons: stack vertically or make full-width on mobile for tap targets

### Analytics (`/dashboard/analytics`)
- Charts already stack to single column (`grid-cols-1 md:grid-cols-2`) — no changes to grid
- Period selector buttons (7d/30d/90d): ensure they don't overflow, use `flex-wrap` if needed
- Comparison cards at bottom: already `grid-cols-1 md:grid-cols-3` — stack on mobile
- Reduce chart `ResponsiveContainer` height on mobile (e.g., 200px instead of 300px)

### Settings (`/dashboard/settings`)
- All inputs: full-width on mobile (remove any constrained widths)
- Location + Website grid (`grid-cols-2`): stack to single column on mobile (`grid-cols-1 md:grid-cols-2`)
- Keyword pills: wrap naturally (already flex-wrap)
- Save/Reset buttons: full-width on mobile, stacked vertically
- Form sections: reduce horizontal padding on mobile

### Admin Panel (`/admin`)
- System status cards: already `grid-cols-1 sm:grid-cols-3` — no changes
- Client accounts: table → cards (described in section 2)
- Usage table: table → cards (described in section 2)
- Reset password modal: ensure it's full-width on mobile with proper padding
- Create client form: full-width inputs, stack any side-by-side fields

### Login, Forgot Password, Reset Password
- Already centered card layout — works on mobile
- Ensure card has horizontal margin/padding on very small screens (`px-4`)
- Inputs already full-width inside card — no changes needed

## 5. Implementation Approach

- All changes use Tailwind responsive utilities (no media queries, no CSS modules)
- Mobile styles are the default; desktop overrides use `md:` or `sm:` prefixes where needed
- No new dependencies required
- No changes to API routes, data fetching, or business logic
- New component file only for `MobileTabBar`; everything else is modifications to existing files

## 6. What Stays the Same

- Desktop and tablet layout — completely untouched
- All functionality — no features removed on mobile
- Existing component styling (cards, buttons, inputs, colors)
- Authentication flow
- API layer
- Data fetching (SWR)

## 7. Files to Modify

| File | Changes |
|------|---------|
| `src/app/dashboard/layout.tsx` | Add MobileTabBar, add mobile bottom padding |
| `src/app/dashboard/page.tsx` | Recent conversations → cards on mobile |
| `src/app/dashboard/conversations/page.tsx` | Table → cards on mobile, stack filters |
| `src/app/dashboard/conversations/[id]/page.tsx` | Wider chat bubbles on mobile, button sizing |
| `src/app/dashboard/escalations/page.tsx` | Ensure full-width cards, button sizing |
| `src/app/dashboard/analytics/page.tsx` | Period selector wrap, chart height reduction |
| `src/app/dashboard/settings/page.tsx` | Stack grid fields, full-width buttons |
| `src/app/admin/page.tsx` | Tables → cards on mobile, modal adjustments |
| `src/app/login/page.tsx` | Minor padding adjustments |
| `src/app/login/forgot-password/page.tsx` | Minor padding adjustments |
| `src/app/login/reset-password/[token]/page.tsx` | Minor padding adjustments |

**New file:**
| File | Purpose |
|------|---------|
| `src/components/MobileTabBar.tsx` | Bottom tab bar navigation component |
