import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Bell, Calendar, X, Lock, Unlock, AlertCircle, GripVertical, GripHorizontal, Building2, Layout, Users, ChevronRight, ChevronLeft, ArrowLeft, History, RotateCcw, Tag
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
function formatDateToDDMMYY(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parts[0].substring(2); // '26'
    const month = parts[1]; // '05'
    const day = parts[2]; // '26'
    return `${day}/${month}/${year}`;
  }
  return dateStr;
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
        {task.tag && task.tag !== 'Undefined' && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded border flex items-center gap-1 font-medium transition-colors ${
            task.tag === 'Under 5 min' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' :
            task.tag === 'Under 15 min' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
            task.tag === 'Under 30 min' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
            task.tag === 'Under 45 min' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
            'bg-slate-500/20 text-slate-300 border-slate-500/30'
          }`}>
            <Tag size={10} /> {task.tag}
          </span>
        )}
        {task.dueDate && <span className="text-[10px] text-slate-400 flex items-center gap-1 bg-white/5 px-1.5 py-0.5 rounded"><Calendar size={10}/> {formatDateToDDMMYY(task.dueDate)}</span>}
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

  const activeTasks = employee.tasks.filter(t => !t.completed);

  const sortedTasks = [...activeTasks].sort((a, b) => {
    const pVals = { High: 3, Medium: 2, Low: 1 };
    return (pVals[b.priority] || 0) - (pVals[a.priority] || 0);
  });

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`glass-card flex flex-col w-[320px] h-[580px] flex-shrink-0 transition-all duration-300 rounded-2xl overflow-hidden ${isDragging ? 'shadow-[0_0_30px_rgba(124,58,237,0.5)]' : ''}`}
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
          <div className="flex justify-between items-center text-[10px] uppercase tracking-wider text-slate-400 mb-1">
            <span>Tasks Progress</span>
            <span className="font-semibold text-brand-400">{tasksCompleted}/{totalTasks} ({progress}%)</span>
          </div>
          <div className="w-full bg-slate-800/50 rounded-full h-1.5">
            <div className="bg-brand-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar min-h-[150px]">
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

// --- TASK COMPILATION HELPERS ---
const getDeptTaskStats = (dept) => {
  let total = 0;
  let completed = 0;
  dept.boards?.forEach(board => {
    board.employees?.forEach(emp => {
      emp.tasks?.forEach(task => {
        total++;
        if (task.completed) {
          completed++;
        }
      });
    });
  });
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { total, completed, pct };
};

const getBoardTaskStats = (board) => {
  let total = 0;
  let completed = 0;
  board.employees?.forEach(emp => {
    emp.tasks?.forEach(task => {
      total++;
      if (task.completed) {
        completed++;
      }
    });
  });
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { total, completed, pct };
};

// --- SORTABLE DEPARTMENTS & BOARDS COMPONENTS ---
function SortableDepartment({
  dept,
  isAdmin,
  unlockedDepartments,
  setSelectedDeptId,
  setDeptToUnlock,
  setDeptUnlockPassword,
  setDeptUnlockError,
  setEditingDepartment,
  setShowAddDeptModal,
  setDepartmentToDelete,
  getDeptTaskStats,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: dept.id, disabled: !isAdmin });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`glass-card p-6 rounded-2xl hover:bg-white/10 transition-all group flex flex-col justify-between min-h-[160px] relative select-none ${
        isAdmin ? 'cursor-grab active:cursor-grabbing border-brand-500/10 hover:border-brand-500/30' : 'cursor-pointer'
      } ${isDragging ? 'border-brand-500 bg-white/10 ring-2 ring-brand-500/50 scale-[1.02] shadow-xl' : ''}`}
      onClick={(e) => {
        if (e.target.closest('button')) return;
        if (isAdmin || !dept.has_password || unlockedDepartments.includes(dept.id)) {
          setSelectedDeptId(dept.id);
        } else {
          setDeptToUnlock(dept);
          setDeptUnlockPassword('');
          setDeptUnlockError(false);
        }
      }}
    >
      <div>
        <h3 className="text-xl font-bold text-white mb-2 flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 overflow-hidden text-ellipsis">
            {isAdmin && <GripVertical className="text-slate-500/50 group-hover:text-slate-300 w-4 h-4 shrink-0" />}
            <span className="truncate">{dept.name}</span>
          </span>
          {dept.has_password && <Lock size={16} className="text-slate-500 shrink-0" title="Password Protected" />}
        </h3>
        <div className="flex items-center justify-between text-slate-400 text-xs mb-3">
          <span>{dept.boards?.length || 0} Boards</span>
          {(() => {
            const stats = getDeptTaskStats(dept);
            if (stats.total > 0) {
              return <span className="font-semibold text-brand-400">{stats.completed}/{stats.total} ({stats.pct}%)</span>;
            }
            return <span>0 Tasks</span>;
          })()}
        </div>
        {(() => {
          const stats = getDeptTaskStats(dept);
          if (stats.total > 0) {
            return (
              <div className="w-full bg-slate-800/50 rounded-full h-1">
                <div className="bg-brand-500 h-1 rounded-full transition-all duration-500" style={{ width: `${stats.pct}%` }} />
              </div>
            );
          }
          return null;
        })()}
      </div>
      <div className="flex justify-end gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
        {isAdmin && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditingDepartment(dept);
                setShowAddDeptModal(true);
              }}
              className="p-2 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white"
            >
              <Edit2 size={16} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDepartmentToDelete(dept);
              }}
              className="p-2 hover:bg-red-500/20 rounded-lg text-slate-300 hover:text-red-400"
            >
              <Trash2 size={16} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function SortableBoard({
  board,
  isAdmin,
  setSelectedBoardId,
  setEditingBoard,
  setShowAddBoardModal,
  setBoardToDelete,
  getBoardTaskStats,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: board.id, disabled: !isAdmin });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`glass-card p-6 rounded-2xl hover:bg-white/10 transition-all group flex flex-col justify-between min-h-[160px] relative select-none ${
        isAdmin ? 'cursor-grab active:cursor-grabbing border-brand-500/10 hover:border-brand-500/30' : 'cursor-pointer'
      } ${isDragging ? 'border-brand-500 bg-white/10 ring-2 ring-brand-500/50 scale-[1.02] shadow-xl' : ''}`}
      onClick={(e) => {
        if (e.target.closest('button')) return;
        setSelectedBoardId(board.id);
      }}
    >
      <div>
        <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2 overflow-hidden text-ellipsis">
          {isAdmin && <GripVertical className="text-slate-500/50 group-hover:text-slate-300 w-4 h-4 shrink-0" />}
          <span className="truncate">{board.name}</span>
        </h3>
        <div className="flex items-center justify-between text-slate-400 text-xs mb-3">
          <span className="flex items-center gap-1"><Users size={12}/> {board.employees?.length || 0} Agents</span>
          {(() => {
            const stats = getBoardTaskStats(board);
            if (stats.total > 0) {
              return <span className="font-semibold text-brand-400">{stats.completed}/{stats.total} ({stats.pct}%)</span>;
            }
            return <span>0 Tasks</span>;
          })()}
        </div>
        {(() => {
          const stats = getBoardTaskStats(board);
          if (stats.total > 0) {
            return (
              <div className="w-full bg-slate-800/50 rounded-full h-1">
                <div className="bg-brand-500 h-1 rounded-full transition-all duration-500" style={{ width: `${stats.pct}%` }} />
              </div>
            );
          }
          return null;
        })()}
      </div>
      <div className="flex justify-end gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
        {isAdmin && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditingBoard(board);
                setShowAddBoardModal(true);
              }}
              className="p-2 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white"
            >
              <Edit2 size={16} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setBoardToDelete(board);
              }}
              className="p-2 hover:bg-red-500/20 rounded-lg text-slate-300 hover:text-red-400"
            >
              <Trash2 size={16} />
            </button>
          </>
        )}
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

  // Local states for the task details editor to ensure buttery-smooth typing & inputting without network lag
  const [localTitle, setLocalTitle] = useState('');
  const [localDescription, setLocalDescription] = useState('');
  const [localDueDate, setLocalDueDate] = useState('');
  const [localReminderTime, setLocalReminderTime] = useState('');
  const [showHistorySidebar, setShowHistorySidebar] = useState(false);
  const [searchHistoryQuery, setSearchHistoryQuery] = useState('');
  const [showTagPopover, setShowTagPopover] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState('');

  // Dynamic toast reminder states & checker
  const [notifications, setNotifications] = useState([]);
  const triggeredRemindersRef = useRef({}); // Format: { [taskId]: 'YYYY-MM-DD' }
  const titleFlashIntervalRef = useRef(null);

  const [notificationPermission, setNotificationPermission] = useState('default');

  // Track and synchronize desktop notification permission state on mount
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const requestNotificationPermission = () => {
    if (!('Notification' in window)) {
      alert('This browser does not support desktop notifications.');
      return;
    }
    
    Notification.requestPermission().then(permission => {
      setNotificationPermission(permission);
      if (permission === 'granted') {
        playNotificationSound();
        try {
          new Notification('🔔 Lextria Alerts Active!', {
            body: 'You will now receive task reminders in this browser.',
            icon: window.location.origin + '/favicon.svg'
          });
        } catch (e) {
          console.warn('Test notification dispatch failed:', e);
        }
      }
    }).catch(err => {
      console.error('Permission request failed:', err);
    });
  };

  const dismissNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const playNotificationSound = () => {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      const playChimeNode = (freq, startTime, duration) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.12, startTime + 0.02); // 12% pleasant volume
        gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
        
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      const now = ctx.currentTime;
      // High-end futuristic warm double-chime chime
      playChimeNode(880, now, 0.15); // A5 note
      playChimeNode(1109.73, now + 0.08, 0.3); // C#6 note
    } catch (error) {
      console.warn('AudioContext playback failed', error);
    }
  };

  // Tab Title Flashing Logic
  const startTitleFlash = (taskTitle) => {
    if (titleFlashIntervalRef.current) clearInterval(titleFlashIntervalRef.current);
    
    let isOriginal = false;
    document.title = `🔔 Reminder: ${taskTitle}`;
    
    titleFlashIntervalRef.current = setInterval(() => {
      document.title = isOriginal ? `🔔 Reminder: ${taskTitle}` : 'Lextria Task Dashboard - Premium Office Task Management';
      isOriginal = !isOriginal;
    }, 1200);
  };

  const stopTitleFlash = () => {
    if (titleFlashIntervalRef.current) {
      clearInterval(titleFlashIntervalRef.current);
      titleFlashIntervalRef.current = null;
    }
    document.title = 'Lextria Task Dashboard - Premium Office Task Management';
  };

  // Stop flashing when tab is visible / window is focused
  useEffect(() => {
    const handleFocus = () => {
      stopTitleFlash();
    };
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        stopTitleFlash();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (titleFlashIntervalRef.current) clearInterval(titleFlashIntervalRef.current);
    };
  }, []);

  const triggerNotification = (task, emp, board, dept) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newNotif = {
      id,
      taskTitle: task.title,
      employeeName: emp.name,
      boardName: board.name,
      time: task.reminderTime
    };

    setNotifications(prev => [...prev, newNotif]);

    // Play default synthesized premium chime sound
    playNotificationSound();

    // If tab is in the background or minimized, trigger HTML5 native desktop notifications & tab title flashing
    if (document.hidden || !document.hasFocus()) {
      startTitleFlash(task.title);

      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          const options = {
            body: `Assigned to ${emp.name} in ${board.name} (${dept.name}).`,
            icon: window.location.origin + '/favicon.svg',
            tag: task.id,
            requireInteraction: true // Keep open until actioned
          };
          
          const nativeNotification = new Notification(`🔔 Task Reminder: ${task.title}`, options);
          
          nativeNotification.onclick = () => {
            window.focus();
            // Deep-link to task details
            setSelectedDeptId(dept.id);
            setSelectedBoardId(board.id);
            setSelectedTaskDetails({ empId: emp.id, taskId: task.id });
            nativeNotification.close();
            stopTitleFlash();
          };
        } catch (e) {
          console.warn('Native Notification failed to initialize:', e);
        }
      }
    }

    // Auto-remove toast after 8 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 8000);
  };

  const checkReminders = () => {
    const now = new Date();
    
    // YYYY-MM-DD
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;
    
    // HH:MM
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${hours}:${minutes}`;

    departments.forEach(dept => {
      dept.boards?.forEach(board => {
        board.employees?.forEach(emp => {
          emp.tasks?.forEach(task => {
            if (task.reminderTime) {
              const taskReminder = task.reminderTime.trim().substring(0, 5); // HH:MM
              
              if (taskReminder === currentTimeStr) {
                // If it has a due date, check if due date matches today
                const isDueToday = !task.dueDate || task.dueDate === todayStr;
                
                if (isDueToday) {
                  const alreadyTriggered = triggeredRemindersRef.current[task.id] === todayStr;
                  
                  if (!alreadyTriggered) {
                    triggeredRemindersRef.current[task.id] = todayStr;
                    triggerNotification(task, emp, board, dept);
                  }
                }
              }
            }
          });
        });
      });
    });
  };

  // Run reminder checker on load and tick every 8 seconds
  useEffect(() => {
    if (departments.length === 0) return;
    
    checkReminders();
    const interval = setInterval(checkReminders, 8000);
    return () => clearInterval(interval);
  }, [departments]);

  // Scrollbar and wheel scroll states & helpers
  const boardContainerRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = boardContainerRef.current;
    if (el) {
      const { scrollLeft, scrollWidth, clientWidth } = el;
      setCanScrollLeft(scrollLeft > 5);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5);
    }
  };

  useEffect(() => {
    if (selectedBoardId) {
      const timer = setTimeout(checkScroll, 150);
      return () => clearTimeout(timer);
    }
  }, [selectedBoardId, departments]);

  useEffect(() => {
    const el = boardContainerRef.current;
    if (el) {
      const handleWheel = (e) => {
        // If scrolling inside an element that is scrollable vertically, let it scroll naturally
        const scrollableChild = e.target.closest('.custom-scrollbar');
        if (scrollableChild && scrollableChild.scrollHeight > scrollableChild.clientHeight) {
          return;
        }

        if (el.scrollWidth > el.clientWidth) {
          if (e.deltaY !== 0) {
            e.preventDefault();
            // Scroll direct. The browser's native/CSS scroll-behavior smooths this interaction!
            el.scrollLeft += e.deltaY * 1.2;
          }
        }
      };

      el.addEventListener('scroll', checkScroll);
      el.addEventListener('wheel', handleWheel, { passive: false });
      window.addEventListener('resize', checkScroll);
      checkScroll();

      // Check again shortly to allow DOM elements to fully settle
      const timer = setTimeout(checkScroll, 200);

      return () => {
        el.removeEventListener('scroll', checkScroll);
        el.removeEventListener('wheel', handleWheel);
        window.removeEventListener('resize', checkScroll);
        clearTimeout(timer);
      };
    }
  }, [selectedBoardId, departments]);

  // Supabase Fetch & Realtime
  const fetchData = async () => {
    const { data: deptData } = await supabase.from('departments').select('*').order('position', { ascending: true }).order('created_at', { ascending: true });
    const { data: boardData } = await supabase.from('boards').select('*').order('position', { ascending: true }).order('created_at', { ascending: true });
    const { data: agentData } = await supabase.from('agents').select('*').order('position', { ascending: true }).order('created_at', { ascending: true });
    const { data: taskData } = await supabase.from('tasks').select('*').order('position', { ascending: true }).order('created_at', { ascending: true });

    if (deptData) {
      const nested = deptData.map(d => ({
        ...d,
        boards: (boardData || []).filter(b => b.department_id === d.id).map(b => ({
          ...b,
          employees: (agentData || []).filter(a => a.board_id === b.id).map(a => ({
            ...a,
            tasks: (taskData || []).filter(t => t.agent_id === a.id).map(t => ({
              ...t,
              dueDate: t.due_date,
              reminderTime: t.reminder_time
            }))
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
    if (adminPassword === '334') {
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
      const removePassword = formData.get('remove_password') === 'on';
      let changePassword = false;
      let newPassword = '';
      if (removePassword) {
        changePassword = true;
        newPassword = '';
      } else if (password !== '') {
        changePassword = true;
        newPassword = password;
      }
      await supabase.rpc('update_department', {
        dept_id: editingDepartment.id,
        dept_name: name,
        input_password: newPassword,
        change_password: changePassword
      });
    } else {
      await supabase.rpc('create_department_with_password', {
        dept_name: name,
        input_password: password
      });
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
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.completed !== undefined) dbUpdates.completed = updates.completed;
    if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
    if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
    if (updates.tag !== undefined) dbUpdates.tag = updates.tag;
    if (updates.reminderTime !== undefined) {
      dbUpdates.reminder_time = updates.reminderTime;
      // Reset reminder trigger state so if user sets it to the current time, it triggers immediately
      if (triggeredRemindersRef.current) {
        delete triggeredRemindersRef.current[taskId];
      }
    }
    
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
          const updatedTasks = arrayMove(emp.tasks, oldIndex, newIndex);
          emp.tasks = updatedTasks;

          // Asynchronously update positions in Supabase
          updatedTasks.forEach((t, index) => {
            supabase.from('tasks').update({ position: index }).eq('id', t.id).then();
          });

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
          const updatedEmployees = arrayMove(board.employees, oldIndex, newIndex);
          board.employees = updatedEmployees;

          // Asynchronously save the new custom position order to Supabase
          updatedEmployees.forEach((emp, index) => {
            supabase.from('agents').update({ position: index }).eq('id', emp.id).then();
          });

          return next;
        });
      }
    }
  };

  const handleDepartmentDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setDepartments(prev => {
      const oldIndex = prev.findIndex(d => d.id === active.id);
      const newIndex = prev.findIndex(d => d.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;

      const updatedDepts = arrayMove(prev, oldIndex, newIndex);

      // Asynchronously update position in Supabase
      updatedDepts.forEach((dept, index) => {
        supabase.from('departments').update({ position: index }).eq('id', dept.id).then();
      });

      return updatedDepts;
    });
  };

  const handleBoardDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setDepartments(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const dept = next.find(d => d.id === selectedDeptId);
      if (!dept) return prev;

      const oldIndex = dept.boards.findIndex(b => b.id === active.id);
      const newIndex = dept.boards.findIndex(b => b.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;

      const updatedBoards = arrayMove(dept.boards, oldIndex, newIndex);
      dept.boards = updatedBoards;

      // Asynchronously update position in Supabase
      updatedBoards.forEach((board, index) => {
        supabase.from('boards').update({ position: index }).eq('id', board.id).then();
      });

      return next;
    });
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

  const completedTasks = useMemo(() => {
    if (!currentBoard) return [];
    const list = [];
    currentBoard.employees?.forEach(emp => {
      emp.tasks?.forEach(task => {
        if (task.completed) {
          list.push({ task, emp });
        }
      });
    });
    // Sort in reverse chronological order (latest created at the top)
    return list.sort((a, b) => new Date(b.task.created_at || 0) - new Date(a.task.created_at || 0));
  }, [currentBoard]);

  const filteredCompletedTasks = useMemo(() => {
    if (!searchHistoryQuery.trim()) return completedTasks;
    const query = searchHistoryQuery.toLowerCase();
    return completedTasks.filter(({ task, emp }) => 
      task.title.toLowerCase().includes(query) || 
      (task.description && task.description.toLowerCase().includes(query)) ||
      emp.name.toLowerCase().includes(query)
    );
  }, [completedTasks, searchHistoryQuery]);

  // Synchronize local modal editor state when the selected task changes
  useEffect(() => {
    if (activeTaskDetails) {
      setLocalTitle(activeTaskDetails.task.title || '');
      setLocalDescription(activeTaskDetails.task.description || '');
      setLocalDueDate(activeTaskDetails.task.dueDate || '');
      setLocalReminderTime(activeTaskDetails.task.reminderTime || '');
      setShowTagPopover(false);
      setTagSearchQuery('');
    } else {
      setLocalTitle('');
      setLocalDescription('');
      setLocalDueDate('');
      setLocalReminderTime('');
      setShowTagPopover(false);
      setTagSearchQuery('');
    }
  }, [activeTaskDetails?.task.id]);

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
            <img 
              src="/logo.png" 
              alt="Lextria Logo" 
              className="w-10 h-10 rounded-full object-cover shadow-lg border border-white/15"
            />
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              Lextria Task Manager
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            {notificationPermission === 'default' && (
              <button 
                onClick={requestNotificationPermission} 
                className="flex items-center gap-2 text-xs font-semibold bg-brand-500/20 text-brand-300 border border-brand-500/30 px-3 py-1.5 rounded-xl hover:bg-brand-500/30 transition-all shadow-[0_0_10px_rgba(124,58,237,0.15)] hover:shadow-[0_0_15px_rgba(124,58,237,0.3)] animate-pulse"
              >
                <Bell size={14} /> Enable Desktop Alerts
              </button>
            )}
            
            {notificationPermission === 'denied' && (
              <span 
                className="flex items-center gap-1.5 text-[11px] font-medium bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-1 rounded-xl cursor-help"
                title="Notifications blocked. Please enable them in your browser site settings to receive reminders in other tabs."
              >
                <AlertCircle size={12} /> Alerts Blocked
              </span>
            )}

            {notificationPermission === 'granted' && (
              <span 
                className="flex items-center gap-1.5 text-[11px] font-medium bg-green-500/10 text-green-400 border border-green-500/20 px-2.5 py-1 rounded-xl cursor-default"
                title="Desktop alerts are active!"
              >
                <CheckCircle2 size={12} /> Alerts Active
              </span>
            )}

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
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDepartmentDragEnd}>
              <SortableContext items={departments.map(d => d.id)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {departments.map(dept => (
                    <SortableDepartment
                      key={dept.id}
                      dept={dept}
                      isAdmin={isAdmin}
                      unlockedDepartments={unlockedDepartments}
                      setSelectedDeptId={setSelectedDeptId}
                      setDeptToUnlock={setDeptToUnlock}
                      setDeptUnlockPassword={setDeptUnlockPassword}
                      setDeptUnlockError={setDeptUnlockError}
                      setEditingDepartment={setEditingDepartment}
                      setShowAddDeptModal={setShowAddDeptModal}
                      setDepartmentToDelete={setDepartmentToDelete}
                      getDeptTaskStats={getDeptTaskStats}
                    />
                  ))}
                  {departments.length === 0 && (
                    <div className="col-span-full py-12 text-center text-slate-500 border-2 border-dashed border-white/10 rounded-2xl">
                      No departments found. Add one to get started.
                    </div>
                  )}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )}

        {/* LEVEL 2: BOARDS LIST */}
        {selectedDeptId && !selectedBoardId && currentDept && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Layout className="text-brand-400"/> Boards in {currentDept.name}</h2>
              <button onClick={() => setSelectedDeptId(null)} className="glass-button text-sm py-2 px-4 flex items-center gap-2"><ArrowLeft size={16}/> Back</button>
            </div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleBoardDragEnd}>
              <SortableContext items={currentDept.boards.map(b => b.id)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {currentDept.boards.map(board => (
                    <SortableBoard
                      key={board.id}
                      board={board}
                      isAdmin={isAdmin}
                      setSelectedBoardId={setSelectedBoardId}
                      setEditingBoard={setEditingBoard}
                      setShowAddBoardModal={setShowAddBoardModal}
                      setBoardToDelete={setBoardToDelete}
                      getBoardTaskStats={getBoardTaskStats}
                    />
                  ))}
                  {currentDept.boards.length === 0 && (
                    <div className="col-span-full py-12 text-center text-slate-500 border-2 border-dashed border-white/10 rounded-2xl">
                      No boards found in this department.
                    </div>
                  )}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )}

        {/* LEVEL 3: AGENTS KANBAN VIEW */}
        {selectedBoardId && currentBoard && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300 h-full">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Users className="text-brand-400"/> Agents: {currentBoard.name}</h2>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setShowHistorySidebar(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-slate-300 hover:text-white transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <History size={16} className="text-slate-400" />
                  <span>History</span>
                  {completedTasks.length > 0 && (
                    <span className="bg-brand-500/20 text-brand-300 border border-brand-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold">
                      {completedTasks.length}
                    </span>
                  )}
                </button>
                <button onClick={() => setSelectedBoardId(null)} className="glass-button text-sm py-2 px-4 flex items-center gap-2"><ArrowLeft size={16}/> Back</button>
              </div>
            </div>
            
            <div className="relative group/board">
              {/* Left Scroll Paddle */}
              {canScrollLeft && (
                <button
                  onClick={() => {
                    boardContainerRef.current?.scrollBy({ left: -340, behavior: 'smooth' });
                  }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-slate-900/60 hover:bg-slate-900/90 text-brand-400 hover:text-brand-300 border border-white/10 hover:border-brand-500/50 flex items-center justify-center backdrop-blur-md shadow-[0_0_15px_rgba(0,0,0,0.5)] transition-all z-20 hover:scale-110 active:scale-95"
                  title="Scroll Left"
                  aria-label="Scroll left"
                >
                  <ChevronLeft size={24} />
                </button>
              )}

              {/* Right Scroll Paddle */}
              {canScrollRight && (
                <button
                  onClick={() => {
                    boardContainerRef.current?.scrollBy({ left: 340, behavior: 'smooth' });
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-slate-900/60 hover:bg-slate-900/90 text-brand-400 hover:text-brand-300 border border-white/10 hover:border-brand-500/50 flex items-center justify-center backdrop-blur-md shadow-[0_0_15px_rgba(0,0,0,0.5)] transition-all z-20 hover:scale-110 active:scale-95"
                  title="Scroll Right"
                  aria-label="Scroll right"
                >
                  <ChevronRight size={24} />
                </button>
              )}

              <div 
                ref={boardContainerRef}
                className="flex gap-6 overflow-x-auto pb-6 scrollbar-hide items-stretch min-h-[500px]"
              >
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
            <form onSubmit={async (e) => {
              e.preventDefault();
              const { data: isValid, error } = await supabase.rpc('verify_department_password', {
                dept_id: deptToUnlock.id,
                input_password: deptUnlockPassword
              });
              if (!error && isValid) {
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
                  <input
                    type="password"
                    name="password"
                    className="glass-input w-full"
                    placeholder={
                      editingDepartment?.has_password 
                        ? "•••••••• (leave blank to keep existing)" 
                        : "Leave empty for public access"
                    }
                  />
                  {editingDepartment?.has_password && (
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="checkbox"
                        name="remove_password"
                        id="remove_password"
                        className="rounded border-slate-700 bg-slate-800 text-brand-500 focus:ring-brand-500 cursor-pointer"
                      />
                      <label htmlFor="remove_password" className="text-xs text-slate-400 cursor-pointer select-none">
                        Remove password protection (make department public)
                      </label>
                    </div>
                  )}
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
                  value={localTitle}
                  onChange={(e) => setLocalTitle(e.target.value)}
                  onBlur={() => {
                    if (localTitle !== activeTaskDetails.task.title) {
                      updateTask(activeTaskDetails.emp.id, activeTaskDetails.task.id, { title: localTitle });
                    }
                  }}
                  className="glass-input w-full min-h-[120px] resize-none text-base"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-wider mb-2 block">Task Description (Optional)</label>
                <textarea 
                  value={localDescription}
                  onChange={(e) => setLocalDescription(e.target.value)}
                  onBlur={() => {
                    if (localDescription !== (activeTaskDetails.task.description || '')) {
                      updateTask(activeTaskDetails.emp.id, activeTaskDetails.task.id, { description: localDescription });
                    }
                  }}
                  className="glass-input w-full min-h-[100px] resize-none text-sm"
                  placeholder="Add more details about this task..."
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

              <div className="relative">
                <label className="text-xs text-slate-400 uppercase tracking-wider mb-2 block">Tag As</label>
                <button
                  type="button"
                  onClick={() => setShowTagPopover(!showTagPopover)}
                  className="w-full flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white hover:bg-white/10 transition-all text-sm cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Tag size={16} className="text-slate-400" />
                    {activeTaskDetails.task.tag && activeTaskDetails.task.tag !== 'Undefined' ? (
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        activeTaskDetails.task.tag === 'Under 5 min' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' :
                        activeTaskDetails.task.tag === 'Under 15 min' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                        activeTaskDetails.task.tag === 'Under 30 min' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                        activeTaskDetails.task.tag === 'Under 45 min' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                        'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                      }`}>
                        {activeTaskDetails.task.tag}
                      </span>
                    ) : (
                      <span className="text-slate-400">Undefined</span>
                    )}
                  </div>
                  <ChevronRight size={16} className={`text-slate-400 transition-transform ${showTagPopover ? 'rotate-90' : ''}`} />
                </button>

                {showTagPopover && (
                  <div className="absolute left-0 right-0 mt-2 z-20 glass-card bg-slate-950/95 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-xl p-3 w-64 animate-in fade-in duration-200">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tag as</div>
                    
                    {/* Search Tags box */}
                    <div className="relative mb-2">
                      <Search size={14} className="absolute left-3 top-2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search Tags"
                        value={tagSearchQuery}
                        onChange={(e) => setTagSearchQuery(e.target.value)}
                        className="glass-input text-xs w-full pl-9 pr-4 py-1.5 font-sans"
                        autoFocus
                      />
                    </div>

                    {/* Tags List */}
                    <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                      {[
                        { name: 'Under 5 min', colorClass: 'bg-cyan-500' },
                        { name: 'Under 15 min', colorClass: 'bg-emerald-500' },
                        { name: 'Under 30 min', colorClass: 'bg-amber-500' },
                        { name: 'Under 45 min', colorClass: 'bg-rose-500' },
                        { name: 'Undefined', colorClass: 'bg-slate-500' }
                      ]
                        .filter(t => t.name.toLowerCase().includes(tagSearchQuery.toLowerCase()))
                        .map(t => {
                          const isSelected = activeTaskDetails.task.tag === t.name || (t.name === 'Undefined' && (!activeTaskDetails.task.tag || activeTaskDetails.task.tag === 'Undefined'));
                          return (
                            <button
                              key={t.name}
                              type="button"
                              onClick={() => {
                                updateTask(activeTaskDetails.emp.id, activeTaskDetails.task.id, { tag: t.name });
                                setShowTagPopover(false);
                                setTagSearchQuery('');
                              }}
                              className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs text-left transition-all cursor-pointer ${
                                isSelected ? 'bg-white/10 text-white font-semibold' : 'hover:bg-white/5 text-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className={`w-3.5 h-3.5 rounded ${t.colorClass} shadow-md flex-shrink-0`} />
                                <span>{t.name}</span>
                              </div>
                              {isSelected && (
                                <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />
                              )}
                            </button>
                          );
                        })}
                      {[
                        { name: 'Under 5 min' },
                        { name: 'Under 15 min' },
                        { name: 'Under 30 min' },
                        { name: 'Under 45 min' },
                        { name: 'Undefined' }
                      ].filter(t => t.name.toLowerCase().includes(tagSearchQuery.toLowerCase())).length === 0 && (
                        <div className="text-slate-500 text-xs text-center py-3">No tags match your search</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 pb-4">
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1"><Calendar size={12}/> Due Date</label>
                  <input 
                    type="date" 
                    className="glass-input w-full text-sm" 
                    value={localDueDate} 
                    onChange={(e) => {
                      setLocalDueDate(e.target.value);
                      updateTask(activeTaskDetails.emp.id, activeTaskDetails.task.id, { dueDate: e.target.value });
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1"><Bell size={12}/> Reminder</label>
                  <input 
                    type="time" 
                    className="glass-input w-full text-sm" 
                    value={localReminderTime} 
                    onChange={(e) => {
                      setLocalReminderTime(e.target.value);
                      updateTask(activeTaskDetails.emp.id, activeTaskDetails.task.id, { reminderTime: e.target.value });
                      if ('Notification' in window && Notification.permission === 'default') {
                        Notification.requestPermission().then(permission => {
                          setNotificationPermission(permission);
                        }).catch(err => {
                          console.warn('Desktop notifications permission request failed', err);
                        });
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Toast Notification Popups */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {notifications.map(notif => (
          <div 
            key={notif.id}
            className="pointer-events-auto glass-card border border-brand-500/40 p-4 rounded-xl shadow-[0_10px_30px_rgba(124,58,237,0.25)] flex items-start gap-3 animate-in slide-in-from-bottom-6 fade-in duration-300 relative overflow-hidden bg-slate-950/80 backdrop-blur-xl"
          >
            {/* Pulsing indicator light */}
            <div className="absolute top-0 left-0 w-[4px] h-full bg-brand-500 shadow-[0_0_8px_#8b5cf6]" />
            
            {/* Bell icon container with a gorgeous pulse */}
            <div className="flex-shrink-0 bg-brand-500/20 p-2 rounded-lg text-brand-400 animate-pulse mt-0.5 border border-brand-500/30">
              <Bell size={18} />
            </div>

            {/* Notification details */}
            <div className="flex-1 min-w-0 pr-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-brand-400 tracking-wider uppercase">Reminder</span>
                <span className="text-[10px] text-slate-400 bg-white/5 px-1.5 py-0.5 rounded">{notif.time}</span>
              </div>
              <h4 className="text-sm font-bold text-white truncate mb-1">{notif.taskTitle}</h4>
              <p className="text-xs text-slate-300 flex items-center gap-1">
                <Users size={12} className="text-slate-400" />
                <span>Assigned to: <strong className="text-brand-300">{notif.employeeName}</strong></span>
              </p>
            </div>

            {/* Close button */}
            <button 
              onClick={() => dismissNotification(notif.id)}
              className="text-slate-400 hover:text-white hover:bg-white/5 p-1 rounded-md transition-colors flex-shrink-0"
              aria-label="Dismiss reminder"
            >
              <X size={14} />
            </button>

            {/* Draining visual progress bar */}
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/5">
              <div 
                className="h-full bg-gradient-to-r from-brand-500 to-accent-400 transition-all duration-[8000ms] ease-linear"
                style={{ width: '0%', animation: 'shrinkBar 8s linear forwards' }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Task History Sidebar */}
      {showHistorySidebar && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop with a smooth dark blur */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-200" onClick={() => setShowHistorySidebar(false)} />
          
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-[#120a21]/95 backdrop-blur-xl border-l border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
              {/* Sidebar Header */}
              <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/5 rounded-tl-2xl">
                <div className="flex items-center gap-2">
                  <History className="text-brand-400 animate-pulse" size={20} />
                  <h2 className="text-lg font-bold text-white">Completed Task History</h2>
                </div>
                <button onClick={() => setShowHistorySidebar(false)} className="text-slate-400 hover:text-white bg-white/5 p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              {/* Search Box */}
              <div className="p-4 border-b border-white/10 bg-white/5">
                <div className="relative">
                  <Search className="absolute left-3 top-3 text-slate-400" size={16} />
                  <input
                    type="text"
                    value={searchHistoryQuery}
                    onChange={(e) => setSearchHistoryQuery(e.target.value)}
                    placeholder="Search completed tasks..."
                    className="glass-input w-full pl-9 pr-4 py-2 text-sm"
                  />
                </div>
              </div>

              {/* Sidebar Content (Completed Tasks List) */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {filteredCompletedTasks.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 py-12 text-center">
                    <History size={40} className="text-slate-600 mb-2" />
                    <p className="text-sm">No completed tasks found</p>
                  </div>
                ) : (
                  filteredCompletedTasks.map(({ task, emp }) => (
                    <div key={task.id} className="glass-card p-4 border border-white/10 rounded-xl bg-white/5 flex flex-col gap-2 hover:bg-white/10 transition-all">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-white line-through decoration-slate-500 truncate">{task.title}</h4>
                          {task.description && (
                            <p className="text-xs text-slate-400 mt-1 line-clamp-2">{task.description}</p>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            // Uncomplete the task
                            updateTask(emp.id, task.id, { completed: false });
                          }}
                          className="flex-shrink-0 p-1.5 rounded-lg hover:bg-brand-500/20 text-slate-400 hover:text-brand-400 transition-colors cursor-pointer"
                          title="Restore task to board"
                        >
                          <RotateCcw size={14} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between border-t border-white/5 pt-2 mt-1">
                        <div className="flex items-center gap-2">
                          <div className={`w-5 h-5 rounded-full ${emp.color} flex items-center justify-center text-[9px] font-bold shadow`}>
                            {getInitials(emp.name)}
                          </div>
                          <span className="text-[11px] text-slate-300 truncate max-w-[120px]">{emp.name}</span>
                        </div>
                        <span className="text-[9px] px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-slate-400 uppercase tracking-wider font-semibold">
                          {task.priority}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
