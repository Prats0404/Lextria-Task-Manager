<p align="center">
  <img src="public/logo.png" alt="Lextria Logo" width="140" />
</p>

<h1 align="center">Lextria Task Manager</h1>

<p align="center">
  <strong>A production-grade, real-time Kanban task dashboard with glassmorphism UI, built for multi-department team coordination.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/Supabase-Realtime-3ECF8E?logo=supabase&logoColor=white" />
  <img src="https://img.shields.io/badge/TailwindCSS-4-06B6D4?logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/dnd--kit-Drag%20%26%20Drop-FF6B6B" />
  <img src="https://img.shields.io/badge/Deployed-Vercel-000000?logo=vercel&logoColor=white" />
</p>

<p align="center">
  <a href="https://github.com/Prats0404/Lextria-Task-Manager">GitHub Repository</a>
</p>

---

## 📌 Table of Contents

- [Overview](#-overview)
- [Key Highlights — Interview Talking Points](#-key-highlights--interview-talking-points)
- [Tech Stack](#-tech-stack)
- [Architecture & Design Patterns](#-architecture--design-patterns)
- [Feature Breakdown](#-feature-breakdown)
  - [Multi-Department System](#-multi-department-system)
  - [Multi-Board Kanban](#-multi-board-kanban)
  - [Employee / Agent Columns](#-employee--agent-columns)
  - [Task Management](#-task-management)
  - [Drag & Drop (dnd-kit)](#-drag--drop-dnd-kit)
  - [Screenshot / Image Attachments](#-screenshot--image-attachments)
  - [Task Archival & History](#-task-archival--history)
  - [Analytics & Data Visualizations](#-analytics--data-visualizations)
  - [Search & Filtering](#-search--filtering)
  - [CSV / Excel Export & Custom Reports](#-csv--excel-export--custom-reports)
  - [Browser Notifications & Reminder Engine](#-browser-notifications--reminder-engine)
  - [Smart Link Detection](#-smart-link-detection)
  - [Workload & 8-Hour Productivity Tracking](#-workload--8-hour-productivity-tracking)
  - [UI / UX Design](#-ui--ux-design)
  - [Admin Mode](#-admin-mode)
  - [Anti-DevTools Client Protection](#-anti-devtools-client-protection)
- [Database Schema](#-database-schema)
- [Security & Hardening](#-security--hardening)
- [Performance Optimizations](#-performance-optimizations)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Deployment](#-deployment)
- [Resume Bullet Points](#-resume-bullet-points)
- [Future Scope](#-future-scope)

---

## 🧭 Overview

**Lextria Task Manager** is a **full-stack, real-time collaborative Kanban dashboard** designed for office and team environments where multiple departments need independent, password-protected task boards with live cross-user synchronization.

Built as a **single-page React application** backed by **Supabase (PostgreSQL + Realtime)**, it demonstrates proficiency in:

- Complex state management with optimistic UI updates and automatic rollback
- Real-time data synchronization via PostgreSQL Change Data Capture (CDC)
- Multi-level drag-and-drop interactions with accessible keyboard support
- Modern glassmorphism UI/UX with micro-animations and Web Audio API
- Database security hardening with Row Level Security (RLS) and `SECURITY DEFINER` functions
- Client-side analytics with interactive SVG charts
- Production deployment with Vercel Analytics

---

## 🎯 Key Highlights — Interview Talking Points

| Area | What I Built | Why It Matters |
|------|-------------|----------------|
| **Optimistic UI** | Every CRUD operation updates local React state *instantly* before the network round-trip, with snapshot-based automatic rollback on failure | Delivers 0ms perceived latency — the gold standard for modern SaaS apps |
| **Real-Time Sync** | Supabase Realtime channels on all 4 tables (`departments`, `boards`, `agents`, `tasks`) with 1-second debounce to prevent drag-and-drop thrashing | Multi-user collaboration without polling; uses PostgreSQL's logical replication |
| **Drag & Drop** | Full `@dnd-kit` implementation across 4 entity levels — tasks between columns, column reordering, board tabs, and department sidebar — all with `DragOverlay` | Accessible (keyboard + pointer sensors), performant, and handles complex cross-container edge cases |
| **Security Architecture** | Plaintext passwords migrated to an isolated `department_credentials` table behind `SECURITY DEFINER` RPC functions — no credentials ever reach the client | Demonstrates understanding of database-level security beyond just frontend auth |
| **Interactive Analytics** | SVG area/line chart for completion trends, donut chart for priority distribution, department comparison bars, and a Top 10 agent leaderboard | Client-side data visualization with zero external charting libraries |
| **Task Archival System** | Completed tasks auto-archive with timestamps, filterable history drawer, one-click restore, and daily metric isolation | Keeps active boards clean while preserving full data history |
| **Reminder Engine** | 8-second periodic checker with Web Audio API dual-tone chime synthesis, native desktop notifications with deep-linking, and tab title flashing | Zero external audio files needed; synthesizes sounds from raw `AudioContext` oscillators |
| **CSV Reports** | Custom report generator with department/agent/date-range filters, real-time KPI preview, and computed analytics columns | Data portability and reporting without any backend service |
| **Pagination at Scale** | `while(hasMore)` loop fetching tasks in 1,000-row batches to bypass Supabase's PostgREST response cap | Production-ready data fetching that doesn't break at scale |
| **Performance** | `useMemo` for derived data, `useCallback` for stable handlers, local form state decoupling in modals, debounced persistence | Prevents unnecessary re-renders in a component with 4,500+ lines of JSX |

---

## 🛠 Tech Stack

### Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| **React** | 19.2 | UI library with hooks-based architecture (`useState`, `useEffect`, `useMemo`, `useCallback`, `useRef`) |
| **Tailwind CSS** | 4.3 | Utility-first CSS framework with custom `@theme` design tokens |
| **@dnd-kit/core** | 6.3 | Accessible drag-and-drop engine |
| **@dnd-kit/sortable** | 10.0 | Sortable presets for lists and grids |
| **@dnd-kit/utilities** | 3.2 | CSS transform helpers |
| **Lucide React** | 1.16 | Modern icon library (35+ icons used across the app) |
| **Vite** | 8.0 | Lightning-fast HMR dev server and optimized production builds |

### Backend / Database

| Technology | Purpose |
|-----------|---------|
| **Supabase** | PostgreSQL database, Realtime subscriptions, RPC functions |
| **PostgreSQL** | Relational data storage with UUID primary keys and cascading foreign keys |
| **Row Level Security** | Table-level access control policies on all 5 tables |
| **SECURITY DEFINER Functions** | Server-side password verification and department management |

### DevOps & Tooling

| Technology | Purpose |
|-----------|---------|
| **Vercel** | Production hosting, CI/CD, and edge deployment |
| **@vercel/analytics** | Usage tracking and Core Web Vitals monitoring |
| **ESLint** | Code quality with React Hooks and React Refresh plugins |
| **PostCSS + Autoprefixer** | CSS processing and vendor prefixing |

---

## 🏗 Architecture & Design Patterns

### Data Flow Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                      REACT FRONTEND (SPA)                     │
│                                                               │
│  ┌──────────┐    ┌──────────────────┐    ┌────────────────┐  │
│  │  User    │───▶│  Optimistic      │───▶│  Supabase      │  │
│  │  Action  │    │  State Update    │    │  API Call      │  │
│  └──────────┘    │  (instant render)│    └───────┬────────┘  │
│                  └──────────────────┘            │            │
│                          │                       │ (async)    │
│                          ▼                       ▼            │
│                  ┌──────────────────┐    ┌────────────────┐  │
│                  │  React State     │◀───│  Realtime      │  │
│                  │  (departments[]) │    │  Channel       │  │
│                  └──────────────────┘    │  (1s debounce) │  │
│                          │               └────────────────┘  │
│                          ▼                       ▲            │
│                  ┌──────────────────┐    ┌────────────────┐  │
│                  │  Rendered UI     │    │  PostgreSQL    │  │
│                  │  (Kanban Board)  │    │  CDC Events    │  │
│                  └──────────────────┘    └────────────────┘  │
│                                                               │
│  On API failure:  Snapshot rollback ◀── Error handler         │
└───────────────────────────────────────────────────────────────┘
```

### 3-Tier Organizational Hierarchy

```
Department (Level 1)
  └── Board (Level 2)
        └── Agent / Employee (Level 3 — Kanban Column)
              └── Task (Kanban Card)
```

### Key Design Patterns Used

1. **Optimistic Updates with Snapshot Rollback** — State is mutated immediately; on API failure, previous state is restored from a captured snapshot.
2. **Realtime Event Reconciliation** — Incoming Supabase Realtime events are debounced (1s) and merged with local state, avoiding jitter during active drag-and-drop.
3. **Container/Presentational Split** — `App` manages all state and business logic; child components (`SortableTaskItem`, `SortableEmployeeCard`, etc.) are purely presentational with drag bindings.
4. **DragOverlay Pattern** — `@dnd-kit`'s `DragOverlay` renders a floating clone outside the normal DOM flow for smooth, hardware-accelerated dragging.
5. **Local Form State Decoupling** — Modal edit fields use local `useState` instead of root state, preventing full-board re-renders on every keystroke.
6. **Paginated Bulk Fetching** — Tasks are fetched in 1,000-row batches (`while(hasMore)` loop) to bypass Supabase's PostgREST response cap.
7. **Debounced Persistence** — Description edits auto-save on blur, not on every keystroke.

---

## ✨ Feature Breakdown

### 🏢 Multi-Department System
- Create, rename, and delete **unlimited departments**
- Each department can be **password-protected** with access codes
- Department sidebar with collapsible navigation, lock icons, and badge counters
- **Drag-and-drop reordering** of departments (admin mode only)
- Department positions persist to the database
- Per-department task stats with completion progress bars

### 📋 Multi-Board Kanban
- Each department supports **multiple boards** (e.g., "Sprint 1", "Marketing", "Bugs")
- **Draggable board tabs** with add/rename/delete controls
- Boards are independently ordered via drag-and-drop
- Each board contains its own isolated set of employee columns and tasks
- **Horizontal scroll navigation** with floating paddle buttons (`◀` `▶`)
- **Mouse wheel conversion** — vertical scroll over the board background converts to smooth horizontal scrolling (1.2x multiplier)

### 👥 Employee / Agent Columns
- Add employees to any board with **name**, **role**, and **avatar color** (8 color options)
- Each employee becomes a **vertical Kanban column** with their assigned tasks
- Employees can be **reordered horizontally** via drag-and-drop
- **Initials avatar** with custom background color
- **Task completion progress bar** per employee
- **8-hour workday productivity meter** with visual overtime indicator (amber glow + ⚡ badge)
- **Inline quick-task creation** input field at the bottom of each column
- Edit employee name, role, and color in-place
- Delete employees (cascades to their tasks)

### ✅ Task Management
- **Create tasks** with title, description, priority, due date, required time, tags, and screenshot
- **Inline editing** — click any field to edit, auto-saves on blur
- **Priority levels**: Low (blue), Medium (yellow), High (red) — with distinct color-coded pills
- **Status toggle**: Mark tasks complete/incomplete with a single click (`CheckCircle2`/`Circle`)
- **Due dates** displayed in `DD/MM/YY` format with a native calendar picker
- **Required time** tracking with smart human-readable parsing (minutes → hours → days → weeks)
- **Tag system** with searchable dropdown popover and distinct color-coded pills (Teal, Emerald, Amber, Rose)
- **Task relocation** — reassign tasks to any agent across any board/department via a search-enabled popover
- **Position ordering** via drag-and-drop within and across employee columns
- **Auto-link detection** in descriptions — URLs and emails become clickable links

### 🖱️ Drag & Drop (dnd-kit)
- **4 levels of drag-and-drop interaction**:
  - **Tasks** — drag between employee columns (cross-container transfer) and reorder within
  - **Employee columns** — drag to reorder horizontally on the board
  - **Board tabs** — drag-and-drop reordering in the tab bar
  - **Departments** — drag to reorder in the sidebar (admin mode)
- **DragOverlay** — smooth floating preview of the dragged element
- **Keyboard accessible** — full keyboard sensor support with `sortableKeyboardCoordinates`
- **Pointer activation** — 5–8px distance threshold prevents accidental drags on clicks
- **Hardware-accelerated** — uses CSS 3D transforms (`CSS.Transform.toString`)
- **Collision detection** — `closestCenter` and `closestCorners` strategies

### 📸 Screenshot / Image Attachments
- **Dual-mode attachment**:
  1. **File upload** — drag-and-drop dropzone or file picker (PNG, JPG, GIF, up to 5MB)
  2. **URL paste** — directly input an external image URL
- **Base64 encoding** — uploaded files converted via `FileReader.readAsDataURL` and stored in Supabase
- **Cover image** — attached images render as a cropped 112px header on the Kanban card
- **Full preview** — click the cover to view the full-resolution image in the task detail modal
- **Hover-to-delete** — overlay action to remove the screenshot

### 📂 Task Archival & History
- Completed tasks from **previous days** auto-archive during data fetch (`is_archived = true`)
- Tasks completed **today** remain visible on the active board for daily metric tracking
- **Slide-over history drawer** — accessible via a glassmorphic sidebar button with live badge count
- **Multi-filter history search** — filter by text, department, agent, date range, and priority
- **One-click restore** (`RotateCcw`) — unarchive any task back to the active Kanban board
- **Completion date tracking** — each task records the exact date it was marked done
- **Archive & Reports page** — full-screen admin view of all archived tasks in tabular format

### 📊 Analytics & Data Visualizations
All charts are **custom SVG implementations** — zero external charting libraries.

- **System Overview Radial Donut** — overall completion percentage across all departments
- **Completion Trend Area Chart** (`CompletionTrendChart`) — daily completed task count and tracked work hours over 7, 14, or 30 days with gradient fill, glowing data points, gridlines, and hover tooltips
- **Priority Distribution Donut Chart** (`PriorityDistributionChart`) — interactive segments for High (red), Medium (yellow), Low (blue) with hover scaling and breakdown badges
- **Department Comparison Bars** (`DepartmentBarChart`) — per-department workload breakdown: boards, agents, completed/pending tasks, completion rate, and total tracked hours
- **Top Agents Leaderboard** — ranks top 10 agents by completed tasks with **Overall vs. Daily** toggle and custom medals (#1 Gold glow, #2 Silver, #3 Bronze)
- **Per-employee rollup stats** — task counts, completion rates, and daily work hour aggregation

### 🔍 Search & Filtering
1. **Global navbar search** — searches across task titles, descriptions, tags, and agent names across all departments. Results show department → board → agent breadcrumbs; clicking navigates to the task.
2. **Board-level Kanban filters** — filter by Priority (All / High / Medium / Low) and Due Date (Any / Due Today / Overdue).
3. **History sidebar filters** — text search + department / agent / date range / priority dropdowns with one-click "Reset Filters".
4. **In-modal search** — tag selector popover and assignee selector popover both have search inputs.

### 📤 CSV / Excel Export & Custom Reports
- **Quick CSV export** (`downloadCSVReport`) — exports all tasks with sanitized, escaped values
- **Custom report generator modal** with:
  - Department filter (All or specific)
  - Agent filter (dynamically filtered by selected department)
  - Date range filter with quick presets: **All Time**, **Today**, **Last 7 Days**, **Last 30 Days**, **This Month**
  - Real-time KPI summary (Matching Tasks, Completed, Hours Tracked, Completion Rate)
  - Scrollable 50-row preview table before downloading
  - Dynamic file naming: `[Department]_[Agent]_Analytics_Report_[Date].csv`
- **Exported columns**: Task Title, Department, Board, Agent Name, Status, Priority, Required Time, Created Date, Completed Date

### 🔔 Browser Notifications & Reminder Engine
- **8-second periodic reminder checker** (`checkReminders`) — scans all active tasks against current `HH:MM` and `YYYY-MM-DD`
- **Web Audio API dual-tone chime** — synthesizes a warm acoustic chime (880 Hz A5 + 1109.73 Hz C#6) using native `AudioContext` oscillators — zero external audio files required
- **HTML5 Desktop Notifications** — fires native OS notifications with task title, assignee, board, and department context
- **Deep-linking from notifications** — clicking a desktop notification focuses the app and navigates to the exact department → board → task
- **Browser tab title flashing** — alternates `document.title` with `🔔 Reminder: [Task Title]` when the tab is backgrounded
- **In-app toast alerts** — glassmorphic floating toasts at bottom-right with pulsating indicator and 8-second animated drain bar
- **Permission management** — navbar badge shows notification permission status (Default / Blocked / Active)

### 🔗 Smart Link Detection
- Task descriptions **auto-detect URLs** (`http://`, `https://`, `www.`) and email addresses
- Detected links render as **clickable, styled anchors** with brand colors
- Links open in new tabs (`target="_blank"`, `rel="noopener noreferrer"`)
- **Edit/View mode toggle** — click description to edit raw text, blur to render parsed links

### ⏱️ Workload & 8-Hour Productivity Tracking
- **Smart time parser** (`parseTimeToHours`) — converts human-readable strings to decimal hours:
  - `"30 min"` → 0.5h, `"2 hours"` → 2h, `"1 day"` → 8h, `"1 week"` → 40h
- **Per-agent daily work meter** — visual progress bar relative to 8-hour workday
- **Overtime indicator** — when tracked hours exceed 8h, the bar turns amber with a pulsating glow and ⚡ badge
- **Human-readable formatter** (`formatHoursToHuman`) — `1.5` → `"1 hr, 30 min"`

### 🎨 UI / UX Design
- **Glassmorphism design system** — `backdrop-blur-xl`, translucent surfaces (`bg-white/5`), glowing borders (`border-white/10`)
- **Deep space dark theme** — custom midnight navy palette (`#03071b`, `#0b193c`) with radial gradient backgrounds
- **Animated floating orbs** — `.bg-orb` elements with 20-second `drift` keyframe animation for ambient depth
- **Animated splash screen** — plays `/LEX_ANI_LOGO.mp4` in a glowing circular viewport with synchronized playback progress bar, brand title reveal, and smooth scale/fade exit. Shows only once per session (`sessionStorage`)
- **Custom scrollbars** — thin, brand-blue themed with glow effects on hover and active states
- **Outfit font family** — premium typography with weights 300–800
- **Micro-animations** — hover glows, button glow shadows, transition easing throughout
- **Responsive layout** — mobile-friendly sidebar collapse, adaptive grid, touch-friendly interactions

### 🔐 Admin Mode
- **Master access code** (configurable, default: `334`) for administrative operations
- Admin operations include:
  - Creating, editing, and deleting Departments, Boards, and Agents
  - Reordering Departments and Boards via drag-and-drop
  - Managing department password protection
  - Accessing the full **Analytics Dashboard**
  - Accessing the **Archive & Reports** management page
  - Full CRUD on all entities

### 🛡 Anti-DevTools Client Protection
- Disables right-click context menus (`contextmenu` event prevention)
- Blocks DevTools keyboard shortcuts (`F12`, `Ctrl+Shift+I`, `Ctrl+Shift+J`, `Ctrl+Shift+C`, `Ctrl+U`)

---

## 💾 Database Schema

### Entity Relationship Diagram

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│ departments  │  1:N  │   boards     │  1:N  │   agents     │  1:N  │    tasks     │
├──────────────┤ ────▶ ├──────────────┤ ────▶ ├──────────────┤ ────▶ ├──────────────┤
│ id (PK, uuid)│       │ id (PK, uuid)│       │ id (PK, uuid)│       │ id (PK, uuid)│
│ name         │       │ department_id│       │ board_id     │       │ agent_id     │
│ has_password │       │ name         │       │ name         │       │ title        │
│ position     │       │ position     │       │ role         │       │ description  │
│ created_at   │       │ created_at   │       │ color        │       │ completed    │
└──────┬───────┘       └──────────────┘       │ position     │       │ priority     │
       │ 1:1                                   │ created_at   │       │ due_date     │
       ▼                                       └──────────────┘       │ reminder_time│
┌──────────────────┐                                                  │ tag          │
│ dept_credentials │                                                  │ required_time│
├──────────────────┤                                                  │ screenshot_url│
│ department_id(PK)│ ── FK → departments.id                          │ position     │
│ password         │                                                  │ completed_date│
└──────────────────┘                                                  │ is_archived  │
  RLS: ENABLED                                                        │ created_at   │
  Public policies: NONE                                               └──────────────┘
  (Fully private table)
```

### Base Migration SQL

```sql
-- 1. Departments
CREATE TABLE departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  has_password boolean DEFAULT false,
  position int DEFAULT 0,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

-- 2. Boards
CREATE TABLE boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid REFERENCES departments(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  position int DEFAULT 0,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

-- 3. Agents (Employees)
CREATE TABLE agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid REFERENCES boards(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  role text,
  color text,
  position int DEFAULT 0,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

-- 4. Tasks
CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  completed boolean DEFAULT false,
  priority text DEFAULT 'Medium',
  due_date text,
  reminder_time text,
  tag text DEFAULT 'Undefined',
  screenshot_url text,
  required_time text,
  position int DEFAULT 0,
  completed_date text,
  is_archived boolean DEFAULT false,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

-- 5. Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE departments, boards, agents, tasks;
```

### Performance Indexes

```sql
CREATE INDEX IF NOT EXISTS idx_boards_department_id ON boards(department_id);
CREATE INDEX IF NOT EXISTS idx_agents_board_id ON agents(board_id);
CREATE INDEX IF NOT EXISTS idx_tasks_agent_id ON tasks(agent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_is_archived ON tasks(is_archived);
CREATE INDEX IF NOT EXISTS idx_tasks_completed_date ON tasks(completed_date);
```

---

## 🔒 Security & Hardening

### Credential Isolation Architecture

Plaintext department passwords are **never stored in the public-facing `departments` table**. Instead:

1. A separate `department_credentials` table stores passwords, with **RLS enabled and zero public policies** (fully private — no SELECT, INSERT, UPDATE, or DELETE from the client).
2. The public `departments` table only exposes a `has_password` boolean flag.
3. All password operations go through `SECURITY DEFINER` PostgreSQL functions that execute with elevated privileges on the database side — the client never directly reads or writes credentials.

### Server-Side RPC Functions

| Function | Signature | Purpose |
|----------|-----------|---------|
| `verify_department_password` | `(dept_id uuid, input_password text) → boolean` | Validates password entirely server-side; returns only `true`/`false` |
| `update_department` | `(dept_id uuid, name text, password text, change_password boolean) → void` | Atomic department update with optional password creation/removal |
| `create_department_with_password` | `(name text, password text) → uuid` | Creates department and securely inserts credential in one transaction |

### Row Level Security (RLS)

All five tables have RLS enabled:

| Table | RLS Policies |
|-------|-------------|
| `departments` | Full public read/write (data is non-sensitive after password removal) |
| `boards` | Full public read/write |
| `agents` | Full public read/write |
| `tasks` | Full public read/write |
| `department_credentials` | **Zero policies** — completely private, accessible only via RPC |

---

## ⚡ Performance Optimizations

| Technique | Implementation | Impact |
|-----------|---------------|--------|
| **Memoized Calculations** | `useMemo` on `allFlattenedTasks`, `allEmployees`, `topAgents`, `completedTasks`, `filteredCompletedTasks`, `trendData`, `priorityCounts`, `availableAgents`, `filteredReportTasks` | Prevents expensive recalculation of derived datasets on every render |
| **Stable Callbacks** | `useCallback` on event handlers passed to child components | Prevents unnecessary child re-renders due to new function references |
| **Local Form State Decoupling** | Modal edit fields (`localTitle`, `localDescription`, etc.) use local `useState` instead of root state | Eliminates full-board re-renders on every keystroke during editing |
| **Debounced Realtime** | 1-second `setTimeout` debounce on Supabase Realtime change events | Prevents re-render thrashing during rapid drag-and-drop operations |
| **Hardware-Accelerated Dragging** | CSS 3D transforms via `CSS.Transform.toString(transform)` | GPU-accelerated drag animations without layout thrashing |
| **Paginated Bulk Queries** | `while(hasMore)` loop fetching 1,000-row batches via `.range()` | Full dataset retrieval regardless of Supabase's PostgREST response cap |
| **Pointer Activation Threshold** | 5–8px distance before drag activates | Prevents accidental drags on click interactions |
| **Session-Gated Splash** | `sessionStorage('lextria_splash_shown')` check | Splash screen plays only once per session, not on every route change |

---

## 📁 Project Structure

```
Lextria_Task-Dashboard/
├── public/
│   ├── favicon.svg                  # Custom SVG favicon
│   ├── icons.svg                    # SVG icon sprites
│   ├── logo.png                     # Lextria brand logo
│   └── LEX_ANI_LOGO.mp4            # Animated splash screen video
│
├── src/
│   ├── main.jsx                     # Entry point: ErrorBoundary + Vercel Analytics + StrictMode
│   ├── App.jsx                      # Main application (~4,500 lines — all components & logic)
│   ├── App.css                      # Legacy/base component styles
│   ├── index.css                    # Tailwind @theme config, glassmorphism utils, animations
│   ├── supabaseClient.js            # Supabase client initialization
│   └── assets/                      # Static assets (hero.png, react.svg, vite.svg)
│
├── supabase_security_migration.sql  # Security hardening: indexes, RLS, credential isolation, RPCs
├── supabase_tasks_archive_migration.sql  # Task archival columns & indexes
│
├── index.html                       # HTML shell with SEO meta, Google Fonts (Outfit)
├── vite.config.js                   # Vite + React + Tailwind CSS v4 plugin config
├── package.json                     # Dependencies and npm scripts
├── eslint.config.js                 # ESLint configuration
├── LEX_ANI_LOGO.mp4                 # Splash screen video (root copy)
└── .gitignore
```

### Key Components (inside App.jsx)

| Component | Lines | Purpose |
|-----------|-------|---------|
| `SortableTaskItem` | 142–217 | Draggable task card with priority pills, screenshot cover, status toggle, and drag handle |
| `SortableEmployeeCard` | 221–414 | Draggable employee column with avatar, role, progress bar, productivity meter, inline task creation, and task list |
| `CompletionTrendChart` | 500–667 | Interactive SVG area/line chart for daily completion trends (7D / 14D / 30D) with hover tooltips |
| `DepartmentBarChart` | 669–769 | Department workload comparison bars with boards, agents, tasks, and hours breakdown |
| `PriorityDistributionChart` | 771–860 | Interactive SVG donut chart for task priority distribution with hover effects |
| `AnalyticsDashboard` | 863–1432 | Full analytics suite: radial donut, trend chart, priority chart, department bars, leaderboard, and CSV report generator |
| `SortableDepartment` | 1435–1541 | Draggable department card for sidebar navigation with stats and admin actions |
| `SortableBoard` | 1543–1636 | Draggable board card for board-level navigation with agent/task stats |
| `SplashScreen` | 1640–1693 | Animated intro splash with video playback, progress bar, and session gating |
| `App` | 1696–4458 | Root component: all state management, Supabase subscriptions, CRUD, modals, search, notifications, and layout |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x
- A **Supabase** project ([free tier works](https://supabase.com))

### 1. Clone & Install

```bash
git clone https://github.com/Prats0404/Lextria-Task-Manager.git
cd Lextria-Task-Manager
npm install
```

### 2. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Run the **Base Migration SQL** (above) in the Supabase SQL Editor
3. Run `supabase_security_migration.sql` for security hardening, RLS, and RPC functions
4. Run `supabase_tasks_archive_migration.sql` for archival features
5. Enable **Realtime** for all four tables (`departments`, `boards`, `agents`, `tasks`)

### 3. Configure Environment

Update `src/supabaseClient.js` with your Supabase credentials:

```js
const supabaseUrl = 'https://YOUR_PROJECT.supabase.co';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';
```

> **Production Tip**: Use environment variables via a `.env` file:
> ```env
> VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
> VITE_SUPABASE_ANON_KEY=your-anon-key
> ```
> Then in `supabaseClient.js`:
> ```js
> const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
> const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
> ```

### 4. Run Development Server

```bash
npm run dev
```

App available at `http://localhost:5173`

### 5. Build for Production

```bash
npm run build     # Outputs to /dist
npm run preview   # Preview the production build locally
```

---

## 🚢 Deployment

### Vercel (Recommended)

1. Push your repository to GitHub
2. Import the project in [Vercel Dashboard](https://vercel.com)
3. Set environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) in Vercel settings
4. Deploy — Vercel auto-detects Vite and configures the build

The project includes `@vercel/analytics` for automatic performance and Core Web Vitals monitoring.

---

## 📝 Resume Bullet Points

> Copy-paste ready bullet points for your resume:

- **Engineered a real-time collaborative Kanban dashboard** using React 19, Supabase Realtime (PostgreSQL CDC), and Tailwind CSS 4, enabling multi-department task management with live cross-user synchronization and zero-latency optimistic UI updates with automatic rollback.

- **Implemented 4-level drag-and-drop interactions** using `@dnd-kit` with cross-container task transfers, employee column reordering, board tab sorting, and department ordering — all with keyboard accessibility, DragOverlay animations, and instant database persistence.

- **Designed a secure credential architecture** by isolating department passwords into a private PostgreSQL table with zero RLS public policies, accessed exclusively through `SECURITY DEFINER` RPC functions — eliminating all client-side credential exposure.

- **Built custom SVG analytics visualizations** including area/line charts with gradient fills and hover tooltips, interactive donut charts, department comparison bars, and a Top 10 agent leaderboard — all without external charting libraries.

- **Developed a reminder engine** with 8-second periodic task scanning, Web Audio API synthesized dual-tone chimes (no audio files), HTML5 desktop notifications with deep-linking navigation, and browser tab title flashing for backgrounded alerts.

- **Implemented task archival system** with automatic daily completion archiving, multi-filter history drawer (text/department/agent/date/priority), one-click restore, and custom CSV report generator with date-range presets, KPI preview, and computed analytics columns.

- **Optimized React performance** for a 4,500-line single-component architecture using `useMemo` for 9 derived datasets, `useCallback` for stable handlers, local form state decoupling, 1-second debounced Realtime events, and paginated 1,000-row batch queries.

- **Crafted a premium glassmorphism UI** featuring an animated video splash screen, floating gradient orbs with keyframe animations, translucent glass containers with `backdrop-blur`, custom scrollbars, and the Outfit font family — fully responsive across devices.

---

## 🔮 Future Scope

- [ ] **Component decomposition** — modularize the 4,500-line `App.jsx` into feature-based components
- [ ] **User authentication** — integrate Supabase Auth with email/OAuth providers
- [ ] **Role-based access control** — Admin, Manager, and Viewer roles with scoped permissions
- [ ] **Activity audit log** — track all task changes with user attribution and timestamps
- [ ] **Mobile-native app** — React Native or PWA implementation
- [ ] **Dark/Light theme toggle** — user-selectable theme preference
- [ ] **Webhook integrations** — Slack, Discord, and email notification channels
- [ ] **Rich file attachments** — PDFs, documents, and multi-file uploads beyond screenshots
- [ ] **Gantt chart / timeline view** — alternative task visualization by time
- [ ] **API rate limiting** — request throttling and abuse prevention
- [ ] **Offline-first support** — service worker caching and sync queue
- [ ] **i18n / localization** — multi-language support

---

## 👤 Author

**Prathvi** — [GitHub](https://github.com/Prats0404)

---

<p align="center">
  Built with ❤️ using React, Supabase, and Tailwind CSS
</p>
