import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import { Lock, User, AlertCircle, Loader2 } from 'lucide-react';

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanUser = username.trim();
    if (!cleanUser) {
      setError('Please enter your username.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);

    try {
      // 1. Check if any members exist
      const { data: allMembers, error: listErr } = await supabase
        .from('members')
        .select('*');

      if (listErr) {
        throw listErr;
      }

      // If database has no members at all, auto-seed Pranav Bhat if he is logging in
      if (!allMembers || allMembers.length === 0) {
        if (cleanUser.toLowerCase() === 'pranav bhat' || cleanUser.toLowerCase() === 'pranav') {
          const { data: seeded, error: seedErr } = await supabase
            .from('members')
            .insert([{
              name: 'Pranav Bhat',
              role: 'leader',
              password: password || '334'
            }])
            .select();

          if (seedErr) throw seedErr;
          if (seeded && seeded.length > 0) {
            onLogin(seeded[0]);
            return;
          }
        } else {
          setError('No users found in the system yet. Please have Leader Pranav Bhat sign in first.');
          setLoading(false);
          return;
        }
      }

      // 2. Find member by name (case-insensitive and space-flexible)
      const matched = allMembers.find(
        (m) => m.name && (
          m.name.trim().toLowerCase() === cleanUser.toLowerCase() ||
          m.name.replace(/\s+/g, '').toLowerCase() === cleanUser.replace(/\s+/g, '').toLowerCase()
        )
      );

      if (!matched) {
        setError(`User "${cleanUser}" not found. Please contact Leader Pranav Bhat to create your account.`);
        setLoading(false);
        return;
      }

      // 3. Verify password
      if (matched.password !== password) {
        setError('Incorrect password. Please try again.');
        setLoading(false);
        return;
      }

      // 4. Successful login
      onLogin(matched);
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Could not reach database. Please check connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSetupLeader = async () => {
    setSeeding(true);
    setError('');
    try {
      const { data: existing } = await supabase
        .from('members')
        .select('*')
        .ilike('name', 'Pranav Bhat');

      if (existing && existing.length > 0) {
        setUsername('Pranav Bhat');
        setPassword(existing[0].password || '334');
        setError('Leader account already exists! Password pre-filled, click Sign In.');
        setSeeding(false);
        return;
      }

      const { data, error } = await supabase
        .from('members')
        .insert([{
          name: 'Pranav Bhat',
          role: 'leader',
          password: '334'
        }])
        .select();

      if (error) throw error;
      if (data && data.length > 0) {
        onLogin(data[0]);
      }
    } catch (err) {
      console.error('Seed error:', err);
      setError('Could not initialize leader account. Please ensure the "members" table is created in Supabase.');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#0a0a1a] relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#c9a227]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in duration-300">
        {/* Header Branding */}
        <div className="text-center mb-8 flex flex-col items-center">
          <img
            src="/logo.png"
            alt="Lextria Logo"
            className="w-16 h-16 rounded-full object-cover shadow-2xl border-2 border-white/20 mb-4"
          />
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Lextria Task &amp; Query Manager
          </h1>
          <p className="text-slate-400 text-sm mt-1.5">
            Enter your credentials to sign in to your workspace
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-[#121629]/90 border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Input */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. Pranav Bhat or Anusha"
                  required
                  autoFocus
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition text-sm"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition text-sm"
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs leading-relaxed animate-in fade-in">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-semibold py-2.5 rounded-xl shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Verifying credentials…</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>

          {/* Quick Setup for Leader fallback */}
          <div className="mt-6 pt-5 border-t border-white/5 text-center">
            <button
              type="button"
              onClick={handleQuickSetupLeader}
              disabled={seeding}
              className="text-xs text-slate-400 hover:text-amber-300 transition-colors"
            >
              {seeding ? 'Setting up…' : 'Initialize Leader (Pranav Bhat)'}
            </button>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-slate-600 mt-6">
          Lextria Research Workspace &bull; Only authorized personnel
        </p>
      </div>
    </div>
  );
}
