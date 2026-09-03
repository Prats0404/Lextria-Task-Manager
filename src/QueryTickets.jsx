import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import { 
  Plus, Clock, MessageSquare, X, Send, User, Calendar,
  Download, Eye, Image as ImageIcon
} from 'lucide-react';

const BOARDS = [
  { key: 'litigation', label: 'Litigation', prefix: 'LIT' },
  { key: 'compliance', label: 'Compliance', prefix: 'CMP' },
  { key: 'misc', label: 'Miscellaneous', prefix: 'MISC' },
  { key: 'patent', label: 'Patent', prefix: 'PAT' },
  { key: 'trademark', label: 'Trademark', prefix: 'TM' },
  { key: 'copyright', label: 'Copyright', prefix: 'CR' },
  { key: 'design', label: 'Design', prefix: 'DSN' },
];

const URGENCIES = ['High', 'Medium', 'Low'];

export default function QueryTickets({ session, agents = [] }) {
  const [selectedBoardKey, setSelectedBoardKey] = useState('litigation');
  const [activeView, setActiveView] = useState('board'); // 'board' | 'history'
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [agentsList, setAgentsList] = useState(agents);

  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  // New ticket form
  const [urgency, setUrgency] = useState('Medium');
  const [queryText, setQueryText] = useState('');
  const [images, setImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const currentBoard = BOARDS.find(b => b.key === selectedBoardKey) || BOARDS[0];

  useEffect(() => {
    fetchTickets();
    supabase.from('agents').select('id, name').then(({ data }) => {
      if (data && data.length > 0) {
        setAgentsList(data);
      }
    });
  }, []);

  // Close lightbox on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && previewImage) {
        setPreviewImage(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewImage]);

  const resolveAgentId = (userName) => {
    if (!userName) return null;
    const clean = userName.replace(/\s+/g, '').toLowerCase();
    const list = agentsList.length > 0 ? agentsList : agents;
    const found = list.find(a => a.name?.replace(/\s+/g, '').toLowerCase() === clean);
    return found ? found.id : null;
  };

  const parseTicketData = (ticket, agentList = agentsList) => {
    if (!ticket) return { text: '', attachments: [], authorName: 'Member', authorRole: 'member' };
    const rawQuery = ticket.query || '';
    let authorName = 'Member';
    let authorRole = 'member';
    let cleanText = rawQuery;
    let attachments = [];

    // 1. Extract [AUTHOR]:{"name":"...","role":"..."}
    const authorMarker = '[AUTHOR]:';
    if (cleanText.includes(authorMarker)) {
      const startIdx = cleanText.indexOf(authorMarker) + authorMarker.length;
      const endIdx = cleanText.indexOf('\n', startIdx);
      const jsonStr = endIdx === -1 ? cleanText.substring(startIdx).trim() : cleanText.substring(startIdx, endIdx).trim();
      try {
        const parsed = JSON.parse(jsonStr);
        if (parsed.name) authorName = parsed.name;
        if (parsed.role) authorRole = parsed.role;
      } catch {}
      cleanText = endIdx === -1 ? '' : cleanText.substring(endIdx).trim();
    } else if (ticket.created_by) {
      const list = agentList.length > 0 ? agentList : agents;
      const found = list.find(a => a.id === ticket.created_by);
      if (found) authorName = found.name;
    }

    if (cleanText.startsWith('[QUERY]:')) {
      cleanText = cleanText.replace('[QUERY]:', '').trim();
    }

    // 2. Extract [ATTACHMENTS]:[...]
    const attMarker = '[ATTACHMENTS]:';
    if (cleanText.includes(attMarker)) {
      const idx = cleanText.indexOf(attMarker);
      const jsonStr = cleanText.substring(idx + attMarker.length).trim();
      cleanText = cleanText.substring(0, idx).trim();
      try {
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed)) attachments = parsed;
      } catch {}
    }

    return { text: cleanText, attachments, authorName, authorRole };
  };

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
    if (!queryText.trim()) return;
    setSubmitting(true);

    const agentId = resolveAgentId(session?.name);
    const authorMeta = {
      name: session?.name || 'Member',
      role: session?.role || 'member'
    };

    let fullPayloadText = `[AUTHOR]:${JSON.stringify(authorMeta)}\n\n[QUERY]:\n${queryText.trim()}`;
    if (images.length > 0) {
      fullPayloadText += `\n\n[ATTACHMENTS]:${JSON.stringify(images)}`;
    }

    const { data, error } = await supabase
      .from('tickets')
      .insert([{
        board: currentBoard.label,
        urgency: urgency,
        query: fullPayloadText,
        created_by: agentId,
        status: 'Open'
      }])
      .select();

    setSubmitting(false);

    if (error) {
      console.error('Error creating ticket:', error);
      alert('Could not create ticket: ' + (error.message || 'Please check Supabase connection.'));
    } else {
      setShowNewModal(false);
      setQueryText('');
      setUrgency('Medium');
      setImages([]);
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

    const agentId = resolveAgentId(session?.name);
    const authorName = session?.name || 'Member';
    const contentWithAuthor = `[${authorName}]: ${newMessage.trim()}`;

    const { error } = await supabase
      .from('messages')
      .insert([{
        ticket_id: selectedTicket.id,
        content: contentWithAuthor,
        agent_id: agentId
      }]);

    if (error) {
      console.error('Error sending message:', error);
      alert('Error sending message: ' + (error.message || 'Please check connection.'));
    } else {
      setNewMessage('');
      fetchMessages(selectedTicket.id);
    }
  };

  const openTicket = (ticket) => {
    setSelectedTicket(ticket);
    fetchMessages(ticket.id);
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImages(prev => [...prev, { name: file.name, preview: ev.target.result }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  // Filter tickets by selected board
  const boardTickets = tickets.filter(t => {
    if (!t.board) return false;
    const b = t.board.toLowerCase();
    const curr = currentBoard.label.toLowerCase();
    const key = currentBoard.key.toLowerCase();
    return b === curr || b === key || (key === 'misc' && (b === 'misc' || b === 'miscellaneous'));
  });

  const openTickets = boardTickets.filter(t => (t.status || '').toLowerCase() === 'open');
  const discussingTickets = boardTickets.filter(t => (t.status || '').toLowerCase() === 'in discussion' || (t.status || '').toLowerCase() === 'discussing');
  const resolvedTickets = boardTickets.filter(t => (t.status || '').toLowerCase() === 'resolved');

  const urgencyBadge = (u) => {
    if (u === 'High') return 'bg-red-100 text-red-700 border-red-200';
    if (u === 'Medium') return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#f4f5f7] text-slate-800">
      {/* Board Category Pills */}
      <div className="px-6 pt-5 pb-1">
        <div className="flex items-center gap-2 flex-wrap">
          {BOARDS.map(b => (
            <button
              key={b.key}
              onClick={() => setSelectedBoardKey(b.key)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                selectedBoardKey === b.key
                  ? 'bg-[#16234f] text-white border-[#16234f]'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* Board / History Tabs + New Query Button */}
      <div className="px-6 pt-3 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveView('board')}
            className={`px-3.5 py-1.5 text-sm font-semibold rounded transition-colors ${
              activeView === 'board'
                ? 'text-slate-900 bg-white shadow-sm border border-slate-200'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Board
          </button>
          <button
            onClick={() => setActiveView('history')}
            className={`px-3.5 py-1.5 text-sm font-semibold rounded transition-colors ${
              activeView === 'history'
                ? 'text-slate-900 bg-white shadow-sm border border-slate-200'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            History
          </button>
        </div>

        <button 
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-1.5 bg-[#16234f] hover:bg-[#1f3169] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm"
        >
          <Plus size={16} /> New query
        </button>
      </div>

      {/* Main Kanban Content */}
      <div className="flex-1 px-6 pb-6 overflow-auto">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#16234f]"></div>
          </div>
        ) : activeView === 'board' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Open Column */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="px-5 py-3.5 flex justify-between items-center border-b border-slate-100">
                <h2 className="font-semibold text-slate-900 text-[15px]">Open</h2>
                <span className="text-xs font-bold text-slate-400 bg-slate-100 rounded-full px-2.5 py-0.5">{openTickets.length}</span>
              </div>
              <div className="p-4 space-y-3 min-h-[100px] flex-1">
                {openTickets.length === 0 ? (
                  <p className="text-slate-400 text-sm italic">Nothing here.</p>
                ) : (
                  openTickets.map(ticket => (
                    <TicketCardItem key={ticket.id} ticket={ticket} onClick={() => openTicket(ticket)} urgencyBadge={urgencyBadge} agentsList={agentsList} />
                  ))
                )}
              </div>
            </div>

            {/* In Discussion Column */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="px-5 py-3.5 flex justify-between items-center border-b border-slate-100">
                <h2 className="font-semibold text-slate-900 text-[15px]">In Discussion</h2>
                <span className="text-xs font-bold text-slate-400 bg-slate-100 rounded-full px-2.5 py-0.5">{discussingTickets.length}</span>
              </div>
              <div className="p-4 space-y-3 min-h-[100px] flex-1">
                {discussingTickets.length === 0 ? (
                  <p className="text-slate-400 text-sm italic">Nothing here.</p>
                ) : (
                  discussingTickets.map(ticket => (
                    <TicketCardItem key={ticket.id} ticket={ticket} onClick={() => openTicket(ticket)} urgencyBadge={urgencyBadge} agentsList={agentsList} />
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          /* History View */
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-5 py-3.5 flex justify-between items-center border-b border-slate-100">
              <h2 className="font-semibold text-slate-900 text-[15px]">Resolved</h2>
              <span className="text-xs font-bold text-slate-400 bg-slate-100 rounded-full px-2.5 py-0.5">{resolvedTickets.length}</span>
            </div>
            <div className="p-4 min-h-[100px]">
              {resolvedTickets.length === 0 ? (
                <p className="text-slate-400 text-sm italic">Nothing here.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {resolvedTickets.map(ticket => (
                    <TicketCardItem key={ticket.id} ticket={ticket} onClick={() => openTicket(ticket)} urgencyBadge={urgencyBadge} agentsList={agentsList} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* New Query Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl relative animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between px-6 pt-6 pb-2 border-b border-slate-100">
              <h2 className="text-lg font-bold text-[#16234f]">
                New query · {currentBoard.label}
              </h2>
              <button 
                onClick={() => { setShowNewModal(false); setImages([]); }} 
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="p-6">
              <p className="mb-4 text-sm text-slate-500">
                Raising as <span className="font-semibold text-slate-800">{session?.name || 'Leader'}</span>
              </p>

              <div className="mb-4">
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Urgency</label>
                <select
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white text-slate-900 font-medium px-3 py-2 text-sm outline-none focus:border-[#16234f]"
                >
                  {URGENCIES.map((u) => (
                    <option key={u} value={u} className="text-slate-900 bg-white">{u}</option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Query</label>
                <textarea
                  value={queryText}
                  onChange={(e) => setQueryText(e.target.value)}
                  required
                  rows={5}
                  placeholder="Describe what you need from the leader… (links are auto-detected)"
                  className="w-full resize-y rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 px-3 py-2 text-sm outline-none focus:border-[#16234f]"
                />
              </div>

              <div className="mb-6">
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Attach images (optional)</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {images.map((img, i) => (
                    <div key={i} className="relative w-16 h-16 rounded-lg border border-slate-200 overflow-hidden group">
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
                    className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-300 hover:border-[#16234f] flex flex-col items-center justify-center gap-0.5 text-slate-400 hover:text-[#16234f] transition-colors"
                  >
                    <Plus size={16} />
                    <span className="text-[10px] font-medium">Image</span>
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

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setShowNewModal(false); setImages([]); }}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-[#16234f] hover:bg-[#1f3169] px-5 py-2 text-sm font-semibold text-white transition disabled:opacity-50"
                >
                  {submitting ? 'Raising…' : 'Raise ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ticket Details & Chat Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl h-[80vh] flex flex-col md:flex-row rounded-2xl shadow-2xl relative overflow-hidden">
            <button 
              onClick={() => setSelectedTicket(null)} 
              className="absolute top-4 right-4 z-10 text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>

            {/* Left side: Ticket Details */}
            <div className="w-full md:w-[360px] bg-slate-50 border-r border-slate-200 p-6 flex flex-col overflow-y-auto">
              {(() => {
                const { text, attachments, authorName, authorRole } = parseTicketData(selectedTicket);
                return (
                  <>
                    {/* Prominent Author Banner at the very top */}
                    <div className="mb-4 bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <User size={12} className="text-[#16234f]" /> Raised by
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-[#16234f] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                            {authorName.charAt(0).toUpperCase()}
                          </div>
                          <div className="truncate">
                            <span className="font-bold text-slate-900 text-sm block truncate leading-tight">
                              {authorName}
                            </span>
                            <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-slate-100 text-slate-600 border border-slate-200">
                              {authorRole}
                            </span>
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 border rounded-full shrink-0 ${urgencyBadge(selectedTicket.urgency)}`}>
                          {selectedTicket.urgency}
                        </span>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="font-mono text-xs font-bold px-2.5 py-1 bg-[#16234f] text-white rounded-md">
                          {selectedTicket.code || 'TICKET'}
                        </span>
                        <span className="text-xs font-semibold text-slate-600 bg-slate-200/70 px-2.5 py-0.5 rounded-full">
                          {selectedTicket.board}
                        </span>
                      </div>
                      <div className="flex items-center text-xs text-slate-500 gap-1.5 mt-2">
                        <Calendar size={13} className="text-slate-400" />
                        <span>Raised {new Date(selectedTicket.created_at).toLocaleDateString()} at {new Date(selectedTicket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>

                    {/* Query Content */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4 shadow-xs">
                      <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{text}</p>
                    </div>

                    {/* Attached Images */}
                    {attachments.length > 0 && (
                      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4 shadow-xs">
                        <div className="flex items-center justify-between mb-2.5">
                          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                            <ImageIcon size={14} className="text-[#16234f]" /> Attached Images ({attachments.length})
                          </span>
                          <span className="text-[11px] text-slate-400">Click to view</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {attachments.map((att, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setPreviewImage(att)}
                              className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-100 hover:border-[#16234f] transition-all cursor-pointer text-left focus:outline-none"
                            >
                              <img src={att.preview} alt={att.name || 'Attachment'} className="w-full h-24 object-cover group-hover:scale-105 transition-transform duration-200" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 text-white text-xs font-semibold">
                                <Eye size={15} /> Preview
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}

              <div className="mt-auto pt-4">
                <p className="text-xs text-slate-500 mb-2 font-semibold uppercase tracking-wider">Update Status</p>
                <div className="flex flex-col gap-2">
                  {selectedTicket.status !== 'Open' && (
                    <button 
                      onClick={() => updateTicketStatus(selectedTicket.id, 'Open')} 
                      className="w-full py-2 text-sm rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium transition-colors cursor-pointer"
                    >
                      Move to Open
                    </button>
                  )}
                  {selectedTicket.status !== 'In Discussion' && (
                    <button 
                      onClick={() => updateTicketStatus(selectedTicket.id, 'In Discussion')} 
                      className="w-full py-2 text-sm rounded-lg border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium transition-colors cursor-pointer"
                    >
                      Move to Discussion
                    </button>
                  )}
                  {selectedTicket.status !== 'Resolved' && (
                    <button 
                      onClick={() => updateTicketStatus(selectedTicket.id, 'Resolved')} 
                      className="w-full py-2 text-sm rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium transition-colors cursor-pointer"
                    >
                      Mark as Resolved
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Right side: Messages Thread */}
            <div className="flex-1 flex flex-col h-full">
              <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-white">
                <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                  <MessageSquare size={16} className="text-[#16234f]"/> Discussion Thread
                </h3>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  selectedTicket.status === 'Open' ? 'bg-amber-100 text-amber-700' :
                  selectedTicket.status === 'In Discussion' ? 'bg-blue-100 text-blue-700' :
                  'bg-emerald-100 text-emerald-700'
                }`}>
                  {selectedTicket.status}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <MessageSquare size={32} className="mb-2 opacity-30" />
                    <p className="text-sm">No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map(msg => {
                    let author = 'Member';
                    let body = msg.content;
                    if (body && body.startsWith('[') && body.includes(']: ')) {
                      const closing = body.indexOf(']: ');
                      author = body.substring(1, closing);
                      body = body.substring(closing + 3);
                    } else if (msg.agent_id) {
                      const found = agentsList.find(a => a.id === msg.agent_id);
                      if (found) author = found.name;
                    }

                    const isOwn = (session?.name && author.toLowerCase() === session.name.toLowerCase()) ||
                                  (session?.name && session.name.replace(/\s+/g,'').toLowerCase() === author.replace(/\s+/g,'').toLowerCase());

                    return (
                      <div key={msg.id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                        <span className="text-[11px] font-semibold text-slate-500 mb-0.5 px-1">
                          {author} {isOwn && '(You)'}
                        </span>
                        <div className={`px-4 py-2.5 rounded-2xl max-w-[80%] text-sm ${
                          isOwn 
                            ? 'bg-[#16234f] text-white rounded-br-sm' 
                            : 'bg-white text-slate-800 border border-slate-200 rounded-bl-sm shadow-sm'
                        }`}>
                          {body}
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 px-1">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Message Input */}
              {selectedTicket.status !== 'Resolved' ? (
                <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200 bg-white flex gap-2">
                  <input 
                    type="text" 
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Type your reply..."
                    className="flex-1 border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 rounded-lg px-3 py-2 text-sm focus:border-[#16234f] outline-none"
                  />
                  <button 
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="bg-[#16234f] hover:bg-[#1f3169] disabled:opacity-40 text-white p-2.5 rounded-lg transition-colors"
                  >
                    <Send size={16} />
                  </button>
                </form>
              ) : (
                <div className="p-4 border-t border-slate-200 bg-slate-50 text-center text-sm text-slate-500">
                  This query is resolved. Reopen to continue discussion.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Image Lightbox Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-xs flex flex-col items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setPreviewImage(null)}
        >
          <div 
            className="relative max-w-4xl w-full max-h-[92vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Toolbar */}
            <div className="w-full flex items-center justify-between py-2.5 px-4 bg-slate-900/90 rounded-t-xl text-white">
              <span className="text-xs sm:text-sm font-medium truncate max-w-md">
                📷 {previewImage.name || 'Image Attachment'}
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={previewImage.preview}
                  download={previewImage.name || 'attachment.png'}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-medium transition cursor-pointer"
                >
                  <Download size={14} /> Download
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white transition cursor-pointer"
                  title="Close (Esc)"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Image display */}
            <div className="bg-black/60 w-full flex items-center justify-center p-3 rounded-b-xl overflow-auto max-h-[82vh]">
              <img
                src={previewImage.preview}
                alt={previewImage.name || 'Screenshot'}
                className="max-h-[78vh] max-w-full object-contain rounded shadow-2xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TicketCardItem({ ticket, onClick, urgencyBadge, agentsList = [] }) {
  const marker = '\n\n[ATTACHMENTS]:';
  const rawQuery = ticket.query || '';
  let authorName = 'Member';
  let cleanText = rawQuery;

  // Extract author if encoded
  if (cleanText.includes('[AUTHOR]:')) {
    const startIdx = cleanText.indexOf('[AUTHOR]:') + 9;
    const endIdx = cleanText.indexOf('\n', startIdx);
    const jsonStr = endIdx === -1 ? cleanText.substring(startIdx).trim() : cleanText.substring(startIdx, endIdx).trim();
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.name) authorName = parsed.name;
    } catch {}
    cleanText = endIdx === -1 ? '' : cleanText.substring(endIdx).trim();
  } else if (ticket.created_by) {
    const found = agentsList.find(a => a.id === ticket.created_by);
    if (found) authorName = found.name;
  }

  if (cleanText.startsWith('[QUERY]:')) {
    cleanText = cleanText.replace('[QUERY]:', '').trim();
  }

  const idx = cleanText.indexOf(marker);
  const displayText = idx !== -1 ? cleanText.substring(0, idx).trim() : cleanText;
  const hasAttachments = idx !== -1 || cleanText.includes('[ATTACHMENTS]:');

  return (
    <div 
      onClick={onClick}
      className="bg-slate-50 border border-slate-200 hover:border-[#16234f]/40 hover:shadow-md rounded-lg p-3.5 cursor-pointer transition-all flex flex-col justify-between"
    >
      <div>
        <div className="flex justify-between items-start mb-2">
          <span className="font-mono text-xs font-semibold text-[#16234f]">
            {ticket.code || 'PENDING'}
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 border rounded-full ${urgencyBadge(ticket.urgency)}`}>
            {ticket.urgency}
          </span>
        </div>
        
        <p className="text-sm text-slate-800 line-clamp-3 mb-2 leading-relaxed font-normal">
          {displayText}
        </p>

        {hasAttachments && (
          <span className="inline-flex items-center gap-1 text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md mb-2 font-medium border border-blue-200">
            📷 Image attached
          </span>
        )}
      </div>
      
      <div className="flex justify-between items-center text-xs text-slate-400 pt-2 border-t border-slate-100 mt-1">
        <span className="flex items-center gap-1 font-semibold text-slate-700 truncate max-w-[130px]" title={authorName}>
          <User size={12} className="text-[#16234f]" /> {authorName}
        </span>
        <span className="flex items-center gap-1 shrink-0">
          <Clock size={11}/> {new Date(ticket.created_at).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}
