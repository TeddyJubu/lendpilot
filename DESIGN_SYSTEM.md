# LoanPilot Design System Guide

> For the implementation agent: follow this guide exactly. Every token, component, and pattern
> is deliberate. Do not improvise outside these specifications.

---

## 1. Design Philosophy

LoanPilot is the **Anti-CRM**. The design system serves these principles above all:

1. **Command-first** — The Cmd+K bar is the primary interface. Navigation is secondary.
2. **AI feeds, not dashboards** — "Today" is a prioritized action list, not 12 widgets.
3. **Conversations over forms** — Natural language creates records. Forms are fallbacks.
4. **One action per screen** — Every view has ONE primary thing the broker should do.
5. **AI suggests, broker confirms** — AI content appears at reduced opacity until approved.
6. **Zero mandatory fields** — AI enriches. The broker adds context naturally.
7. **No empty screens** — Every view has AI-generated or demo content from first use.

### Visual Identity
- **Monochrome foundation** — Neutral grays and whites. Color is reserved exclusively for status, priority, and CTAs.
- **Linear-inspired density** — Tight spacing (4px grid), professional data density, not consumer-app airiness.
- **Calm confidence** — No gradients, no decorative elements, no playful illustrations. Clean lines, sharp type, deliberate whitespace.

---

## 2. Technology

| Layer | Tool | Version |
|---|---|---|
| Component primitives | shadcn/ui (Radix variant) | Latest (Tailwind v4, OKLCH) |
| Styling | Tailwind CSS v4 | Latest |
| Animation base | tw-animate-css | Latest |
| Micro-interactions | Framer Motion | Latest |
| Icons | Lucide React | Latest |
| Command palette | cmdk (via shadcn Command) | Latest |
| Data tables | TanStack Table | v8+ |
| Charts | Recharts (via shadcn Chart) | v3 |
| Fonts | Geist Sans + Geist Mono | Latest |
| Drag and drop | @dnd-kit/core | Latest |

### Init Command
```bash
pnpm dlx shadcn@latest init
# Select: Radix, Zinc base color, CSS variables: yes
```

---

## 3. Color System

### Foundation: OKLCH Tokens

All colors defined as CSS custom properties in OKLCH color space. The monochrome base uses **Zinc** for a cool, professional tone.

```css
/* globals.css */
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

:root {
  /* ─── Surface ─── */
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);

  /* ─── Brand ─── */
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.965 0 0);
  --secondary-foreground: oklch(0.205 0 0);

  /* ─── Utility ─── */
  --muted: oklch(0.965 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.965 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --destructive-foreground: oklch(0.577 0.245 27.325);

  /* ─── Borders ─── */
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);

  /* ─── Geometry ─── */
  --radius: 0.5rem;

  /* ─── Sidebar ─── */
  --sidebar-background: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.376 0 0);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.965 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);

  /* ─── LoanPilot Status Colors ─── */
  --status-success: oklch(0.648 0.15 160);
  --status-success-foreground: oklch(0.985 0 0);
  --status-success-muted: oklch(0.962 0.044 156);

  --status-active: oklch(0.623 0.214 259);
  --status-active-foreground: oklch(0.985 0 0);
  --status-active-muted: oklch(0.943 0.05 260);

  --status-warning: oklch(0.75 0.183 55);
  --status-warning-foreground: oklch(0.985 0 0);
  --status-warning-muted: oklch(0.962 0.059 70);

  --status-danger: oklch(0.577 0.245 27);
  --status-danger-foreground: oklch(0.985 0 0);
  --status-danger-muted: oklch(0.956 0.054 22);

  --status-info: oklch(0.556 0 0);
  --status-info-foreground: oklch(0.985 0 0);
  --status-info-muted: oklch(0.965 0 0);

  /* ─── Priority Colors ─── */
  --priority-urgent: oklch(0.577 0.245 27);
  --priority-high: oklch(0.75 0.183 55);
  --priority-medium: oklch(0.623 0.214 259);
  --priority-low: oklch(0.556 0 0);

  /* ─── Pipeline Stage Colors ─── */
  --stage-intake: oklch(0.556 0 0);
  --stage-qualification: oklch(0.623 0.214 259);
  --stage-processing: oklch(0.75 0.183 55);
  --stage-closing: oklch(0.648 0.15 160);
  --stage-terminal-success: oklch(0.648 0.15 160);
  --stage-terminal-fail: oklch(0.577 0.245 27);

  /* ─── Chart ─── */
  --chart-1: oklch(0.205 0 0);
  --chart-2: oklch(0.556 0 0);
  --chart-3: oklch(0.623 0.214 259);
  --chart-4: oklch(0.648 0.15 160);
  --chart-5: oklch(0.75 0.183 55);
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.175 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.175 0 0);
  --popover-foreground: oklch(0.985 0 0);

  --primary: oklch(0.985 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);

  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.396 0.141 25.723);
  --destructive-foreground: oklch(0.637 0.237 25.331);

  --border: oklch(0.269 0 0);
  --input: oklch(0.269 0 0);
  --ring: oklch(0.556 0 0);

  --sidebar-background: oklch(0.16 0 0);
  --sidebar-foreground: oklch(0.708 0 0);
  --sidebar-primary: oklch(0.985 0 0);
  --sidebar-primary-foreground: oklch(0.205 0 0);
  --sidebar-accent: oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(0.269 0 0);
  --sidebar-ring: oklch(0.556 0 0);

  /* Status colors remain the same in dark — they're designed for both */
  /* Stage, priority, chart colors also carry over */
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);

  --color-status-success: var(--status-success);
  --color-status-success-foreground: var(--status-success-foreground);
  --color-status-success-muted: var(--status-success-muted);
  --color-status-active: var(--status-active);
  --color-status-active-foreground: var(--status-active-foreground);
  --color-status-active-muted: var(--status-active-muted);
  --color-status-warning: var(--status-warning);
  --color-status-warning-foreground: var(--status-warning-foreground);
  --color-status-warning-muted: var(--status-warning-muted);
  --color-status-danger: var(--status-danger);
  --color-status-danger-foreground: var(--status-danger-foreground);
  --color-status-danger-muted: var(--status-danger-muted);
  --color-status-info: var(--status-info);
  --color-status-info-foreground: var(--status-info-foreground);
  --color-status-info-muted: var(--status-info-muted);

  --color-priority-urgent: var(--priority-urgent);
  --color-priority-high: var(--priority-high);
  --color-priority-medium: var(--priority-medium);
  --color-priority-low: var(--priority-low);

  --color-stage-intake: var(--stage-intake);
  --color-stage-qualification: var(--stage-qualification);
  --color-stage-processing: var(--stage-processing);
  --color-stage-closing: var(--stage-closing);
  --color-stage-terminal-success: var(--stage-terminal-success);
  --color-stage-terminal-fail: var(--stage-terminal-fail);

  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);

  --color-sidebar-background: var(--sidebar-background);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);

  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius));
  --radius-lg: calc(var(--radius) + 4px);
  --radius-xl: calc(var(--radius) + 8px);
}
```

### Color Usage Rules

| Intent | Token | Usage |
|---|---|---|
| Page background | `bg-background` | App body |
| Cards, panels | `bg-card` | All elevated surfaces |
| Primary text | `text-foreground` | Headings, body text |
| Secondary text | `text-muted-foreground` | Labels, metadata, timestamps |
| Primary button | `bg-primary text-primary-foreground` | One primary CTA per view |
| Borders | `border-border` | All borders, dividers |
| On track / approved / funded | `bg-status-success` or `bg-status-success-muted` | Stage badges, indicators |
| In progress / active | `bg-status-active` or `bg-status-active-muted` | Active stage pills |
| Attention needed / pending | `bg-status-warning` or `bg-status-warning-muted` | Warning badges |
| Urgent / overdue / denied | `bg-status-danger` or `bg-status-danger-muted` | Error states, alerts |
| Neutral / inactive | `bg-status-info` or `bg-status-info-muted` | Archived, on-hold |

### Rules
- **Never use color alone for meaning.** Always pair with an icon or label.
- **Muted variants** (`-muted`) for backgrounds, **full variants** for dots/icons/text.
- **No color outside this token set.** No raw Tailwind colors (`red-500`, `blue-600`). Everything goes through tokens.

---

## 4. Typography

### Font Stack
```css
/* In layout.tsx, load Geist from next/font/local or next/font/google */
--font-sans: "Geist", ui-sans-serif, system-ui, sans-serif;
--font-mono: "Geist Mono", ui-monospace, monospace;
```

### Type Scale

| Role | Classes | Size | Use |
|---|---|---|---|
| Page title | `text-2xl font-semibold tracking-tight` | 24px | View headers ("Today", "Pipeline", "Contacts") |
| Section heading | `text-lg font-semibold tracking-tight` | 18px | Card headers, panel titles |
| Subheading | `text-sm font-semibold` | 14px | Group labels, column headers |
| Body | `text-sm` | 14px | All body text, descriptions |
| Body small | `text-xs` | 12px | Timestamps, metadata, helper text |
| Label | `text-xs font-medium uppercase tracking-wider text-muted-foreground` | 12px | Form labels, section labels |
| Mono | `text-xs font-mono` | 12px | IDs, amounts, NMLS numbers |
| KPI number | `text-3xl font-bold tracking-tight` | 30px | Large metric displays |

### Typography Rules
- **14px is the base**, not 16px. This is a professional data-dense tool, not a consumer app.
- **Never go below 11px.** Even metadata must remain readable.
- **Font weight range: 400 (regular), 500 (medium), 600 (semibold), 700 (bold).** No thin/light weights.
- **`tracking-tight` on headings**, default tracking on body. Never use loose tracking.
- **No decorative fonts.** Geist Sans everywhere.

---

## 5. Spacing & Layout

### Grid System
4px base unit. All spacing uses Tailwind's default scale:

| Token | Pixels | Use |
|---|---|---|
| `gap-1` / `p-1` | 4px | Inline element spacing, icon padding |
| `gap-1.5` / `p-1.5` | 6px | Tight component spacing |
| `gap-2` / `p-2` | 8px | Default component internal padding |
| `gap-3` / `p-3` | 12px | Card internal padding, list items |
| `gap-4` / `p-4` | 16px | Section spacing, card padding |
| `gap-6` / `p-6` | 24px | Section breaks, panel padding |
| `gap-8` / `p-8` | 32px | Major section dividers |

### App Layout

```
┌──────────────────────────────────────────────────────────┐
│ 56px — Top bar (optional, can integrate into sidebar)    │
├────────┬─────────────────────────────────┬───────────────┤
│  56px  │                                 │   320-400px   │
│  rail  │     Main content area           │   Copilot     │
│  or    │     (flex-1, min-w-0)           │   panel       │
│  240px │                                 │   (collapsible│
│  open  │                                 │    to 0px)    │
│        │                                 │               │
│        │                                 │               │
└────────┴─────────────────────────────────┴───────────────┘
```

- **Sidebar:** shadcn Sidebar component with `collapsible="icon"` variant. 56px collapsed (icon rail), 240px expanded.
- **Main area:** `flex-1 min-w-0 overflow-hidden`. Never a fixed width.
- **Copilot panel:** 360px default, 0px when collapsed. Slides from right. Toggle with `Cmd+/`.
- **Content max-width:** No max-width on main area. Pipeline needs full width. Contacts list needs full width. Let the content fill.

### Responsive Behavior

| Breakpoint | Sidebar | Copilot | Layout |
|---|---|---|---|
| `< 768px` | Hidden (Sheet overlay) | Hidden (Sheet overlay) | Single column |
| `768px–1280px` | Icon rail (56px) | Hidden by default | Main content full |
| `> 1280px` | Expanded (240px) | Visible if toggled | Full three-column |

### Spacing Rules
- **Consistent padding inside cards:** `p-4` always. Not `p-3` sometimes and `p-6` others.
- **List item height:** 40px minimum (compact), 48px comfortable. Use `h-10` or `h-12`.
- **Consistent gap in lists:** `gap-1` between items (4px). Tight, scannable.
- **Section separator:** `<Separator />` with `my-4` margin.

---

## 6. Component Architecture

### Three-Layer System

```
src/components/
  ui/              Layer 1: Raw shadcn components. NEVER modify directly.
  primitives/      Layer 2: LoanPilot wrappers with design system defaults applied.
  features/        Layer 3: Full feature compositions (specific to a view/organ).
```

### Layer 1 — shadcn (install as-is)
Install these components. Do not modify their source files:

**Required for V1:**
```bash
pnpm dlx shadcn@latest add \
  avatar badge button card checkbox command dialog \
  dropdown-menu input label popover scroll-area \
  select separator sheet sidebar skeleton \
  sonner switch table tabs textarea tooltip \
  toggle separator progress
```

### Layer 2 — LoanPilot Primitives

Build these wrappers. Each wraps one or more shadcn components with LoanPilot design tokens and defaults. Documented with props and variants.

#### `StatusBadge`
Purpose: Consistent status indicator across all organs.
```tsx
// components/primitives/status-badge.tsx
interface StatusBadgeProps {
  status: "success" | "active" | "warning" | "danger" | "info";
  label: string;
  size?: "sm" | "default";
  dot?: boolean;  // show colored dot before label
}
```
Renders: `<Badge>` with status token colors, optional leading dot, `text-xs font-medium`.
- `success` → `bg-status-success-muted text-status-success`
- `active` → `bg-status-active-muted text-status-active`
- `warning` → `bg-status-warning-muted text-status-warning`
- `danger` → `bg-status-danger-muted text-status-danger`
- `info` → `bg-status-info-muted text-status-info`

#### `PriorityIndicator`
Purpose: Visual priority marker for feed items.
```tsx
interface PriorityIndicatorProps {
  priority: "urgent" | "high" | "medium" | "low";
  showLabel?: boolean;
}
```
Renders: Colored dot (8px circle) + optional label. Uses `--priority-*` tokens.

#### `StagePill`
Purpose: Pipeline stage indicator on loan cards.
```tsx
interface StagePillProps {
  stage: LoanStage;  // union of all stage literals
  size?: "sm" | "default";
}
```
Renders: Rounded pill with stage group color + stage label text.
- Intake stages → `--stage-intake`
- Qualification stages → `--stage-qualification`
- Processing stages → `--stage-processing`
- Closing stages → `--stage-closing`
- funded → `--stage-terminal-success`
- withdrawn/denied → `--stage-terminal-fail`

#### `MetricCard`
Purpose: KPI display for pipeline summaries.
```tsx
interface MetricCardProps {
  label: string;
  value: string | number;
  trend?: { direction: "up" | "down" | "flat"; percentage: number };
  icon?: LucideIcon;
}
```
Renders: `<Card>` with `text-3xl font-bold` value, `text-xs text-muted-foreground` label, optional trend arrow.

#### `UserAvatar`
Purpose: Consistent avatar display.
```tsx
interface UserAvatarProps {
  name: string;
  imageUrl?: string;
  size?: "xs" | "sm" | "md" | "lg";  // 24, 32, 40, 48px
}
```
Renders: `<Avatar>` with image or initials fallback. Initials computed from first+last name.

#### `EmptyState`
Purpose: Every view's empty state. No blank screens ever.
```tsx
interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
}
```
Renders: Centered layout, muted icon (48px), title, description, CTA button(s). No illustrations — just clean icon + text.

#### `AIContent`
Purpose: Wraps any AI-generated content with review state.
```tsx
interface AIContentProps {
  children: React.ReactNode;
  status: "pending" | "approved" | "rejected";
  onApprove?: () => void;
  onReject?: () => void;
}
```
Renders: Children at **60% opacity** when `pending`, 100% when `approved`. Small "AI-generated" label with approve/reject buttons. Thin left border accent when pending.

#### `TimeAgo`
Purpose: Consistent relative timestamps.
```tsx
interface TimeAgoProps {
  timestamp: number;
  className?: string;
}
```
Renders: `text-xs text-muted-foreground` with relative time ("2h ago", "3 days ago").

#### `KeyboardShortcut`
Purpose: Display keyboard shortcut hints.
```tsx
interface KeyboardShortcutProps {
  keys: string[];  // ["Cmd", "K"] or ["Ctrl", "N"]
}
```
Renders: `<Kbd>` components with monospace text, subtle border/bg.

#### `LoadingState`
Purpose: Consistent skeleton loading for all views.
```tsx
interface LoadingStateProps {
  variant: "list" | "card" | "kanban" | "detail" | "feed";
  count?: number;
}
```
Renders: `<Skeleton>` shapes matching the layout of the target content. Not a spinner.

#### `DetailPanel`
Purpose: Slide-out panel for loan/contact details.
```tsx
interface DetailPanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;     // StatusBadge or StagePill
  tabs?: { label: string; content: React.ReactNode }[];
  actions?: { label: string; onClick: () => void; variant?: string }[];
  children?: React.ReactNode;  // if no tabs, render children directly
}
```
Renders: `<Sheet>` from right, 600px wide, with sticky header (title + badge + close button + actions), scrollable tabbed body. Closes on Esc, URL updates to `?detail=<id>`.

Animation: `transform: translateX(100%)` → `translateX(0)`, 200ms ease-out.

#### `ConfirmDialog`
Purpose: Confirmation for critical actions (stage changes, archive, delete).
```tsx
interface ConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  description: string;
  confirmLabel?: string;     // default "Confirm"
  variant?: "default" | "destructive";
}
```
Renders: `<AlertDialog>` with clear title, description, two buttons. Destructive variant uses `bg-destructive`.

---

### Layer 3 — Feature Components

These compose Layer 1 + Layer 2 into view-specific features. Each feature component lives in the corresponding frontend organ directory.

#### Shell Organ (`components/shell/`)

**`AppSidebar`**
- Uses shadcn `<Sidebar>` with `collapsible="icon"` variant.
- 3 navigation items only: Today, Pipeline, Contacts. Each with a Lucide icon.
- Badge on "Today" showing active feed item count.
- Bottom section: Settings gear icon, user avatar, dark mode toggle.
- Keyboard: `Cmd+B` to toggle.

```
┌──────────┐
│  Logo    │
├──────────┤
│ ☀ Today 5│  ← badge shows count
│ ▤ Pipeline│
│ 👤Contacts│
│          │
│          │
│          │
├──────────┤
│ ⚙ Settings│
│ 🌙 Theme │
│ [Avatar] │
└──────────┘
```

**`CommandBar`**
- Uses shadcn `<CommandDialog>` triggered by `Cmd+K`.
- Groups: **Recent** (last 5 actions), **Navigate** (Today, Pipeline, Contacts, Settings), **Create** (New Lead, New Loan, New Contact), **Search** (fuzzy across contacts + loans by name).
- Each item shows icon + label + optional `<CommandShortcut>`.
- Contextual: when on Pipeline, show pipeline-specific commands first.
- Input placeholder: "Search or type a command..."
- Width: 560px max. Centered overlay with backdrop blur.

**`CopilotPanel`**
- Collapsible right panel, 360px wide.
- Toggle: `Cmd+/`.
- Header: "Copilot" label + context breadcrumb ("Viewing: John Smith's Loan") + collapse button.
- Body: scrollable chat thread (AI left, user right) + suggestion chips above input.
- Suggestion chips: contextual pre-built prompts (3 max, wrap to second line if needed).
- Input: `<Textarea>` with `Cmd+Enter` to send.
- AI messages render with `<AIContent status="approved">` (pre-approved since it's a chat context).
- Streaming: show typing indicator (3 animated dots) during AI response.

#### Today Organ (`components/today/`)

**`FeedList`**
- Renders feed items grouped by priority: Urgent first, then High, Medium, Low.
- Group headers: `<h3>` with priority dot + label ("Urgent", "Needs Attention", "Updates", "Low Priority").
- Scrollable with virtual scrolling if > 50 items.

**`FeedCard`**
- Height: auto, min 72px.
- Structure:
```
┌─[PriorityDot]─[Icon]──[Title]─────────────[TimeAgo]─┐
│                [Description — 2 lines max, truncate]  │
│  [Link to contact/loan]                               │
│  [SuggestedAction button]  [⋯ overflow menu]          │
└───────────────────────────────────────────────────────┘
```
- `SuggestedAction` is a `<Button variant="default" size="sm">` — the ONE primary action.
- Overflow menu: Snooze (with submenu: 1h, tomorrow, next week), Dismiss, View details.
- Hover: subtle `bg-accent` background.
- Click on card body opens the linked contact/loan in a `<DetailPanel>`.
- Completed items: fade out with `opacity-50` and strikethrough on title.

**`FeedEmptyState`**
- "You're all caught up." with a subtle checkmark icon.
- Below: "Here's how your week is looking..." with a compact pipeline summary (count per stage).

#### Pipeline Organ (`components/pipeline/`)

**`KanbanBoard`**
- 4 column groups: Intake, Qualification, Processing, Closing.
- Each column group has a colored top border (2px) using `--stage-*` tokens.
- Column header: Group name + loan count + total value. `text-sm font-semibold`.
- Within each group, sub-stages are sections (not separate columns) to avoid horizontal overflow.
- Drag-and-drop via `@dnd-kit`. Dragging a card shows a ghost at 80% opacity.
- Drop zone: target column highlights with `ring-2 ring-primary/20`.
- Horizontal scroll if needed, but prefer collapsing empty stages.

**`LoanCard`**
- Width: fills column. Height: auto, compact.
```
┌──────────────────────────────────┐
│ [2px top border in stage color]  │
│ John Smith          $450,000     │
│ FHA · 720 FICO                   │
│ [NextAction badge]   5d ●        │
└──────────────────────────────────┘
```
- Borrower name: `text-sm font-medium`.
- Amount: `text-sm font-mono text-muted-foreground` right-aligned.
- Loan type + FICO: `text-xs text-muted-foreground`.
- Next action: `<Badge variant="outline" className="text-xs">` — e.g., "Chase W-2", "Lock rate".
- Days in stage: `text-xs` with color coding — green (<3d), amber (3-7d), red (>7d). Shown as number + colored dot.
- Click: opens `<DetailPanel>` with full loan details.
- Hover: `shadow-sm` elevation + `border-border/50` darken.

**`LoanDetailPanel`**
- Uses `<DetailPanel>` wrapper.
- Tabs: **Overview** (borrower info, property, loan params, AI summary), **Documents** (doc list with status), **Activity** (timeline), **Rate** (locked rate, comparison).
- Overview tab top section: `<StagePill>` + stage progress bar (linear, showing all stages with current highlighted).
- AI Summary section: `<AIContent>` wrapper with narrative text.
- Documents section: table of docs with category, status badge, due date, upload action.

#### Contacts Organ (`components/contacts/`)

**`ContactList`**
- Master-detail layout. List takes 40% width (min 360px), detail panel takes 60%.
- List header: search input + filter dropdown (type: lead, borrower, realtor, etc.) + "Add contact" button.
- List items: 48px height.
```
┌─[Avatar 32px]──[Name]────────[LeadScore]──┐
│                [Type badge]  [LastContact] │
└───────────────────────────────────────────┘
```
- Selected item: `bg-accent` background.
- Hover: `bg-accent/50`.
- Search: filters in real-time (client-side for loaded page, Convex query for full search).
- Sort: by name (default), lead score, last contacted.

**`ContactDetailPanel`**
- Uses `<DetailPanel>` wrapper (but inline on desktop, Sheet on mobile).
- Header: name, type badge, lead score meter (0-100 as thin bar), contact actions (email, call, SMS icons).
- Tabs: **Overview** (enrichment data, source, tags, notes), **Loans** (linked loans list), **Activity** (timeline), **Relationships** (referred by, referrals made).
- Enrichment section: `<AIContent>` wrapper. Shows job title, employer, estimated income if enriched. "Not yet enriched" placeholder otherwise.

---

## 7. Animation Specifications

### Micro-Interactions (tw-animate-css + Framer Motion)

| Interaction | Animation | Duration | Easing |
|---|---|---|---|
| Card hover | `shadow-sm` + `translate-y-[-1px]` | 150ms | ease-out |
| Button press | `scale(0.98)` | 100ms | ease-in |
| Panel slide-in | `translateX(100%)` → `translateX(0)` | 200ms | ease-out |
| Panel slide-out | `translateX(0)` → `translateX(100%)` | 150ms | ease-in |
| Dialog appear | `opacity: 0, scale: 0.95` → `opacity: 1, scale: 1` | 200ms | ease-out |
| Feed item enter | `opacity: 0, y: 8` → `opacity: 1, y: 0` | 200ms | ease-out, stagger 50ms |
| Feed item dismiss | `opacity: 1, x: 0` → `opacity: 0, x: 20` | 150ms | ease-in |
| Command bar open | `opacity: 0, scale: 0.98` → `opacity: 1, scale: 1` | 150ms | ease-out |
| Skeleton pulse | Shimmer gradient | 1.5s loop | linear |
| Toast enter | slide in from top-right | 200ms | ease-out |
| Kanban card drag | `shadow-lg`, `opacity: 0.8`, `scale: 1.02` | instant | — |
| Stage transition | `bg-accent` flash on card | 300ms | ease-in-out |
| Copilot typing | 3 dots bounce | 600ms loop | ease-in-out |

### Rules
- **No animation longer than 300ms.** This is a productivity tool, not a portfolio site.
- **`prefers-reduced-motion: reduce`** — disable all motion. Respect the OS setting.
- **No layout-shifting animations.** Content should not reflow during animation.
- **Stagger lists, don't animate all at once.** 50ms stagger between items, max 5 items animated.

---

## 8. Keyboard Navigation

### Global Shortcuts

| Shortcut | Action |
|---|---|
| `Cmd+K` | Open command bar |
| `Cmd+/` | Toggle copilot panel |
| `Cmd+B` | Toggle sidebar |
| `1` | Navigate to Today (when no input focused) |
| `2` | Navigate to Pipeline |
| `3` | Navigate to Contacts |
| `Cmd+N` | Create new (context-dependent: loan on Pipeline, contact on Contacts) |
| `Esc` | Close active panel/dialog/command bar |
| `?` | Show keyboard shortcut help (when no input focused) |

### View-Specific Shortcuts

**Today view:**
| Shortcut | Action |
|---|---|
| `j` / `k` | Navigate feed items up/down |
| `Enter` | Execute suggested action on focused item |
| `e` | Dismiss focused item |
| `s` | Snooze focused item |

**Pipeline view:**
| Shortcut | Action |
|---|---|
| `←` / `→` | Navigate between stage columns |
| `j` / `k` | Navigate cards within a column |
| `Enter` | Open loan detail panel |
| `m` | Move card (opens stage picker) |

**Contacts view:**
| Shortcut | Action |
|---|---|
| `j` / `k` | Navigate contact list |
| `Enter` | Open contact detail |
| `/` | Focus search input |

### Rules
- Show shortcuts in tooltips (`<Tooltip>` with `<KeyboardShortcut>`).
- Show shortcuts next to command bar items.
- All actions accessible via keyboard. If a mouse user can do it, a keyboard user must be able to.

---

## 9. Dark Mode

### Implementation
- Use `next-themes` with `attribute="class"` strategy.
- Toggle in sidebar footer (sun/moon icon).
- Default: system preference. User can override.
- All tokens have dark variants in the CSS (see Section 3).

### Dark Mode Rules
- **Never use pure black (`#000`).** Darkest surface is `oklch(0.145 0 0)` (approximately `#1a1a1a`).
- **Card surfaces slightly lighter than background** for elevation: `oklch(0.175 0 0)`.
- **Status colors remain saturated** in dark mode — they're already designed for both.
- **Borders become more subtle** in dark — `oklch(0.269 0 0)`.
- **Test every component in both modes.** No component ships without dark mode verification.

---

## 10. Responsive Behavior

### Mobile (< 768px)
- Sidebar becomes a Sheet (slide-in from left, triggered by hamburger icon in top bar).
- Copilot becomes a Sheet (slide-in from right, triggered by AI icon in top bar).
- Pipeline: single column, swipeable stages (tab bar at top).
- Contacts: full-width list, detail opens as a new page (not panel).
- Feed: full-width cards, same layout but stacked.
- Command bar: full-width, positioned at top.

### Tablet (768px–1280px)
- Sidebar: icon rail (56px).
- Copilot: hidden by default, toggle shows as overlay.
- Pipeline: horizontal scroll kanban.
- Contacts: stacked list above detail (not side-by-side).

### Desktop (> 1280px)
- Full layout as designed.

### Rules
- **Mobile is not V1 priority** but the layout must not break. Use Tailwind responsive prefixes (`md:`, `lg:`) from the start.
- **No horizontal scrolling on mobile** except the kanban board (intentional).
- **Touch targets minimum 44px** on mobile.

---

## 11. shadcn Components to Install (V1)

### Phase 0 (Foundation)
```bash
pnpm dlx shadcn@latest add button card input label separator sidebar \
  avatar skeleton tooltip sonner command dialog sheet scroll-area
```

### Phase 1 (Contacts)
```bash
pnpm dlx shadcn@latest add badge table dropdown-menu popover select \
  textarea tabs checkbox
```

### Phase 2 (Pipeline)
```bash
pnpm dlx shadcn@latest add progress hover-card
```

### Phase 3 (Documents)
```bash
pnpm dlx shadcn@latest add alert-dialog toggle
```

### Phase 4 (Templates + Comms)
```bash
# No new shadcn components needed
```

### Phase 5 (Feed)
```bash
# No new shadcn components needed — built from existing primitives
```

### Phase 6+ (AI, Charts, Reporting)
```bash
pnpm dlx shadcn@latest add chart
```

---

## 12. File Structure for Design System

```
src/
  components/
    ui/                          # Layer 1 — shadcn (untouched)
      button.tsx
      card.tsx
      command.tsx
      dialog.tsx
      ... (all shadcn installs)

    primitives/                  # Layer 2 — LoanPilot design system
      status-badge.tsx
      priority-indicator.tsx
      stage-pill.tsx
      metric-card.tsx
      user-avatar.tsx
      empty-state.tsx
      ai-content.tsx
      time-ago.tsx
      keyboard-shortcut.tsx
      loading-state.tsx
      detail-panel.tsx
      confirm-dialog.tsx

    shell/                       # Layer 3 — Shell organ
      app-sidebar.tsx
      command-bar.tsx
      copilot-panel.tsx
      top-bar.tsx                # Mobile only

    today/                       # Layer 3 — Today organ
      feed-list.tsx
      feed-card.tsx
      feed-empty-state.tsx

    pipeline/                    # Layer 3 — Pipeline organ
      kanban-board.tsx
      stage-column.tsx
      loan-card.tsx
      loan-detail-panel.tsx
      stage-progress-bar.tsx

    contacts/                    # Layer 3 — Contacts organ
      contact-list.tsx
      contact-list-item.tsx
      contact-detail-panel.tsx
      contact-search.tsx

    documents/                   # Layer 3 — Documents organ
      doc-list.tsx
      doc-upload.tsx
      doc-request-card.tsx

    shared/                      # Cross-cutting utilities
      pagination.tsx
      data-table.tsx             # Reusable TanStack Table wrapper
      data-table-column-header.tsx
      data-table-pagination.tsx
      data-table-view-options.tsx

  hooks/
    use-keyboard-shortcut.ts     # Global shortcut registration
    use-media-query.ts           # Responsive breakpoint hooks
    use-copilot.ts               # Copilot panel state

  styles/
    globals.css                  # All CSS variables (Section 3), @imports
```

---

## 13. Implementation Order

The design system builds phase by phase, matching the CLAUDE.md development phases:

### Step 1 — Token Foundation
1. Set up `globals.css` with all tokens from Section 3 (both light and dark).
2. Configure Tailwind v4 theme inline bindings.
3. Install Geist fonts.
4. Verify: light/dark toggle works, all token classes resolve.

### Step 2 — Layer 1 (shadcn base)
1. Run Phase 0 shadcn install command.
2. Verify: all components render, dark mode works on each.

### Step 3 — Layer 2 Primitives (core set)
Build in this order (each depends on the previous):
1. `KeyboardShortcut` (standalone)
2. `TimeAgo` (standalone)
3. `UserAvatar` (standalone)
4. `StatusBadge` (standalone)
5. `PriorityIndicator` (standalone)
6. `StagePill` (depends on status tokens)
7. `LoadingState` (standalone)
8. `EmptyState` (standalone)
9. `AIContent` (standalone)
10. `MetricCard` (standalone)
11. `ConfirmDialog` (wraps AlertDialog)
12. `DetailPanel` (wraps Sheet + Tabs)

Each primitive: build → verify light mode → verify dark mode → document props.

### Step 4 — Shell Components
1. `AppSidebar` (uses Sidebar + Avatar + Badge)
2. `CommandBar` (uses Command + KeyboardShortcut)
3. `CopilotPanel` (uses Sheet + AIContent + Textarea)
4. Wire up global keyboard shortcuts.
5. Verify: full app shell renders, navigation works, Cmd+K opens, Cmd+/ toggles copilot, dark mode persists.

### Step 5 — View Components (per phase)
Build feature components as each CLAUDE.md phase begins. Do not build ahead — components may evolve based on Convex data shapes finalized during that phase.

---

## 14. Design Rules — Non-Negotiable

1. **No raw Tailwind colors.** Only design tokens (`bg-primary`, `text-status-success`, etc.). If a color isn't in the token set, add it to the token set first.
2. **No inline styles.** Everything via Tailwind classes or CSS variables.
3. **No modifications to `ui/` files.** Wrap them in `primitives/` or `features/`.
4. **No component without dark mode support.** Test both modes before shipping.
5. **No component without keyboard support.** Tab, Enter, Esc must work.
6. **No animation over 300ms.**
7. **No font below 11px.**
8. **No empty screens.** Every view needs an EmptyState component.
9. **No spinner loading states.** Use Skeleton components only.
10. **No color without a paired label or icon.** Accessibility is not optional.
11. **One primary CTA per view.** Secondary actions use `variant="secondary"` or `variant="ghost"`.
12. **Monochrome base, color for status only.** If it's not a status, priority, stage, or CTA — it's gray.
