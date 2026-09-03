import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { X, Edit2, Trash2, Plus, UserPlus } from 'lucide-react';

export default function SettingsPage({ isAdmin = false, currentUser = null }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // Add member form state
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('member');
  const [newPassword, setNewPassword] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Edit member modal state
  const [editingMember, setEditingMember] = useState(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('member');
  const [editPassword, setEditPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch all members
  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('created_at');

      if (error) throw error;
      setMembers(data || []);
    } catch (err) {
      console.error('Error fetching members:', err);
      setErrorMessage(err.message || 'Failed to load team members.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Check if a member is the current user
  const isCurrentUser = (member) => {
    if (!member) return false;

    // Check prop directly
    if (currentUser) {
      if (typeof currentUser === 'string') {
        return (
          member.id === currentUser ||
          member.name?.toLowerCase() === currentUser.toLowerCase()
        );
      }
      if (typeof currentUser === 'object') {
        return (
          (currentUser.id && member.id === currentUser.id) ||
          (currentUser.name && member.name?.toLowerCase() === currentUser.name?.toLowerCase())
        );
      }
    }

    // Fallback: check localStorage and sessionStorage
    try {
      const stored =
        localStorage.getItem('currentUser') ||
        localStorage.getItem('current_user') ||
        localStorage.getItem('member') ||
        localStorage.getItem('user') ||
        sessionStorage.getItem('currentUser') ||
        sessionStorage.getItem('current_user');

      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.id && member.id === parsed.id) return true;
          if (parsed.name && member.name?.toLowerCase() === parsed.name?.toLowerCase()) return true;
        } catch {
          if (member.id === stored || member.name?.toLowerCase() === stored.toLowerCase()) {
            return true;
          }
        }
      }
    } catch (e) {
      // Ignore storage access errors
    }

    return false;
  };

  // Add member
  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newName.trim() || !newPassword.trim()) return;

    try {
      setIsAdding(true);
      setErrorMessage('');
      const { error } = await supabase.from('members').insert([
        {
          name: newName.trim(),
          role: newRole,
          password: newPassword.trim(),
        },
      ]);

      if (error) throw error;

      setNewName('');
      setNewRole('member');
      setNewPassword('');
      await fetchMembers();
    } catch (err) {
      console.error('Error adding member:', err);
      alert(err.message || 'Failed to add member');
    } finally {
      setIsAdding(false);
    }
  };

  // Open edit modal
  const handleOpenEdit = (member) => {
    setEditingMember(member);
    setEditName(member.name || '');
    setEditRole(member.role || 'member');
    setEditPassword(member.password || '');
  };

  // Close edit modal
  const handleCloseEdit = () => {
    setEditingMember(null);
    setEditName('');
    setEditRole('member');
    setEditPassword('');
  };

  // Update member
  const handleUpdateMember = async (e) => {
    e.preventDefault();
    if (!editingMember || !editName.trim() || !editPassword.trim()) return;

    try {
      setIsUpdating(true);
      const updates = {
        name: editName.trim(),
        role: editRole,
        password: editPassword.trim(),
      };

      const { error } = await supabase
        .from('members')
        .update(updates)
        .eq('id', editingMember.id);

      if (error) throw error;

      handleCloseEdit();
      await fetchMembers();
    } catch (err) {
      console.error('Error updating member:', err);
      alert(err.message || 'Failed to update member');
    } finally {
      setIsUpdating(false);
    }
  };

  // Delete member
  const handleDeleteMember = async (id, memberName) => {
    const confirmed = window.confirm(
      `Are you sure you want to remove ${memberName || 'this member'}?`
    );
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchMembers();
    } catch (err) {
      console.error('Error removing member:', err);
      alert(err.message || 'Failed to remove member');
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] text-gray-900 p-6 md:p-10 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage who can sign in. Each person gets their own name and password; only the leader can edit this list.
          </p>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex justify-between items-center">
            <span>{errorMessage}</span>
            <button
              onClick={() => setErrorMessage('')}
              className="text-red-500 hover:text-red-700 font-bold ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Team Members Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Team members</h2>
            <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full font-medium">
              {members.length} {members.length === 1 ? 'member' : 'members'}
            </span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm text-gray-500">
              Loading members...
            </div>
          ) : members.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              No members found.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {members.map((member) => {
                const isYou = isCurrentUser(member);
                return (
                  <div
                    key={member.id}
                    className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/60 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-gray-900 text-sm">
                        {member.name}
                      </span>
                      <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                        {member.role}
                      </span>
                      {isYou && (
                        <span className="text-xs text-gray-400 font-medium">
                          (you)
                        </span>
                      )}
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(member)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-xs cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMember(member.id, member.name)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add a Member Card (Only visible if isAdmin) */}
        {isAdmin && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-[#1e3a5f]" />
              Add a member
            </h2>

            <form onSubmit={handleAddMember}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Name
                  </label>
                  <input
                    type="text"
                    placeholder="Enter name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Role
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent transition-all"
                  >
                    <option value="member">Member</option>
                    <option value="leader">Leader</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Password
                  </label>
                  <input
                    type="text"
                    placeholder="Enter password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isAdding}
                className="w-full py-2.5 px-4 bg-[#1e3a5f] hover:bg-[#162a45] active:bg-[#0f1d30] text-white font-medium text-sm rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                {isAdding ? 'Adding member...' : 'Add member'}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Edit Member Modal */}
      {editingMember && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Edit member</h3>
              <button
                type="button"
                onClick={handleCloseEdit}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateMember} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Role
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent transition-all"
                >
                  <option value="member">Member</option>
                  <option value="leader">Leader</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Password
                </label>
                <input
                  type="text"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseEdit}
                  className="px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-4 py-2 text-xs font-medium text-white bg-[#1e3a5f] hover:bg-[#162a45] rounded-lg transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isUpdating ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
