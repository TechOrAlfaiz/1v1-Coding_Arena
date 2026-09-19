/**
 * LoginPage
 * Sleek glassmorphism sign-in card over neural network background.
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        {/* Header Logo */}
        <div className="text-center mb-8">
          <Link to="/lobby" className="inline-flex flex-col items-center gap-2 group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-violet-600 flex items-center justify-center shadow-lg shadow-cyan-500/40 group-hover:scale-105 transition-transform">
              <Zap className="w-6 h-6 text-black fill-black" />
            </div>
            <h1 className="text-3xl font-extrabold text-white font-display tracking-tight group-hover:opacity-90 transition-opacity">
              1v1 <span className="text-gradient-cyan">ARENA</span>
            </h1>
          </Link>
          <p className="text-slate-400 text-xs mt-1 font-mono tracking-wider">
            AUTHENTICATE GLADIATOR ACCESS
          </p>
        </div>

        {/* Glass Card */}
        <div className="glass-panel-glow rounded-3xl p-6 sm:p-8 border border-white/10">
          <h2 className="text-xl font-bold text-white font-display mb-6">Sign In</h2>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="input-icon-left" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="gladiator@arena.dev"
                  className="input input-has-icon text-xs"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
                Secret Passcode
              </label>
              <div className="relative">
                <Lock className="input-icon-left" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input input-has-icon text-xs"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-accent py-3.5 text-sm mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  <span>Connecting to Arena...</span>
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <span>Enter Chamber</span>
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-slate-400 text-xs font-mono">
            New challenger?{' '}
            <Link to="/register" className="text-cyan-400 hover:text-cyan-300 font-bold underline underline-offset-4">
              Enlist Now
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
