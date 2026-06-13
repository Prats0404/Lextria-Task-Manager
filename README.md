# 🌌 Lextria Task Manager
> A state-of-the-art, glassmorphic real-time Kanban dashboard engineered for ultimate team synchronization and zero-latency performance.

---

## 🚀 Key Architectural Strengths

### ⚡ Zero-Lag Optimistic UI
Every single addition, deletion, and status change triggers instant, local React state rendering before hitting the network database. If a database query fails, the system automatically runs a graceful rollback, ensuring a buttery-smooth 0ms-latency typing and editing experience.

### 🔄 PostgreSQL Realtime Channels
Leverages Supabase Realtime Channels to push instantaneous database modifications to all active user dashboards. Every ticket move, rename, and screenshot upload is synced live across the team.

### 🧪 Elegant Glassmorphism Aesthetic
Features a deep-space dark background themed with customized HSL glowing gradients, absolute glass containers (`backdrop-blur-xl`), micro-animations, custom scroll scrollbar isolations, and a neat user interface.

---

## 🛠️ Feature Breakdown

### 📋 Interactive Kanban Board
- **Draggable Cards & Columns**: Drag-and-drop tasks between employee columns, and reorder employee columns on the board using `@dnd-kit`.
- **Card scroll isolation**: Mouse wheel scrolling directly over task lists scrolls vertically, while scrolling over the board background scrolls horizontally.
- **Admin Reordering**: Administrators can log in (default code: `334`) and permanently reorder departments and boards via drag-and-drop.

### 📸 Optional 'Add Screenshot' Feature
- **Base64 Storage Pattern**: Local files uploaded via the dashed dropzone are read using `FileReader` and stored directly as Base64 strings. Direct paste of web URLs is also supported.
- **Visual Card Headers**: Attached screenshots automatically render as beautifully cropped `112px` height headers at the top of Kanban cards. Clicking the cover launches the details modal.
- **Optional Layout**: If no screenshot is attached, the task card retains its original compact visual layout.

### 🗄️ Completed Task History Drawer
- **Clean Active Columns**: Checking off a task smoothly fades it off the active employee's Kanban list, keeping the active board highly focused on current tasks.
- **Completed Badge & Sidebar**: Access the completed tasks drawer via a glassmorphic `History` button containing a live badge count.
- **One-Click Restore**: Uncheck or click the restore arrow next to any completed task in the search-filtered list to put it back onto the active board.

### 🔗 Auto-Detecting URL Links
- **Description View/Edit Modes**: Clicking inside the task description triggers a full-textarea edit mode (auto-saved on blur). Outside of edit mode, the field parses raw URLs, email addresses, and `www.` domains as clickable, highlighted anchor links.
- **New Tab Safe Routing**: Clicking links routes users to a new tab (`target="_blank"`), keeping the main dashboard open.

### 🏷️ Trident-Style Duration Tags
- **Searchable Tag popover**: Select task durations (Under 5m, 15m, 30m, 45m, or Undefined) inside a customized Trident Mail styled popover. 
- **Distinct Color Coding**: Pill badges map dynamically to custom colors (Teal, Emerald, Amber, and Rose) on the Kanban task card.

### 📅 Due Date & Reminders
- **DD/MM/YY Formatting**: Stored internally as standard database strings, but displayed as a modern `DD/MM/YY` format on Kanban cards.
- **Dynamic Browser Notifications**: Prompts permissions for native browser reminders when task alerts trigger.

---

## 💾 Database Schema

Run the following migration in your **Supabase SQL Editor**:

```sql
-- 1. Create the Departments table
CREATE TABLE departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  password text,
  position int DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create the Boards table
CREATE TABLE boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid REFERENCES departments(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  position int DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create the Agents (Employees) table
CREATE TABLE agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid REFERENCES boards(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  role text,
  color text,
  position int DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create the Tasks table
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
  position int DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Enable Realtime Publications
ALTER PUBLICATION supabase_realtime ADD TABLE departments, boards, agents, tasks;
```

---

## ⚙️ Local Development

### 1. Clone & Install
```bash
# Clone the repository
git clone https://github.com/Prats0404/Lextria-Task-Manager.git

# Navigate to the workspace
cd Lextria-Task-Manager

# Install dependencies
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. Run Dev Server
```bash
npm run dev
```

### 4. Build Production Bundle
```bash
npm run build
```
