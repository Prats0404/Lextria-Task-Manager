import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { 
  Plus, Search, Clock, MessageSquare, AlertCircle, 
  CheckCircle2, X, Send, User, Calendar
} from 'lucide-react';

const BOARDS = ['Litigation', 'Compliance', 'Misc', 'Patent', 'Trademark', 'Copyright', 'Design'];
const URGENCIES = ['High', 'Medium', 'Low'];

export default function QueryManager({ agents = [] }) {
  const [activeTab, setActiveTab] = useState('board'); // 'board' | 'history'
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  // Form state
  const [newTicket, setNewTicket] = useState({
    board: 'Litigation',
    urgency: 'Medium',
    query: '',
    created_by: agents.length > 0 ? agents[0].id : null
  });

  // Update default agent if agents load late
  useEffect(() => {
    if (agents.length > 0 && !newTicket.created_by) {
      setNewTicket(prev => ({ ...prev, created_by: agents[0].id }));
    }
  }, [agents, newTicket.created_by]);

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
    if (!newTicket.query.trim()) return;

    const { data, error } = await supabase
      .from('tickets')
      .insert([{
        board: newTicket.board,
        urgency: newTicket.urgency,
        query: newTicket.query,
        created_by: newTicket.created_by,
        status: 'Open'
      }])
      .select();

    if (error) {
      console.error('Error creating ticket:', error);
      alert('Failed to create ticket.');
    } else {
      setShowNewTicketModal(false);
      setNewTicket({ ...newTicket, query: '' });
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
      setTickets(tickets.map(t => t.id === ticketId ? { ...t, status: newStatus } : t));
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status: newStatus });
      }
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedTicket) return;

    const { data, error } = await supabase
      .from('messages')
      .insert([{
        ticket_id: selectedTicket.id,
        content: newMessage,
        agent_id: agents.length > 0 ? agents[0].id : null // fallback
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

  const getUrgencyColor = (urgency) => {
    if (urgency === 'High') return 'text-red-400 bg-red-400/10 border-red-400/20';
    if (urgency === 'Medium') return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
    return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
  };

  const openTickets = tickets.filter(t => t.status === 'Open');
  const discussingTickets = tickets.filter(t => t.status === 'In Discussion');
  const resolvedTickets = tickets.filter(t => t.status === 'Resolved');

  const getAgentName = (id) => {
    const agent = agents.find(a => a.id === id);
    return agent ? agent.name : 'Unknown Agent';
  };

  return (
    <div className="flex-1 p-6 h-full flex flex-col overflow-hidden text-slate-200 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="text-brand-400" />
            Query Manager
          </h1>
          <p className="text-slate-400 text-sm mt-1">Manage and discuss cross-board queries.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex bg-[#0a0a1a] rounded-xl p-1 border border-white/10">
            <button
              onClick={() => setActiveTab('board')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'board' ? 'bg-brand-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Active Board
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'history' ? 'bg-brand-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              History
            </button>
          </div>
          
          <button 
            onClick={() => setShowNewTicketModal(true)}
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:shadow-[0_0_25px_rgba(37,99,235,0.5)]"
          >
            <Plus size={16} /> New Query
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
        </div>
      ) : activeTab === 'board' ? (
        /* Kanban Board */
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-hidden">
          {/* Column: Open */}
          <div className="flex flex-col glass-card border border-white/5 rounded-2xl overflow-hidden bg-[#050510]/50">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <AlertCircle size={18} className="text-amber-400" />
                Open
              </h2>
              <span className="bg-white/10 px-2 py-0.5 rounded-full text-xs font-bold">{openTickets.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {openTickets.map(ticket => (
                <TicketCard key={ticket.id} ticket={ticket} onClick={() => openTicket(ticket)} getAgentName={getAgentName} getUrgencyColor={getUrgencyColor} />
              ))}
              {openTickets.length === 0 && <p className="text-slate-500 text-center py-8 text-sm">No open queries</p>}
            </div>
          </div>

          {/* Column: In Discussion */}
          <div className="flex flex-col glass-card border border-white/5 rounded-2xl overflow-hidden bg-[#050510]/50">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <MessageSquare size={18} className="text-brand-400" />
                In Discussion
              </h2>
              <span className="bg-white/10 px-2 py-0.5 rounded-full text-xs font-bold">{discussingTickets.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {discussingTickets.map(ticket => (
                <TicketCard key={ticket.id} ticket={ticket} onClick={() => openTicket(ticket)} getAgentName={getAgentName} getUrgencyColor={getUrgencyColor} />
              ))}
              {discussingTickets.length === 0 && <p className="text-slate-500 text-center py-8 text-sm">No discussions active</p>}
            </div>
          </div>
        </div>
      ) : (
        /* History Tab */
        <div className="flex-1 glass-card border border-white/5 rounded-2xl overflow-hidden bg-[#050510]/50 flex flex-col">
          <div className="p-4 border-b border-white/10 bg-white/5 flex justify-between items-center">
             <h2 className="font-semibold text-white flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-400" />
                Resolved Queries
              </h2>
              <span className="bg-white/10 px-2 py-0.5 rounded-full text-xs font-bold">{resolvedTickets.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {resolvedTickets.map(ticket => (
                <TicketCard key={ticket.id} ticket={ticket} onClick={() => openTicket(ticket)} getAgentName={getAgentName} getUrgencyColor={getUrgencyColor} />
              ))}
              {resolvedTickets.length === 0 && <p className="text-slate-500 text-center py-8 text-sm col-span-full">No resolved queries yet</p>}
          </div>
        </div>
      )}

      {/* New Ticket Modal */}
      {showNewTicketModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-lg p-6 relative animate-in fade-in zoom-in duration-200 border border-brand-500/20">
            <button onClick={() => setShowNewTicketModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X size={20} /></button>
            <h2 className="text-xl font-bold mb-6 text-white flex items-center gap-2">
              <Plus className="text-brand-400"/> Create New Query
            </h2>
            
            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Board / Category</label>
                  <select 
                    value={newTicket.board} 
                    onChange={e => setNewTicket({...newTicket, board: e.target.value})}
                    className="glass-input w-full bg-[#0a0a1a] text-sm"
                  >
                    {BOARDS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Urgency</label>
                  <select 
                    value={newTicket.urgency} 
                    onChange={e => setNewTicket({...newTicket, urgency: e.target.value})}
                    className="glass-input w-full bg-[#0a0a1a] text-sm"
                  >
                    {URGENCIES.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Created By</label>
                <select 
                  value={newTicket.created_by || ''} 
                  onChange={e => setNewTicket({...newTicket, created_by: e.target.value})}
                  className="glass-input w-full bg-[#0a0a1a] text-sm"
                >
                  {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Query Description</label>
                <textarea 
                  value={newTicket.query} 
                  onChange={e => setNewTicket({...newTicket, query: e.target.value})}
                  required 
                  rows={4}
                  className="glass-input w-full resize-none bg-[#0a0a1a] text-sm" 
                  placeholder="Describe your issue or query here..." 
                />
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={() => setShowNewTicketModal(false)} className="px-4 py-2 rounded-lg text-slate-300 hover:bg-white/5 transition-colors">Cancel</button>
                <button type="submit" className="glass-button">Submit Query</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ticket Details / Chat Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col md:flex-row items-center justify-center p-4">
          <div className="glass-card w-full max-w-4xl h-[80vh] flex flex-col md:flex-row relative animate-in fade-in zoom-in duration-200 border border-white/10 overflow-hidden">
            
            <button onClick={() => setSelectedTicket(null)} className="absolute top-4 right-4 z-10 text-slate-400 hover:text-white bg-black/20 rounded-full p-1"><X size={20} /></button>

            {/* Left side: Ticket Details */}
            <div className="w-full md:w-1/3 bg-[#050510]/80 border-r border-white/10 p-6 flex flex-col overflow-y-auto">
               <div className="mb-6">
                 <div className="flex justify-between items-start mb-2">
                    <span className="font-mono text-xs font-bold px-2 py-1 bg-white/10 rounded text-brand-300">{selectedTicket.code || 'PENDING'}</span>
                    <span className={`text-xs font-bold px-2 py-1 border rounded-full ${getUrgencyColor(selectedTicket.urgency)}`}>
                      {selectedTicket.urgency}
                    </span>
                 </div>
                 <h2 className="text-xl font-bold text-white mt-4 mb-1">{selectedTicket.board} Query</h2>
                 <div className="flex items-center text-xs text-slate-400 gap-1 mb-4">
                   <Calendar size={12} /> {new Date(selectedTicket.created_at).toLocaleDateString()}
                 </div>
               </div>

               <div className="bg-white/5 border border-white/5 rounded-xl p-4 mb-6">
                 <div className="flex items-center gap-2 mb-2 text-slate-300 font-medium text-sm">
                   <User size={14} className="text-brand-400" />
                   {getAgentName(selectedTicket.created_by)}
                 </div>
                 <p className="text-sm text-slate-200 whitespace-pre-wrap">{selectedTicket.query}</p>
               </div>

               <div className="mt-auto pt-6">
                 <p className="text-xs text-slate-400 mb-2 font-medium uppercase tracking-wider">Update Status</p>
                 <div className="flex flex-col gap-2">
                   {selectedTicket.status !== 'Open' && (
                     <button onClick={() => updateTicketStatus(selectedTicket.id, 'Open')} className="w-full py-2 text-sm rounded-lg border border-white/10 hover:bg-white/5 transition-colors">Move to Open</button>
                   )}
                   {selectedTicket.status !== 'In Discussion' && (
                     <button onClick={() => updateTicketStatus(selectedTicket.id, 'In Discussion')} className="w-full py-2 text-sm rounded-lg border border-brand-500/30 bg-brand-500/10 hover:bg-brand-500/20 text-brand-300 transition-colors">Move to Discussion</button>
                   )}
                   {selectedTicket.status !== 'Resolved' && (
                     <button onClick={() => updateTicketStatus(selectedTicket.id, 'Resolved')} className="w-full py-2 text-sm rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 transition-colors">Mark as Resolved</button>
                   )}
                 </div>
               </div>
            </div>

            {/* Right side: Messages Thread */}
            <div className="w-full md:w-2/3 flex flex-col bg-[#080816]/90 h-full">
              <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2"><MessageSquare size={16} className="text-brand-400"/> Discussion Thread</h3>
                <span className={`text-xs px-2 py-1 rounded font-medium ${
                  selectedTicket.status === 'Open' ? 'bg-amber-500/20 text-amber-300' :
                  selectedTicket.status === 'In Discussion' ? 'bg-brand-500/20 text-brand-300' :
                  'bg-emerald-500/20 text-emerald-300'
                }`}>
                  {selectedTicket.status}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500">
                     <MessageSquare size={32} className="mb-2 opacity-20" />
                     <p className="text-sm">No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map(msg => {
                    const isOwn = agents.length > 0 && msg.agent_id === agents[0].id; // Basic check, ideally use real logged-in user
                    return (
                      <div key={msg.id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                        <span className="text-xs text-slate-400 mb-1 px-1">{getAgentName(msg.agent_id)}</span>
                        <div className={`px-4 py-2.5 rounded-2xl max-w-[80%] text-sm ${
                          isOwn 
                            ? 'bg-brand-600 text-white rounded-br-sm' 
                            : 'bg-white/10 text-slate-200 border border-white/5 rounded-bl-sm'
                        }`}>
                          {msg.content}
                        </div>
                        <span className="text-[10px] text-slate-500 mt-1 px-1">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Message Input */}
              {selectedTicket.status !== 'Resolved' ? (
                <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10 bg-black/20 flex gap-2">
                  <input 
                    type="text" 
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Type your reply..."
                    className="flex-1 glass-input bg-white/5 border-none focus:ring-1 focus:ring-brand-500"
                  />
                  <button 
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2.5 rounded-xl transition-colors"
                  >
                    <Send size={18} />
                  </button>
                </form>
              ) : (
                <div className="p-4 border-t border-white/10 bg-black/20 text-center text-sm text-slate-400">
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

function TicketCard({ ticket, onClick, getAgentName, getUrgencyColor }) {
  return (
    <div 
      onClick={onClick}
      className="bg-white/5 border border-white/5 hover:border-brand-500/30 hover:bg-white/10 rounded-xl p-4 cursor-pointer transition-all group shadow-sm hover:shadow-md"
    >
      <div className="flex justify-between items-start mb-2">
        <span className="font-mono text-xs font-bold text-slate-400 group-hover:text-brand-300 transition-colors">
          {ticket.code || 'PENDING'}
        </span>
        <span className={`text-[10px] font-bold px-2 py-0.5 border rounded-full ${getUrgencyColor(ticket.urgency)}`}>
          {ticket.urgency}
        </span>
      </div>
      
      <h3 className="font-semibold text-white text-sm mb-1 truncate">{ticket.board}</h3>
      <p className="text-xs text-slate-300 line-clamp-2 mb-3">
        {ticket.query}
      </p>
      
      <div className="flex justify-between items-center text-xs text-slate-500 pt-3 border-t border-white/5 mt-auto">
        <span className="flex items-center gap-1"><User size={12}/> {getAgentName(ticket.created_by)}</span>
        <span className="flex items-center gap-1"><Clock size={12}/> {new Date(ticket.created_at).toLocaleDateString()}</span>
      </div>
    </div>
  );
}
