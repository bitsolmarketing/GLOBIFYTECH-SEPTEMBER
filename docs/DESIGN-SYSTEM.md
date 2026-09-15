# Globify Design System

The system is token-first. Components never pick raw colors; they consume semantic tokens defined once in `src/styles/tokens.css` and exposed to Tailwind through `@theme` in `src/app/globals.css`.

## 1. Principles

1. **Expensive because disciplined.** Fewer colors, more whitespace, stronger type.
2. **One primary action per screen.** Everything else is secondary or tertiary.
3. **Motion explains.** Transitions communicate hierarchy and state; nothing animates for decoration.
4. **Dark mode is designed, not inverted.** Surfaces are layered blacks with tuned borders; accents are brightened for contrast.
5. **Mobile is first-class.** Student LMS is designed mobile-first; admin is desktop-first and still usable on a phone.

## 2. Typography

Font: **Geist** (sans) via `next/font`, with **Geist Mono** for code and certificate IDs. Fallback stack: `ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto`. Urdu/Arabic locales load **Noto Naskh Arabic** through the same font variable.

| Token | Size / line | Weight | Tracking | Use |
|---|---|---|---|---|
| `display` | 64 / 1.02 (mobile 40) | 600 | -0.035em | Hero headlines |
| `h1` | 44 / 1.08 (mobile 32) | 600 | -0.03em | Page titles |
| `h2` | 32 / 1.15 | 600 | -0.025em | Section titles |
| `h3` | 24 / 1.25 | 600 | -0.02em | Card groups |
| `h4` | 18 / 1.35 | 600 | -0.01em | Card titles |
| `body-lg` | 18 / 1.6 | 400 | 0 | Marketing copy |
| `body` | 15 / 1.6 | 400 | 0 | Default |
| `body-sm` | 13.5 / 1.5 | 400 | 0 | Secondary text |
| `caption` | 12 / 1.4 | 500 | 0.01em | Meta, timestamps |
| `label` | 12 / 1 | 600 | 0.06em uppercase | Eyebrows, table headers |

Utilities: `.text-display .text-h1 … .text-label` are defined in `globals.css`.

## 3. Spacing

Scale (px): `4 8 12 16 24 32 48 64 80 96 128` → Tailwind `1 2 3 4 6 8 12 16 20 24 32`. Section rhythm on marketing pages: `py-24 md:py-32`. App content padding: `p-4 md:p-6 lg:p-8`. Card padding: `p-5` / `p-6`.

## 4. Color

Foundation (light): `--bg` white, `--bg-subtle` #F7F8FA, `--surface` white, `--surface-raised` white + shadow, `--border` #E6E8EC, `--fg` #0B0D12, `--fg-muted` #5B6472, `--fg-subtle` #8A93A1.

Foundation (dark): `--bg` #07080B (deep black), `--bg-subtle` #0C0E13 (near black), `--surface` #101318 (slate), `--surface-raised` #161A21, `--border` rgba(255,255,255,.08), `--fg` #F2F4F7, `--fg-muted` #A3ABB8, `--fg-subtle` #6B7484.

Accent: `--accent` Electric Blue #2563FF (dark: #4D7CFF), `--accent-2` Cyan #06B6D4, `--accent-3` Purple #7C3AED. Gradient `--gradient-brand: linear-gradient(135deg, #2563FF 0%, #06B6D4 55%, #7C3AED 100%)` — used only for hero accents, progress rings and the brand mark.

Semantic: `--success` #16A34A, `--warning` #F59E0B, `--danger` #DC2626, `--info` #2563FF. Each has a `-soft` background tint.

Course category identities (artwork system): AI indigo→cyan, Marketing blue→violet, Development emerald→cyan, Design pink→orange, Automation amber→red, E-commerce teal→lime, Freelancing violet→blue, Video red→purple, Creative fuchsia→cyan. Each category has a `CategoryArtwork` generated from its gradient with a deterministic geometric pattern, so no course ever ships with a stock photo placeholder.

## 5. Radius, shadow, borders

Radius: `sm 6px, md 10px, lg 14px, xl 20px, 2xl 28px, full`. Cards use `lg`; buttons `md`; inputs `md`; modals `xl`.

Shadows (light): `xs 0 1px 2px rgba(11,13,18,.04)`, `sm 0 1px 3px rgba(11,13,18,.06), 0 1px 2px rgba(11,13,18,.04)`, `md 0 6px 16px -4px rgba(11,13,18,.10)`, `lg 0 20px 40px -12px rgba(11,13,18,.16)`, `glow 0 0 0 1px rgba(37,99,255,.25), 0 8px 24px -8px rgba(37,99,255,.35)`. Dark mode relies on borders and subtle inner highlights instead of drop shadows.

## 6. Motion

Durations: `fast 120ms, base 200ms, slow 320ms, page 400ms`. Easing: `--ease-out: cubic-bezier(.2,.8,.2,1)`, `--ease-in-out: cubic-bezier(.4,0,.2,1)`. Page transitions fade+rise 8px. Hover: translateY(-1px) + shadow step. Modals scale .98→1. Sidebars slide. Progress rings animate stroke. Respect `prefers-reduced-motion`.

## 7. Z-index

`dropdown 30, sticky 40, drawer 50, modal 60, popover 70, toast 80, command 90, tooltip 100`.

## 8. Breakpoints

`sm 640, md 768, lg 1024, xl 1280, 2xl 1536`. Student LMS: designed at 390px first. Admin: designed at 1440 first with collapsible sidebar under 1024.

## 9. Components

Primitives (`src/components/ui`): Button, IconButton, Input, Textarea, Select, Combobox, Checkbox, RadioGroup, Switch, Tabs, Tooltip, Popover, DropdownMenu, Dialog (Modal), Sheet (Drawer), Toast (sonner), Alert, Badge, Avatar, Card, Table, DataTable, Pagination, Calendar, Timeline, Progress, ProgressRing, Chart wrappers, CommandPalette, Sidebar, Navbar, Breadcrumbs, FileUploader, RichTextEditor, VideoPlayer, Skeleton, EmptyState, ErrorState.

LMS (`src/components/lms`): CourseCard, CourseHero, LessonCard, ModuleCard, CourseProgress, LessonProgress, AssignmentCard, ProjectCard, QuizCard, CertificateCard, LearningPath, AIChat.

CRM (`src/components/crm`): LeadCard, LeadPipeline, LeadTimeline, LeadProfile, ActivityFeed.

Admin (`src/components/admin`): StatCard, AnalyticsCard, FilterBar, DataToolbar, BulkActions.

## 10. Copy tone

Empty states are human: "You're all caught up." Errors are calm: "We couldn't load your learning space." Confirmations are specific: "Revoke certificate GT-2026-000123? Verification will fail immediately."

## 11. Accessibility

All interactive primitives are Radix-based (focus management, ARIA). Visible focus ring `2px var(--accent)` offset 2px. Minimum contrast 4.5:1 for text; category gradients only under white text with an overlay. Video player exposes captions and keyboard shortcuts. Forms label every field, announce errors with `aria-describedby`.
