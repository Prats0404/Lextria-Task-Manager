import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import { 
  Plus, Clock, MessageSquare, X, Send, User, Calendar, Image as ImageIcon
} from 'lucide-react';

const BOARDS = ['Litigation', 'Compliance', 'Miscellaneous', 'Patent', 'Trademark', 'Copyright', 'Design'];
const URGENCIES = ['High', 'Medium', 'Low'];

export default function QueryManager({ agents = [], isAdmin = false }) {
  const [activeView, setActiveView] = useState('board'); // 'board' | 'history'
  const [selectedBoard, setSelectedBoard] = useState('Litigation');
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  // Form state
  const [newTicketUrgency, setNewTicketUrgency] = useState('Medium');
  const [newTicketQuery, setNewTicketQuery] = useState('');
  const [newTicketCreatedBy, setNewTicketCreatedBy] = useState(agents.length > 0 ? agents[0].id : null);
  const [newTicketImages, setNewTicketImages] = useState([]);
  const fileInputRef = useRef(null);

  // Update default agent if agents load late
  useEffect(() => {
    if (agents.length > 0 && !newTicketCreatedBy) {
      setNewTicketCreatedBy(agents[0].id);
    }
  }, [agents, newTicketCreatedBy]);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching tickets:', error);
    } else {
      setTickets(data || []);
    }
    setLoading(false);
  };

  const fetchMessages = async (ticketId) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });
      
    if (error) {
      console.error('Error fetching messages:', error);
    } else {
      setMessages(data || []);
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!newTicketQuery.trim()) return;

    // Map board name for DB (Miscellaneous -> Misc)
    const dbBoard = selectedBoard === 'Miscellaneous' ? 'Misc' : selectedBoard;

    const { data, error } = await supabase
      .from('tickets')
      .insert([{
        board: dbBoard,
        urgency: newTicketUrgency,
        query: newTicketQuery,
        created_by: newTicketCreatedBy,
        status: 'Open'
      }])
      .select();

    if (error) {
      console.error('Error creating ticket:', error);
      alert('Failed to create ticket.');
    } else {
      setShowNewTicketModal(false);
      setNewTicketQuery('');
      setNewTicketUrgency('Medium');
      setNewTicketImages([]);
      fetchTickets();
    }
  };

  const updateTicketStatus = async (ticketId, newStatus) => {
    const { error } = await supabase
      .from('tickets')
      .update({ status: newStatus })
      .eq('id', ticketId);

    if (error) {
      console.error('Error updating status:', error);
    } else {
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: newStatus } : t));
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket(prev => ({ ...prev, status: newStatus }));
      }
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedTicket) return;

    const { error } = await supabase
      .from('messages')
      .insert([{
        ticket_id: selectedTicket.id,
        content: newMessage,
        agent_id: agents.length > 0 ? agents[0].id : null
      }])
      .select();

    if (error) {
      console.error('Error sending message:', error);
    } else {
      setNewMessage('');
      fetchMessages(selectedTicket.id);
    }
  };

  const openTicket = (ticket) => {
    setSelectedTicket(ticket);
    fetchMessages(ticket.id);
  };

  const getAgentName = (id) => {
    const agent = agents.find(a => a.id === id);
    return agent ? agent.name : 'Unknown';
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setNewTicketImages(prev => [...prev, { name: file.name, preview: ev.target.result }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setNewTicketImages(prev => prev.filter((_, i) => i !== index));
  };

  // Determine the current user's name for "Raising as"
  const currentUserName = agents.length > 0 ? getAgentName(newTicketCreatedBy) : 'Unknown';

  // Filter tickets by selected board
  const boardTickets = tickets.filter(t => {
    if (selectedBoard === 'Miscellaneous') return t.board === 'Misc' || t.board === 'Miscellaneous';
    return t.board === selectedBoard;
  });
  const openTickets = boardTickets.filter(t => t.status === 'Open');
  const discussingTickets = boardTickets.filter(t => t.status === 'In Discussion');
  const resolvedTickets = boardTickets.filter(t => t.status === 'Resolved');

  const urgencyBadge = (urgency) => {
    if (urgency === 'High') return 'bg-red-100 text-red-700 border-red-200';
    if (urgency === 'Medium') return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-green-100 text-green-700 border-green-200';
  };

  return (
    <div className="flex-1 flex flex-col min-h-0" style={{ background: '#f0f2f5' }}>
      
      {/* Board Category Pills */}
      <div className="px-6 pt-5 pb-0" style={{ background: '#f0f2f5' }}>
        <div className="flex items-center gap-2 flex-wrap">
          {BOARDS.map(board => (
            <button
              key={board}
              onClick={() => setSelectedBoard(board)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                selectedBoard === board
                  ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
              }`}
            >
              {board}
            </button>
          ))}
        </div>
      </div>

      {/* Board / History Tabs + New Query Button */}
      <div className="px-6 pt-4 pb-3 flex items-center justify-between" style={{ background: '#f0f2f5' }}>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveView('board')}
            className={`px-3 py-1.5 text-sm font-semibold rounded transition-colors ${
              activeView === 'board'
                ? 'text-gray-900 bg-white shadow-sm border border-gray-200'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Board
          </button>
          <button
            onClick={() => setActiveView('history')}
            className={`px-3 py-1.5 text-sm font-semibold rounded transition-colors ${
              activeView === 'history'
                ? 'text-gray-900 bg-white shadow-sm border border-gray-200'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            History
          </button>
        </div>

        <button 
          onClick={() => setShowNewTicketModal(true)}
          className="flex items-center gap-1.5 bg-[#1e3a5f] hover:bg-[#162d4a] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} /> New query
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 pb-6 overflow-auto" style={{ background: '#f0f2f5' }}>
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e3a5f]"></div>
          </div>
        ) : activeView === 'board' ? (
          /* Kanban Board */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Column: Open */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 flex justify-between items-center border-b border-gray-100">
                <h2 className="font-semibold text-gray-900 text-[15px]">Open</h2>
                <span className="text-xs font-bold text-gray-400 bg-gray-100 rounded-full px-2.5 py-0.5">{openTickets.length}</span>
              </div>
              <div className="p-4 space-y-3 min-h-[80px]">
                {openTickets.length === 0 ? (
                  <p className="text-gray-400 text-sm italic">Nothing here.</p>
                ) : (
                  openTickets.map(ticket => (
                    <TicketCard key={ticket.id} ticket={ticket} onClick={() => openTicket(ticket)} getAgentName={getAgentName} urgencyBadge={urgencyBadge} />
                  ))
                )}
              </div>
            </div>

            {/* Column: In Discussion */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 flex justify-between items-center border-b border-gray-100">
                <h2 className="font-semibold text-gray-900 text-[15px]">In Discussion</h2>
                <span className="text-xs font-bold text-gray-400 bg-gray-100 rounded-full px-2.5 py-0.5">{discussingTickets.length}</span>
              </div>
              <div className="p-4 space-y-3 min-h-[80px]">
                {discussingTickets.length === 0 ? (
                  <p className="text-gray-400 text-sm italic">Nothing here.</p>
                ) : (
                  discussingTickets.map(ticket => (
                    <TicketCard key={ticket.id} ticket={ticket} onClick={() => openTicket(ticket)} getAgentName={getAgentName} urgencyBadge={urgencyBadge} />
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          /* History Tab */
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 flex justify-between items-center border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 text-[15px]">Resolved</h2>
              <span className="text-xs font-bold text-gray-400 bg-gray-100 rounded-full px-2.5 py-0.5">{resolvedTickets.length}</span>
            </div>
            <div className="p-4 min-h-[80px]">
              {resolvedTickets.length === 0 ? (
                <p className="text-gray-400 text-sm italic">Nothing here.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {resolvedTickets.map(ticket => (
                    <TicketCard key={ticket.id} ticket={ticket} onClick={() => openTicket(ticket)} getAgentName={getAgentName} urgencyBadge={urgencyBadge} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ===== NEW QUERY MODAL (matches prototype screenshot) ===== */}
      {showNewTicketModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl relative">
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-0">
              <h2 className="text-lg font-bold text-[#1e3a5f]">
                New query · {selectedBoard}
              </h2>
              <button onClick={() => { setShowNewTicketModal(false); setNewTicketImages([]); }} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="px-6 pb-6 pt-4">
              {/* Raising as */}
              <div className="mb-5">
                <span className="text-sm text-[#1e3a5f]/70">Raising as </span>
                <span className="text-sm font-semibold text-[#1e3a5f]">{currentUserName}</span>
                {/* Hidden: allow leader to pick a different agent */}
                {isAdmin && agents.length > 1 && (
                  <select 
                    value={newTicketCreatedBy || ''} 
                    onChange={e => setNewTicketCreatedBy(e.target.value)}
                    className="ml-2 text-sm border border-gray-300 rounded px-2 py-0.5 outline-none focus:border-[#1e3a5f]"
                  >
                    {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                )}
              </div>

              {/* Urgency */}
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-800 mb-1.5">Urgency</label>
                <div className="relative">
                  <select 
                    value={newTicketUrgency} 
                    onChange={e => setNewTicketUrgency(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm appearance-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] outline-none bg-white pr-8"
                  >
                    {URGENCIES.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M6 8L1 3h10z"/></svg>
                  </div>
                </div>
              </div>

              {/* Query */}
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-800 mb-1.5">Query</label>
                <textarea 
                  value={newTicketQuery} 
                  onChange={e => setNewTicketQuery(e.target.value)}
                  required 
                  rows={5}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm resize-y focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] outline-none" 
                  placeholder="Describe what you need from the leader... (links are auto-detected)" 
                />
              </div>

              {/* Attach images */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-800 mb-1.5">Attach images (optional)</label>
                <div className="flex items-start gap-3 flex-wrap">
                  {newTicketImages.map((img, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-lg border border-gray-200 overflow-hidden group">
                      <img src={img.preview} alt={img.name} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 hover:border-[#1e3a5f]/40 flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-[#1e3a5f] transition-colors"
                  >
                    <Plus size={18} />
                    <span className="text-[11px] font-medium">Image</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end items-center gap-3 pt-2 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => { setShowNewTicketModal(false); setNewTicketImages([]); }} 
                  className="px-5 py-2.5 rounded-lg text-gray-600 hover:bg-gray-100 text-sm font-medium transition-colors border border-gray-300"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2.5 rounded-lg bg-[#1e3a5f] hover:bg-[#162d4a] text-white text-sm font-medium transition-colors"
                >
                  Raise ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== TICKET DETAILS / CHAT MODAL ===== */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl h-[80vh] flex flex-col md:flex-row rounded-2xl shadow-2xl relative overflow-hidden">
            
            <button onClick={() => setSelectedTicket(null)} className="absolute top-4 right-4 z-10 text-gray-400 hover:text-gray-600"><X size={20} /></button>

            {/* Left side: Ticket Details */}
            <div className="w-full md:w-[340px] bg-gray-50 border-r border-gray-200 p-6 flex flex-col overflow-y-auto">
               <div className="mb-5">
                 <div className="flex justify-between items-start mb-3">
                    <span className="font-mono text-xs font-bold px-2 py-1 bg-[#1e3a5f] text-white rounded">{selectedTicket.code || 'PENDING'}</span>
                    <span className={`text-xs font-bold px-2.5 py-1 border rounded-full ${urgencyBadge(selectedTicket.urgency)}`}>
                      {selectedTicket.urgency}
                    </span>
                 </div>
                 <h2 className="text-lg font-bold text-gray-900 mt-3">{selectedTicket.board} Query</h2>
                 <div className="flex items-center text-xs text-gray-500 gap-1 mt-1">
                   <Calendar size={12} /> {new Date(selectedTicket.created_at).toLocaleDateString()}
                 </div>
               </div>

               <div className="bg-white border border-gray-200 rounded-lg p-4 mb-5">
                 <div className="flex items-center gap-2 mb-2 text-gray-700 font-medium text-sm">
                   <User size={14} className="text-[#1e3a5f]" />
                   {getAgentName(selectedTicket.created_by)}
                 </div>
                 <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{selectedTicket.query}</p>
               </div>

               <div className="mt-auto pt-4">
                 <p className="text-xs text-gray-500 mb-2 font-semibold uppercase tracking-wider">Update Status</p>
                 <div className="flex flex-col gap-2">
                   {selectedTicket.status !== 'Open' && (
                     <button onClick={() => updateTicketStatus(selectedTicket.id, 'Open')} className="w-full py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-100 text-gray-700 transition-colors">Move to Open</button>
                   )}
                   {selectedTicket.status !== 'In Discussion' && (
                     <button onClick={() => updateTicketStatus(selectedTicket.id, 'In Discussion')} className="w-full py-2 text-sm rounded-lg border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors">Move to Discussion</button>
                   )}
                   {selectedTicket.status !== 'Resolved' && (
                     <button onClick={() => updateTicketStatus(selectedTicket.id, 'Resolved')} className="w-full py-2 text-sm rounded-lg border border-green-300 bg-green-50 hover:bg-green-100 text-green-700 transition-colors">Mark as Resolved</button>
                   )}
                 </div>
               </div>
            </div>

            {/* Right side: Messages Thread */}
            <div className="flex-1 flex flex-col h-full">
              <div className="px-5 py-3.5 border-b border-gray-200 flex items-center justify-between bg-white">
                <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                  <MessageSquare size={16} className="text-[#1e3a5f]"/> Discussion Thread
                </h3>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  selectedTicket.status === 'Open' ? 'bg-amber-100 text-amber-700' :
                  selectedTicket.status === 'In Discussion' ? 'bg-blue-100 text-blue-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {selectedTicket.status}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400">
                     <MessageSquare size={32} className="mb-2 opacity-30" />
                     <p className="text-sm">No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map(msg => {
                    const isOwn = agents.length > 0 && msg.agent_id === agents[0].id;
                    return (
                      <div key={msg.id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                        <span className="text-xs text-gray-500 mb-1 px-1">{getAgentName(msg.agent_id)}</span>
                        <div className={`px-4 py-2.5 rounded-2xl max-w-[80%] text-sm ${
                          isOwn 
                            ? 'bg-[#1e3a5f] text-white rounded-br-sm' 
                            : 'bg-white text-gray-700 border border-gray-200 rounded-bl-sm shadow-sm'
                        }`}>
                          {msg.content}
                        </div>
                        <span className="text-[10px] text-gray-400 mt-1 px-1">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Message Input */}
              {selectedTicket.status !== 'Resolved' ? (
                <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 bg-white flex gap-2">
                  <input 
                    type="text" 
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Type your reply..."
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] outline-none"
                  />
                  <button 
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="bg-[#1e3a5f] hover:bg-[#162d4a] disabled:opacity-40 disabled:cursor-not-allowed text-white p-2.5 rounded-lg transition-colors"
                  >
                    <Send size={16} />
                  </button>
                </form>
              ) : (
                <div className="p-4 border-t border-gray-200 bg-gray-50 text-center text-sm text-gray-500">
                  This query is resolved. Reopen to continue discussion.
                </div>
              )}
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}

function TicketCard({ ticket, onClick, getAgentName, urgencyBadge }) {
  return (
    <div 
      onClick={onClick}
      className="bg-gray-50 border border-gray-200 hover:border-[#1e3a5f]/30 hover:shadow-md rounded-lg p-4 cursor-pointer transition-all"
    >
      <div className="flex justify-between items-start mb-2">
        <span className="font-mono text-xs font-bold text-[#1e3a5f]">
          {ticket.code || 'PENDING'}
        </span>
        <span className={`text-[10px] font-bold px-2 py-0.5 border rounded-full ${urgencyBadge(ticket.urgency)}`}>
          {ticket.urgency}
        </span>
      </div>
      
      <p className="text-sm text-gray-700 line-clamp-2 mb-3 leading-relaxed">
        {ticket.query}
      </p>
      
      <div className="flex justify-between items-center text-xs text-gray-500 pt-2 border-t border-gray-100">
        <span className="flex items-center gap-1"><User size={11}/> {getAgentName(ticket.created_by)}</span>
        <span className="flex items-center gap-1"><Clock size={11}/> {new Date(ticket.created_at).toLocaleDateString()}</span>
      </div>
    </div>
  );
}
