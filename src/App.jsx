import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import {
  DndContext,
  closestCenter,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Search, Shield, Plus, Trash2, Edit2, CheckCircle2, Circle,
  Bell, Calendar, X, Lock, Unlock, AlertCircle, GripVertical, GripHorizontal, Building2, Layout, Users, ChevronRight, ArrowLeft
} from 'lucide-react';

// --- INITIAL DATA & UTILS ---
const defaultData = [
  {
    id: 'dept-1',
    name: 'General',
    boards: [
      {
        id: 'board-1',
        name: 'Main Board',
        employees: []
      }
    ]
  }
];

const avatarColors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'];
const generateId = () => Math.random().toString(36).substr(2, 9);
function getInitials(name) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
}

// --- SORTABLE TASK ITEM ---
function SortableTaskItem({ task, employeeId, updateTask, deleteTask, onTaskClick }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'Task', task, employeeId }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative bg-white/5 border border-white/10 rounded-lg p-3 flex flex-col gap-2 transition-all hover:bg-white/10 ${task.completed ? 'opacity-50' : ''}`}
    >
      <div className="flex items-start gap-2">
        <div {...attributes} {...listeners} className="mt-0.5 cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300 touch-none">
          <GripVertical size={16} />
        </div>
        <button onClick={() => updateTask(employeeId, task.id, { completed: !task.completed })} className={`mt-0.5 flex-shrink-0 transition-colors ${task.completed ? 'text-brand-400' : 'text-slate-400 hover:text-brand-300'}`}>
          {task.completed ? <CheckCircle2 size={16} /> : <Circle size={16} />}
        </button>
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onTaskClick(employeeId, task.id)}>
          <p className={`text-sm font-medium truncate ${task.completed ? 'line-through text-slate-400' : 'text-slate-200'}`}>
            {task.title}
          </p>
        </div>
        <button onClick={() => deleteTask(employeeId, task.id)} className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all p-1">
          <Trash2 size={14} />
        </button>
      </div>
      
      <div className="flex flex-wrap items-center gap-2 pl-8">
        <span className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
          task.priority === 'High' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
          task.priority === 'Medium' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
          'bg-green-500/20 text-green-400 border-green-500/30'
        }`}>
          {task.priority}
        </span>
        {task.dueDate && <span className="text-[10px] text-slate-400 flex items-center gap-1 bg-white/5 px-1.5 py-0.5 rounded"><Calendar size={10}/> {task.dueDate}</span>}
        {task.reminderTime && <span className="text-[10px] text-slate-400 flex items-center gap-1 bg-white/5 px-1.5 py-0.5 rounded"><Bell size={10} className="text-brand-400"/> {task.reminderTime}</span>}
      </div>
    </div>
  );
}

// --- SORTABLE EMPLOYEE CARD (KANBAN COLUMN) ---
function SortableEmployeeCard({ employee, isAdmin, onDelete, onEdit, updateTask, deleteTask, addTask, onTaskClick }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: employee.id,
    data: { type: 'Employee', employee }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const tasksCompleted = employee.tasks.filter(t => t.completed).length;
  const totalTasks = employee.tasks.length;
  const progress = totalTasks === 0 ? 0 : Math.round((tasksCompleted / totalTasks) * 100);

  const sortedTasks = [...employee.tasks].sort((a, b) => {
    if (a.completed && !b.completed) return 1;
    if (!a.completed && b.completed) return -1;
    if (!a.completed && !b.completed) {
      const pVals = { High: 3, Medium: 2, Low: 1 };
      return (pVals[b.priority] || 0) - (pVals[a.priority] || 0);
    }
    return 0;
  });

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`glass-card flex flex-col w-[320px] flex-shrink-0 max-h-full transition-all duration-300 rounded-2xl overflow-hidden ${isDragging ? 'shadow-[0_0_30px_rgba(124,58,237,0.5)]' : ''}`}
    >
      <div className="p-4 bg-white/5 border-b border-white/10 relative group">
        <div {...attributes} {...listeners} className="absolute top-2 left-2 cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300">
           <GripHorizontal size={16} />
        </div>
        <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(employee)} className="p-1.5 rounded-md hover:bg-white/10 text-slate-300 hover:text-white transition-colors">
            <Edit2 size={12} />
          </button>
          {isAdmin && (
            <button onClick={() => onDelete(employee.id)} className="p-1.5 rounded-md hover:bg-red-500/20 text-slate-300 hover:text-red-400 transition-colors">
              <Trash2 size={12} />
            </button>
          )}
        </div>
        <div className="flex items-center space-x-3 mt-3">
          <div className={`w-10 h-10 rounded-full ${employee.color} flex items-center justify-center text-sm font-bold shadow-lg flex-shrink-0`}>
            {getInitials(employee.name)}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-base truncate text-white">{employee.name}</h3>
            <p className="text-slate-400 text-xs truncate">{employee.role}</p>
          </div>
        </div>
        <div className="mt-3">
          <div className="w-full bg-slate-800/50 rounded-full h-1.5">
            <div className="bg-brand-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-hide min-h-[150px]">
        <SortableContext items={sortedTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {sortedTasks.map(task => (
            <SortableTaskItem 
              key={task.id} 
              task={task} 
              employeeId={employee.id} 
              updateTask={updateTask} 
              deleteTask={deleteTask} 
              onTaskClick={onTaskClick}
            />
          ))}
        </SortableContext>
      </div>

      <div className="p-3 border-t border-white/10 bg-black/20">
        <button 
          onClick={() => addTask(employee.id)}
          className="w-full py-2 flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
        >
          <Plus size={16} /> Add Task
        </button>
      </div>
    </div>
  );
}

// --- MAIN APP COMPONENT ---
export default function App() {
  const [departments, setDepartments] = useState([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  
  // Navigation State
  const [selectedDeptId, setSelectedDeptId] = useState(null);
  const [selectedBoardId, setSelectedBoardId] = useState(null);
  const [unlockedDepartments, setUnlockedDepartments] = useState([]);
  const [deptToUnlock, setDeptToUnlock] = useState(null);
  const [deptUnlockPassword, setDeptUnlockPassword] = useState('');
  const [deptUnlockError, setDeptUnlockError] = useState(false);

  // Modal States
  const [showAddDeptModal, setShowAddDeptModal] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [departmentToDelete, setDepartmentToDelete] = useState(null);

  const [showAddBoardModal, setShowAddBoardModal] = useState(false);
  const [editingBoard, setEditingBoard] = useState(null);
  const [boardToDelete, setBoardToDelete] = useState(null);

  const [showAddEmpModal, setShowAddEmpModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  
  const [selectedTaskDetails, setSelectedTaskDetails] = useState(null);
  const [activeDragItem, setActiveDragItem] = useState(null);

  // Supabase Fetch & Realtime
  const fetchData = async () => {
    const { data: deptData } = await supabase.from('departments').select('*').order('created_at', { ascending: true });
    const { data: boardData } = await supabase.from('boards').select('*').order('created_at', { ascending: true });
    const { data: agentData } = await supabase.from('agents').select('*').order('created_at', { ascending: true });
    const { data: taskData } = await supabase.from('tasks').select('*').order('created_at', { ascending: true });

    if (deptData) {
      const nested = deptData.map(d => ({
        ...d,
        boards: (boardData || []).filter(b => b.department_id === d.id).map(b => ({
          ...b,
          employees: (agentData || []).filter(a => a.board_id === b.id).map(a => ({
            ...a,
            tasks: (taskData || []).filter(t => t.agent_id === a.id)
          }))
        }))
      }));
      setDepartments(nested);
    }
  };

  useEffect(() => {
    fetchData();

    const channel = supabase.channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // --- ADMIN ACTIONS ---
  const toggleAdmin = () => {
    if (isAdmin) {
      setIsAdmin(false);
    } else {
      setShowAdminModal(true);
    }
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminPassword === 'Lextria@334') {
      setIsAdmin(true);
      setShowAdminModal(false);
      setAdminPassword('');
    } else {
      alert('Incorrect Password');
    }
  };

  // --- CRUD DEPARTMENTS ---
  const handleAddDept = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const name = formData.get('name');
    const password = formData.get('password') || '';
    if (editingDepartment) {
      await supabase.from('departments').update({ name, password }).eq('id', editingDepartment.id);
    } else {
      await supabase.from('departments').insert([{ name, password }]);
    }
    setShowAddDeptModal(false);
    setEditingDepartment(null);
  };

  // --- CRUD BOARDS ---
  const handleAddBoard = async (e) => {
    e.preventDefault();
    const name = new FormData(e.target).get('name');
    if (editingBoard) {
      await supabase.from('boards').update({ name }).eq('id', editingBoard.id);
    } else {
      await supabase.from('boards').insert([{ department_id: selectedDeptId, name }]);
    }
    setShowAddBoardModal(false);
    setEditingBoard(null);
  };

  // --- CRUD AGENTS ---
  const handleAddOrEditEmployee = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const name = formData.get('name');
    const role = formData.get('role');
    const color = formData.get('color');

    if (editingEmployee) {
      await supabase.from('agents').update({ name, role, color }).eq('id', editingEmployee.id);
    } else {
      await supabase.from('agents').insert([{ board_id: selectedBoardId, name, role, color }]);
    }
    setShowAddEmpModal(false);
    setEditingEmployee(null);
  };

  const deleteEmployee = async (empId) => {
    // Optimistic
    setDepartments(departments.map(d => d.id === selectedDeptId ? {
      ...d,
      boards: d.boards.map(b => b.id === selectedBoardId ? {
        ...b,
        employees: b.employees.filter(e => e.id !== empId)
      } : b)
    } : d));
    await supabase.from('agents').delete().eq('id', empId);
  };

  // --- TASK ACTIONS ---
  const addTask = async (empId) => {
    await supabase.from('tasks').insert([{ agent_id: empId, title: 'New Task' }]);
  };

  const updateTask = async (empId, taskId, updates) => {
    // Optimistic
    setDepartments(departments.map(d => d.id === selectedDeptId ? {
      ...d,
      boards: d.boards.map(b => b.id === selectedBoardId ? {
        ...b,
        employees: b.employees.map(e => e.id === empId ? {
          ...e, tasks: e.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t)
        } : e)
      } : b)
    } : d));
    
    // API
    const dbUpdates = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.completed !== undefined) dbUpdates.completed = updates.completed;
    if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
    if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
    if (updates.reminderTime !== undefined) dbUpdates.reminder_time = updates.reminderTime;
    
    await supabase.from('tasks').update(dbUpdates).eq('id', taskId);
  };

  const deleteTask = async (empId, taskId) => {
    // Optimistic
    setDepartments(departments.map(d => d.id === selectedDeptId ? {
      ...d,
      boards: d.boards.map(b => b.id === selectedBoardId ? {
        ...b,
        employees: b.employees.map(e => e.id === empId ? {
          ...e, tasks: e.tasks.filter(t => t.id !== taskId)
        } : e)
      } : b)
    } : d));
    await supabase.from('tasks').delete().eq('id', taskId);
  };

  // --- DRAG AND DROP HANDLERS ---
  const handleDragStart = (event) => {
    const { active } = event;
    setActiveDragItem(active.data.current);
  };

  const handleDragOver = (event) => {
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (!activeData || !overData) return;

    if (activeData.type === 'Task') {
      const activeEmpId = activeData.employeeId;
      const overEmpId = overData.type === 'Task' ? overData.employeeId : overData.type === 'Employee' ? overData.employee.id : null;
      
      if (!overEmpId || activeEmpId === overEmpId) return;

      setDepartments(prev => {
        const next = JSON.parse(JSON.stringify(prev));
        const dept = next.find(d => d.id === selectedDeptId);
        const board = dept.boards.find(b => b.id === selectedBoardId);

        let srcEmp, destEmp;
        board.employees.forEach(e => {
          if (e.id === activeEmpId) srcEmp = e;
          if (e.id === overEmpId) destEmp = e;
        });

        const taskIndex = srcEmp.tasks.findIndex(t => t.id === active.id);
        const [task] = srcEmp.tasks.splice(taskIndex, 1);

        if (overData.type === 'Task') {
          const overIndex = destEmp.tasks.findIndex(t => t.id === over.id);
          const isBelowOverItem = over && active.rect.current.translated && active.rect.current.translated.top > over.rect.top + over.rect.height;
          const modifier = isBelowOverItem ? 1 : 0;
          destEmp.tasks.splice(overIndex >= 0 ? overIndex + modifier : destEmp.tasks.length, 0, task);
        } else {
          destEmp.tasks.push(task);
        }
        
        active.data.current.employeeId = overEmpId;
        
        // Supabase async update (fire and forget)
        supabase.from('tasks').update({ agent_id: overEmpId }).eq('id', task.id).then();
        
        return next;
      });
    }
  };

  const handleDragEnd = (event) => {
    setActiveDragItem(null);
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (activeData.type === 'Task' && overData.type === 'Task' && activeData.employeeId === overData.employeeId) {
      if (active.id !== over.id) {
        setDepartments(prev => {
          const next = JSON.parse(JSON.stringify(prev));
          const dept = next.find(d => d.id === selectedDeptId);
          const board = dept.boards.find(b => b.id === selectedBoardId);
          let emp = board.employees.find(e => e.id === activeData.employeeId);
          const oldIndex = emp.tasks.findIndex(t => t.id === active.id);
          const newIndex = emp.tasks.findIndex(t => t.id === over.id);
          emp.tasks = arrayMove(emp.tasks, oldIndex, newIndex);
          return next;
        });
      }
    }

    if (activeData.type === 'Employee' && overData.type === 'Employee') {
      if (active.id !== over.id) {
        setDepartments(prev => {
          const next = JSON.parse(JSON.stringify(prev));
          const dept = next.find(d => d.id === selectedDeptId);
          const board = dept.boards.find(b => b.id === selectedBoardId);
          const oldIndex = board.employees.findIndex(e => e.id === active.id);
          const newIndex = board.employees.findIndex(e => e.id === over.id);
          board.employees = arrayMove(board.employees, oldIndex, newIndex);
          return next;
        });
      }
    }
  };

  // --- RENDER HELPERS ---
  const currentDept = selectedDeptId ? departments.find(d => d.id === selectedDeptId) : null;
  const currentBoard = currentDept && selectedBoardId ? currentDept.boards.find(b => b.id === selectedBoardId) : null;

  const activeTaskDetails = useMemo(() => {
    if (!selectedTaskDetails || !currentBoard) return null;
    const { empId, taskId } = selectedTaskDetails;
    const emp = currentBoard.employees.find(e => e.id === empId);
    if (!emp) return null;
    const task = emp.tasks.find(t => t.id === taskId);
    if (!task) return null;
    return { emp, task };
  }, [selectedTaskDetails, currentBoard]);

  return (
    <div className="relative min-h-screen text-slate-100 overflow-x-hidden font-sans">
      {/* Background Orbs */}
      <div className="bg-orb bg-brand-600/30 w-[500px] h-[500px] top-[-100px] left-[-100px]" />
      <div className="bg-orb bg-accent-500/20 w-[400px] h-[400px] bottom-[10%] right-[-50px]" style={{ animationDelay: '-5s' }} />
      <div className="bg-orb bg-brand-400/20 w-[600px] h-[600px] top-[40%] left-[30%]" style={{ animationDelay: '-10s' }} />

      {/* Navbar */}
      <nav className="glass-card rounded-none border-t-0 border-x-0 border-b-white/10 px-6 py-4 sticky top-0 z-40 backdrop-blur-2xl bg-[#0a0a1a]/70">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3 whitespace-nowrap">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/30 text-white font-bold text-xl">
              ⚡
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              Lextria Task Manager
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            <button onClick={toggleAdmin} className={`p-2.5 rounded-xl transition-all ${isAdmin ? 'bg-brand-500/20 text-brand-300 shadow-[0_0_15px_rgba(124,58,237,0.3)]' : 'hover:bg-white/10 text-slate-300'}`} title="Admin Controls">
              {isAdmin ? <Unlock size={20} /> : <Lock size={20} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Breadcrumbs Navigation */}
      <div className="max-w-7xl mx-auto px-6 pt-6">
        <div className="flex items-center space-x-2 text-sm text-slate-400">
          <button 
            onClick={() => { setSelectedDeptId(null); setSelectedBoardId(null); }}
            className={`hover:text-white transition-colors ${!selectedDeptId ? 'text-brand-400 font-semibold' : ''}`}
          >
            Departments
          </button>
          
          {currentDept && (
            <>
              <ChevronRight size={14} className="text-slate-600" />
              <button 
                onClick={() => setSelectedBoardId(null)}
                className={`hover:text-white transition-colors flex items-center gap-1 ${selectedDeptId && !selectedBoardId ? 'text-brand-400 font-semibold' : ''}`}
              >
                <Building2 size={12} /> {currentDept.name}
              </button>
            </>
          )}

          {currentBoard && (
            <>
              <ChevronRight size={14} className="text-slate-600" />
              <span className="text-brand-400 font-semibold flex items-center gap-1">
                <Layout size={12} /> {currentBoard.name}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto px-6 py-6">
        
        {/* LEVEL 1: DEPARTMENTS LIST */}
        {!selectedDeptId && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-2"><Building2 className="text-brand-400"/> Select a Department</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {departments.map(dept => (
                <div 
                  key={dept.id} 
                  className="glass-card p-6 rounded-2xl hover:bg-white/10 transition-all cursor-pointer group flex flex-col justify-between min-h-[160px]"
                  onClick={() => {
                    if (isAdmin || !dept.password || unlockedDepartments.includes(dept.id)) {
                      setSelectedDeptId(dept.id);
                    } else {
                      setDeptToUnlock(dept);
                      setDeptUnlockPassword('');
                      setDeptUnlockError(false);
                    }
                  }}
                >
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2 flex items-center justify-between">
                      {dept.name}
                      {dept.password && <Lock size={16} className="text-slate-500" title="Password Protected" />}
                    </h3>
                    <p className="text-slate-400 text-sm">{dept.boards.length} Boards</p>
                  </div>
                  <div className="flex justify-end gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isAdmin && (
                      <>
                        <button onClick={(e) => { e.stopPropagation(); setEditingDepartment(dept); setShowAddDeptModal(true); }} className="p-2 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white"><Edit2 size={16}/></button>
                        <button onClick={(e) => { e.stopPropagation(); setDepartmentToDelete(dept); }} className="p-2 hover:bg-red-500/20 rounded-lg text-slate-300 hover:text-red-400"><Trash2 size={16}/></button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {departments.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-500 border-2 border-dashed border-white/10 rounded-2xl">
                  No departments found. Add one to get started.
                </div>
              )}
            </div>
          </div>
        )}

        {/* LEVEL 2: BOARDS LIST */}
        {selectedDeptId && !selectedBoardId && currentDept && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Layout className="text-brand-400"/> Boards in {currentDept.name}</h2>
              <button onClick={() => setSelectedDeptId(null)} className="glass-button text-sm py-2 px-4 flex items-center gap-2"><ArrowLeft size={16}/> Back</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {currentDept.boards.map(board => (
                <div 
                  key={board.id} 
                  className="glass-card p-6 rounded-2xl hover:bg-white/10 transition-all cursor-pointer group flex flex-col justify-between min-h-[160px]"
                  onClick={() => setSelectedBoardId(board.id)}
                >
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">{board.name}</h3>
                    <p className="text-slate-400 text-sm flex items-center gap-1"><Users size={14}/> {board.employees.length} Agents</p>
                  </div>
                  <div className="flex justify-end gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isAdmin && (
                      <>
                        <button onClick={(e) => { e.stopPropagation(); setEditingBoard(board); setShowAddBoardModal(true); }} className="p-2 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white"><Edit2 size={16}/></button>
                        <button onClick={(e) => { e.stopPropagation(); setBoardToDelete(board); }} className="p-2 hover:bg-red-500/20 rounded-lg text-slate-300 hover:text-red-400"><Trash2 size={16}/></button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {currentDept.boards.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-500 border-2 border-dashed border-white/10 rounded-2xl">
                  No boards found in this department.
                </div>
              )}
            </div>
          </div>
        )}

        {/* LEVEL 3: AGENTS KANBAN VIEW */}
        {selectedBoardId && currentBoard && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300 h-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Users className="text-brand-400"/> Agents: {currentBoard.name}</h2>
              <button onClick={() => setSelectedBoardId(null)} className="glass-button text-sm py-2 px-4 flex items-center gap-2"><ArrowLeft size={16}/> Back</button>
            </div>
            
            <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-hide items-stretch min-h-[500px]">
              <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
                <SortableContext items={currentBoard.employees.map(e => e.id)} strategy={horizontalListSortingStrategy}>
                  {currentBoard.employees.map(emp => (
                    <SortableEmployeeCard
                      key={emp.id}
                      employee={emp}
                      isAdmin={isAdmin}
                      onDelete={deleteEmployee}
                      onEdit={(emp) => { setEditingEmployee(emp); setShowAddEmpModal(true); }}
                      updateTask={updateTask}
                      deleteTask={deleteTask}
                      addTask={addTask}
                      onTaskClick={(empId, taskId) => setSelectedTaskDetails({ empId, taskId })}
                    />
                  ))}
                </SortableContext>
                {currentBoard.employees.length === 0 && (
                  <div className="w-[320px] flex-shrink-0 border-2 border-dashed border-white/10 rounded-2xl flex items-center justify-center text-slate-500 p-6 text-center">
                    No agents on this board. Add one to get started.
                  </div>
                )}
                <DragOverlay dropAnimation={defaultDropAnimationSideEffects({ duration: 250 })}>
                  {activeDragItem?.type === 'Task' && (
                    <SortableTaskItem task={activeDragItem.task} employeeId={activeDragItem.employeeId} updateTask={()=>{}} deleteTask={()=>{}} onTaskClick={()=>{}} />
                  )}
                  {activeDragItem?.type === 'Employee' && (
                    <SortableEmployeeCard employee={activeDragItem.employee} isAdmin={isAdmin} onDelete={()=>{}} onEdit={()=>{}} updateTask={()=>{}} deleteTask={()=>{}} addTask={()=>{}} onTaskClick={()=>{}} />
                  )}
                </DragOverlay>
              </DndContext>
            </div>
          </div>
        )}

      </main>

      {/* Contextual Floating Action Button */}
      <button
        onClick={() => {
          if (!selectedDeptId) {
            setEditingDepartment(null); setShowAddDeptModal(true);
          } else if (selectedDeptId && !selectedBoardId) {
            setEditingBoard(null); setShowAddBoardModal(true);
          } else if (selectedBoardId) {
            setEditingEmployee(null); setShowAddEmpModal(true);
          }
        }}
        className="fixed bottom-8 right-8 w-14 h-14 bg-brand-600 hover:bg-brand-500 rounded-full flex items-center justify-center text-white shadow-[0_0_20px_rgba(124,58,237,0.6)] hover:shadow-[0_0_30px_rgba(124,58,237,0.8)] transition-all z-30 hover:scale-110"
        title={!selectedDeptId ? "Add Department" : !selectedBoardId ? "Add Board" : "Add Agent"}
      >
        <Plus size={28} />
      </button>

      {/* --- MODALS --- */}
      
      {/* Admin Login Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-sm p-6 relative animate-in fade-in zoom-in duration-200">
            <button onClick={() => setShowAdminModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X size={20} /></button>
            <h2 className="text-xl font-bold mb-4 text-white flex items-center gap-2"><Lock size={20} className="text-brand-400"/> Admin Access</h2>
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="Enter admin password" className="glass-input w-full text-center" autoFocus />
              <button type="submit" className="glass-button w-full">Unlock</button>
            </form>
          </div>
        </div>
      )}

      {/* Department Login Modal */}
      {deptToUnlock && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-sm p-6 relative animate-in fade-in zoom-in duration-200">
            <button onClick={() => setDeptToUnlock(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X size={20} /></button>
            <h2 className="text-xl font-bold mb-4 text-white flex items-center gap-2"><Lock size={20} className="text-brand-400"/> Department Access</h2>
            <p className="text-slate-400 text-sm mb-4">Enter the password to access {deptToUnlock.name}.</p>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (deptUnlockPassword === deptToUnlock.password) {
                setUnlockedDepartments([...unlockedDepartments, deptToUnlock.id]);
                setSelectedDeptId(deptToUnlock.id);
                setDeptToUnlock(null);
              } else {
                setDeptUnlockError(true);
              }
            }} className="space-y-4">
              <input type="password" value={deptUnlockPassword} onChange={(e) => { setDeptUnlockPassword(e.target.value); setDeptUnlockError(false); }} placeholder="Password" className={`glass-input w-full text-center tracking-widest ${deptUnlockError ? 'border-red-500 focus:ring-red-500' : ''}`} autoFocus />
              {deptUnlockError && <p className="text-red-400 text-xs text-center">Incorrect password.</p>}
              <button type="submit" className="glass-button w-full">Unlock</button>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Department Modal */}
      {showAddDeptModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200">
            <button onClick={() => setShowAddDeptModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X size={20} /></button>
            <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-2"><Building2 className="text-brand-400"/> {editingDepartment ? 'Edit Department' : 'Add Department'}</h2>
            <form onSubmit={handleAddDept} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Department Name</label>
                <input name="name" defaultValue={editingDepartment?.name} required className="glass-input w-full" placeholder="e.g. Engineering" autoFocus />
              </div>
              {isAdmin && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Access Password (Optional)</label>
                  <input type="password" name="password" defaultValue={editingDepartment?.password || ''} className="glass-input w-full" placeholder="Leave empty for public access" />
                </div>
              )}
              <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={() => setShowAddDeptModal(false)} className="px-4 py-2 rounded-lg text-slate-300 hover:bg-white/5 transition-colors">Cancel</button>
                <button type="submit" className="glass-button">{editingDepartment ? 'Save Changes' : 'Create Department'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Department Modal */}
      {departmentToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200 border border-red-500/30">
            <h2 className="text-xl font-bold mb-4 text-white flex items-center gap-2"><Trash2 className="text-red-400" size={24}/> Delete Department</h2>
            <p className="text-slate-300 mb-6">Are you sure you want to delete <strong className="text-white">{departmentToDelete.name}</strong>? All boards and agents will be lost.</p>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setDepartmentToDelete(null)} className="px-4 py-2 rounded-lg text-slate-300 hover:bg-white/5">Cancel</button>
              <button onClick={async () => {
                const id = departmentToDelete.id;
                setDepartmentToDelete(null);
                await supabase.from('departments').delete().eq('id', id);
              }} className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Board Modal */}
      {showAddBoardModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200">
            <button onClick={() => setShowAddBoardModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X size={20} /></button>
            <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-2"><Layout className="text-brand-400"/> {editingBoard ? 'Edit Board' : 'Add Board'}</h2>
            <form onSubmit={handleAddBoard} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Board Name</label>
                <input name="name" defaultValue={editingBoard?.name} required className="glass-input w-full" placeholder="e.g. Q3 Sprint" autoFocus />
              </div>
              <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={() => setShowAddBoardModal(false)} className="px-4 py-2 rounded-lg text-slate-300 hover:bg-white/5 transition-colors">Cancel</button>
                <button type="submit" className="glass-button">{editingBoard ? 'Save Changes' : 'Create Board'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Board Modal */}
      {boardToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200 border border-red-500/30">
            <h2 className="text-xl font-bold mb-4 text-white flex items-center gap-2"><Trash2 className="text-red-400" size={24}/> Delete Board</h2>
            <p className="text-slate-300 mb-6">Are you sure you want to delete <strong className="text-white">{boardToDelete.name}</strong>? All agents and tasks inside will be lost.</p>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setBoardToDelete(null)} className="px-4 py-2 rounded-lg text-slate-300 hover:bg-white/5">Cancel</button>
              <button onClick={async () => {
                const id = boardToDelete.id;
                setBoardToDelete(null);
                await supabase.from('boards').delete().eq('id', id);
              }} className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Agent Modal */}
      {showAddEmpModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200">
            <button onClick={() => setShowAddEmpModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X size={20} /></button>
            <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-2"><Users className="text-brand-400"/> {editingEmployee ? 'Edit Agent' : 'Add Agent'}</h2>
            <form onSubmit={handleAddOrEditEmployee} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Full Name</label>
                <input name="name" required defaultValue={editingEmployee?.name} className="glass-input w-full" placeholder="e.g. John Doe" autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Role / Specialization</label>
                <input name="role" required defaultValue={editingEmployee?.role} className="glass-input w-full" placeholder="e.g. Frontend Dev" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Avatar Color</label>
                <div className="flex space-x-3">
                  {avatarColors.map(c => (
                    <label key={c} className="cursor-pointer relative">
                      <input type="radio" name="color" value={c} defaultChecked={editingEmployee ? editingEmployee.color === c : c === avatarColors[0]} className="peer sr-only" />
                      <div className={`w-8 h-8 rounded-full ${c} peer-checked:ring-2 peer-checked:ring-white peer-checked:ring-offset-2 peer-checked:ring-offset-[#1a0a2e] transition-all`}></div>
                    </label>
                  ))}
                </div>
              </div>
              <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={() => setShowAddEmpModal(false)} className="px-4 py-2 rounded-lg text-slate-300 hover:bg-white/5 transition-colors">Cancel</button>
                <button type="submit" className="glass-button">{editingEmployee ? 'Save Changes' : 'Create Agent'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Details Modal */}
      {activeTaskDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedTaskDetails(null)} />
          <div className="glass-card relative w-full max-w-2xl bg-[#120a21]/95 backdrop-blur-xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col animate-in fade-in zoom-in duration-200 max-h-[90vh]">
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/5 rounded-t-2xl">
              <h2 className="text-xl font-bold text-white">Task Details</h2>
              <button onClick={() => setSelectedTaskDetails(null)} className="text-slate-400 hover:text-white bg-white/5 p-2 rounded-full hover:bg-white/10 transition-colors"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                 <label className="text-xs text-slate-400 uppercase tracking-wider mb-2 block">Assigned To</label>
                 <div className="flex items-center space-x-3 bg-white/5 p-3 rounded-lg border border-white/10">
                    <div className={`w-8 h-8 rounded-full ${activeTaskDetails.emp.color} flex items-center justify-center text-xs font-bold`}>{getInitials(activeTaskDetails.emp.name)}</div>
                    <div>
                      <p className="text-sm text-white font-medium">{activeTaskDetails.emp.name}</p>
                      <p className="text-xs text-slate-400">{currentBoard.name}</p>
                    </div>
                 </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-wider mb-2 block">Task Title</label>
                <textarea 
                  value={activeTaskDetails.task.title}
                  onChange={(e) => updateTask(activeTaskDetails.emp.id, activeTaskDetails.task.id, { title: e.target.value })}
                  className="glass-input w-full min-h-[120px] resize-none text-base"
                />
              </div>
              <div className="flex items-center justify-between bg-white/5 p-4 rounded-lg border border-white/10">
                 <span className="text-sm text-slate-300 font-medium">Status</span>
                 <button 
                  onClick={() => updateTask(activeTaskDetails.emp.id, activeTaskDetails.task.id, { completed: !activeTaskDetails.task.completed })}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTaskDetails.task.completed ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-300'}`}
                 >
                   {activeTaskDetails.task.completed ? <CheckCircle2 size={16}/> : <Circle size={16}/>}
                   {activeTaskDetails.task.completed ? 'Completed' : 'Incomplete'}
                 </button>
              </div>
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-wider mb-2 block">Priority</label>
                <div className="flex gap-2">
                  {['Low', 'Medium', 'High'].map(p => (
                    <button
                      key={p}
                      onClick={() => updateTask(activeTaskDetails.emp.id, activeTaskDetails.task.id, { priority: p })}
                      className={`flex-1 py-2 rounded-lg text-sm transition-all border ${
                        activeTaskDetails.task.priority === p 
                        ? (p === 'High' ? 'bg-red-500/20 text-red-400 border-red-500/50' : p === 'Medium' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' : 'bg-green-500/20 text-green-400 border-green-500/50')
                        : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pb-4">
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1"><Calendar size={12}/> Due Date</label>
                  <input type="date" className="glass-input w-full text-sm" value={activeTaskDetails.task.dueDate || ''} onChange={(e) => updateTask(activeTaskDetails.emp.id, activeTaskDetails.task.id, { dueDate: e.target.value })}/>
                </div>
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1"><Bell size={12}/> Reminder</label>
                  <input type="time" className="glass-input w-full text-sm" value={activeTaskDetails.task.reminderTime || ''} onChange={(e) => updateTask(activeTaskDetails.emp.id, activeTaskDetails.task.id, { reminderTime: e.target.value })}/>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
