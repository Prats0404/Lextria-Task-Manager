import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { 
  Plus, Clock, MessageSquare, X, Send, User, Calendar, ChevronDown
} from 'lucide-react';

const BOARDS = ['Litigation', 'Compliance', 'Miscellaneous', 'Patent', 'Trademark', 'Copyright', 'Design'];
const URGENCIES = ['High', 'Medium', 'Low'];

export default function QueryManager({ agents = [] }) {
  const [activeView, setActiveView] = useState('board'); // 'board' | 'history'
  const [selectedBoard, setSelectedBoard] = useState('Litigation');
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

  // Filter tickets by selected board
  const boardTickets = tickets.filter(t => t.board === selectedBoard || t.board === 'Misc' && selectedBoard === 'Miscellaneous');
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
          onClick={() => {
            setNewTicket(prev => ({ ...prev, board: selectedBoard === 'Miscellaneous' ? 'Misc' : selectedBoard }));
            setShowNewTicketModal(true);
          }}
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

      {/* New Ticket Modal */}
      {showNewTicketModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 relative">
            <button onClick={() => setShowNewTicketModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20} /></button>
            <h2 className="text-lg font-bold mb-5 text-gray-900 flex items-center gap-2">
              <Plus size={20} className="text-[#1e3a5f]"/> Create New Query
            </h2>
            
            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Board / Category</label>
                  <select 
                    value={newTicket.board} 
                    onChange={e => setNewTicket({...newTicket, board: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f] outline-none bg-white"
                  >
                    {BOARDS.map(b => <option key={b} value={b === 'Miscellaneous' ? 'Misc' : b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Urgency</label>
                  <select 
                    value={newTicket.urgency} 
                    onChange={e => setNewTicket({...newTicket, urgency: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f] outline-none bg-white"
                  >
                    {URGENCIES.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Created By</label>
                <select 
                  value={newTicket.created_by || ''} 
                  onChange={e => setNewTicket({...newTicket, created_by: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f] outline-none bg-white"
                >
                  {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Query Description</label>
                <textarea 
                  value={newTicket.query} 
                  onChange={e => setNewTicket({...newTicket, query: e.target.value})}
                  required 
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f] outline-none" 
                  placeholder="Describe your issue or query here..." 
                />
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <button type="button" onClick={() => setShowNewTicketModal(false)} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 text-sm transition-colors">Cancel</button>
                <button type="submit" className="px-5 py-2 rounded-lg bg-[#1e3a5f] hover:bg-[#162d4a] text-white text-sm font-medium transition-colors">Submit Query</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ticket Details / Chat Modal */}
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
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f] outline-none"
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
