
import React, { useState, useEffect, useMemo } from 'react';
import { TOOLS } from '../constants';
// Fixed: Use namespace import from react-router-dom to resolve "no exported member" errors
import * as ReactRouterDOM from 'react-router-dom';
const { Link } = ReactRouterDOM as any;

import { ArrowUpRight, Clock, Shield, TrendingUp, Target, BrainCircuit, Sparkles, Loader2, BarChart3, Radio, Wifi } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { UserSession } from '../types';
import { getOnyxIQInsight } from '../services/gemini';

interface DashboardProps {
  session: UserSession;
}

type Period = 'LIVE' | '7D' | '30D';

const Dashboard: React.FC<DashboardProps> = ({ session }) => {
  const [iqTips, setIqTips] = useState<{ toolName: string, tip: string }[]>([]);
  const [loadingIQ, setLoadingIQ] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [activePeriod, setActivePeriod] = useState<Period>('LIVE');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const avgIntegrity = session.auditScores.length > 0
    ? (session.auditScores.reduce((a, b) => a + b, 0) / session.auditScores.length).toFixed(1)
    : "100.0";

  const avgGain = session.efficiencyGains.length > 0
    ? (session.efficiencyGains.reduce((a, b) => a + b, 0) / session.efficiencyGains.length).toFixed(1)
    : "0.0";

  const WEEKLY_GOAL = 50;
  const completionPercentage = Math.min(100, Math.floor((session.usageCount / WEEKLY_GOAL) * 100));
  
  const underutilizedTools = [...TOOLS]
      .filter(t => t.id !== 'dashboard' && t.id !== 'logout')
      .sort((a, b) => (session.featureUsage?.[a.id] || 0) - (session.featureUsage?.[b.id] || 0))
      .slice(0, 2);

  const top3Tools = [...TOOLS]
    .filter(t => t.id !== 'dashboard' && t.id !== 'logout')
    .sort((a, b) => (session.featureUsage?.[b.id] || 0) - (session.featureUsage?.[a.id] || 0))
    .slice(0, 3);

  useEffect(() => {
    const CACHE_KEY = 'onyx_iq_cache';

    const fetchIQ = async () => {
      if (underutilizedTools.length === 0) return;

      // The effect re-runs on every mount, so without this the tips would be
      // re-bought each time the dashboard is opened. They only go stale once a
      // tool has actually been used, so the usage count gates the refetch.
      try {
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
        if (cached?.usageCount === session.usageCount && Array.isArray(cached.tips)) {
          setIqTips(cached.tips);
          return;
        }
      } catch { /* unreadable cache — fall through and fetch */ }

      setLoadingIQ(true);
      try {
        const names = underutilizedTools.map(t => t.name);
        const data = await getOnyxIQInsight(names);
        setIqTips(data.tips);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ usageCount: session.usageCount, tips: data.tips }));
        } catch { /* storage unavailable — tips still render, just uncached */ }
      } catch (err) {
        console.error("IQ_FAULT:", err);
      } finally {
        setLoadingIQ(false);
      }
    };
    fetchIQ();
  }, [session.usageCount]);

  const chartData = useMemo(() => {
    const now = Date.now();
    const history = session.usageHistory || [];
    if (activePeriod === 'LIVE') {
      const result = [];
      for (let i = 11; i >= 0; i--) {
        const count = history.filter(h => h.timestamp >= now - (i + 1) * 300000 && h.timestamp < now - i * 300000).length;
        result.push({ name: i === 0 ? 'Now' : `-${i * 5}m`, usage: count });
      }
      return result;
    } else if (activePeriod === '7D') {
      const result = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now - i * 24 * 3600 * 1000);
        const start = new Date(date.setHours(0, 0, 0, 0)).getTime();
        const count = history.filter(h => h.timestamp >= start && h.timestamp < start + 86400000).length;
        result.push({ name: date.toLocaleDateString('en-US', { weekday: 'short' }), usage: count });
      }
      return result;
    } else {
      const result = [];
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now - i * 24 * 3600 * 1000);
        const start = new Date(date.setHours(0, 0, 0, 0)).getTime();
        const count = history.filter(h => h.timestamp >= start && h.timestamp < start + 86400000).length;
        if (i % 5 === 0) result.push({ name: date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }), usage: count });
        else result.push({ name: '', usage: count });
      }
      return result;
    }
  }, [session.usageHistory, activePeriod]);

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-700">
      <header className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Radio size={16} className={`${isOnline ? 'text-emerald-500' : 'text-red-500'} animate-pulse`} />
            <span className={`text-[11px] font-semibold uppercase tracking-[0.4em] ${isOnline ? 'text-emerald-500' : 'text-red-500'}`}>
              Uplink Synchronized
            </span>
          </div>
          <h2 className="text-3xl font-semibold tracking-tight text-zinc-900 leading-none font-display">
            Neural <span className="text-[#0070FF]">Diagnostics</span>
          </h2>
        </div>
        <div className="flex items-center gap-4 glass px-4 py-2 rounded-xl border border-black/5">
           <Wifi className="text-emerald-500" size={18} />
           <div className="h-4 w-[1px] bg-black/5"></div>
           <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Latency: 0.04ms</span>
        </div>
      </header>

      {/* Main Monitoring Deck - Reduced padding from 12 to 6, rounding from 3rem to 2xl */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Neural Cycles', value: session.usageCount, icon: <Clock size={20} />, color: 'text-blue-500', trend: '+12%', path: '/execution-logs' },
          { label: 'Logic Integrity', value: `${avgIntegrity}%`, icon: <Shield size={20} />, color: 'text-emerald-500', trend: 'STABLE', path: '/last-audit' },
          { label: 'Gain Factor', value: `${avgGain}x`, icon: <TrendingUp size={20} />, color: 'text-zinc-900', trend: '+4.2x' },
        ].map((stat, i) => {
          const cardInner = (
            <>
              <div className="flex justify-between items-start mb-6">
                <div className={`p-4 glass rounded-xl ${stat.color} shadow-inner`}>{stat.icon}</div>
                <span className="text-[11px] font-semibold text-zinc-600 uppercase tracking-widest">{stat.trend}</span>
              </div>
              <p className="text-zinc-500 text-[11px] font-semibold uppercase tracking-[0.3em] mb-2">{stat.label}</p>
              <h3 className="text-5xl font-semibold tracking-tight mb-6">{stat.value}</h3>
              <div className="flex items-center justify-between pt-4 border-t border-black/5">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-700">Verification: OK</span>
                <Target size={14} className="text-zinc-800" />
              </div>
            </>
          );
          return (stat as any).path ? (
            <Link key={i} to={(stat as any).path} className="glass p-6 rounded-2xl border border-black/5 group relative overflow-hidden transition-all hover:border-[#0070FF]/60 block">
              {cardInner}
            </Link>
          ) : (
            <div key={i} className="glass p-6 rounded-2xl border border-black/5 group relative overflow-hidden transition-all hover:border-[#0070FF]/40">
              {cardInner}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-2xl border border-zinc-100 relative overflow-hidden shadow-xl">
            <div className="flex justify-between items-center mb-10">
              <div className="flex items-center gap-4">
                <BarChart3 size={24} className="text-zinc-900" />
                <h3 className="text-xl font-semibold tracking-tight text-zinc-900">Throughput</h3>
              </div>
              <div className="flex gap-2">
                 {(['LIVE', '7D', '30D'] as Period[]).map(p => (
                   <button key={p} onClick={() => setActivePeriod(p)} className={`px-4 py-2 text-[10px] font-semibold uppercase tracking-widest rounded-lg border transition-all ${p === activePeriod ? 'neon-bg text-black' : 'glass border-black/10 text-zinc-500 hover:text-black'}`}>
                     {p}
                   </button>
                 ))}
              </div>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="glow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0070FF" stopOpacity={0.4}/>
                      <stop offset="100%" stopColor="#0070FF" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="#A1A1AA" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#A1A1AA" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E4E4E7', borderRadius: '12px' }} itemStyle={{ color: '#0070FF', fontWeight: '900', fontSize: '14px' }} />
                  <Area type="monotone" dataKey="usage" stroke="#0070FF" strokeWidth={3} fill="url(#glow)" dot={{ fill: '#0070FF', r: 4 }} activeDot={{ r: 6, fill: '#0070FF' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-blue p-8 rounded-2xl border border-[#0070FF]/10 relative overflow-hidden group">
            <div className="flex items-center gap-6 mb-8">
              <div className="w-12 h-12 rounded-xl neon-bg flex items-center justify-center text-black shadow-xl"><BrainCircuit size={28} /></div>
              <div>
                <h3 className="text-2xl font-semibold tracking-tight text-zinc-900">Onyx IQ Strategic</h3>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.4em]">Logic Synthesis</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {loadingIQ ? (
                <div className="col-span-2 flex flex-col items-center justify-center py-12">
                   <Loader2 className="animate-spin text-[#0070FF] mb-4" size={32} />
                   <p className="text-[11px] font-black text-zinc-600 uppercase tracking-[0.4em] animate-pulse">Syncing Cores...</p>
                </div>
              ) : iqTips.length > 0 ? iqTips.map((tipObj, idx) => {
                const tool = underutilizedTools[idx];
                if (!tool) return null;
                return (
                  <div key={idx} className="glass p-6 rounded-xl border border-zinc-100 hover:border-[#0070FF]/40 transition-all bg-zinc-50/50">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-3 glass rounded-lg text-zinc-600">{React.cloneElement(tool.icon as React.ReactElement<{ size?: number }>, { size: 16 })}</div>
                      <span className="font-semibold text-xs text-zinc-900 uppercase tracking-widest">{tool.name}</span>
                    </div>
                    <p className="text-zinc-600 text-base leading-relaxed mb-6 italic font-medium">"{tipObj.tip}"</p>
                    <Link to={tool.path} className="flex items-center gap-2 text-[10px] font-semibold text-[#0070FF] uppercase tracking-[0.4em] hover:translate-x-2 transition-all">
                       ACTIVATE PROTOCOL <ArrowUpRight size={14} />
                    </Link>
                  </div>
                );
              }) : (
                <div className="col-span-2 text-center py-12 border border-dashed border-black/5 rounded-xl">
                  <p className="text-[11px] font-black text-zinc-700 uppercase tracking-[0.5em]">Telemetry Nominal</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass p-8 rounded-2xl border border-zinc-100 shadow-xl">
            <h3 className="text-lg font-semibold tracking-tight mb-8 text-zinc-900">Registry Priority</h3>
            <div className="space-y-4">
              {top3Tools.map((tool) => {
                const usageCount = session.featureUsage?.[tool.id] || 0;
                return (
                  <Link key={tool.id} to={tool.path} className="flex items-center justify-between p-5 rounded-xl glass border border-zinc-100 hover:border-[#0070FF]/50 transition-all group overflow-hidden relative">
                    <div className="flex items-center gap-4 relative z-10">
                      <div className="text-zinc-600 group-hover:text-[#0070FF] transition-colors">{React.cloneElement(tool.icon as React.ReactElement<{ size?: number }>, { size: 20 })}</div>
                      <div>
                        <span className="font-semibold text-base block leading-none mb-1 text-zinc-900">{tool.name}</span>
                        <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">{usageCount} Cycles Resolved</span>
                      </div>
                    </div>
                    <ArrowUpRight size={20} className="text-zinc-800 group-hover:text-[#0070FF] transition-all" />
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="glass-blue p-8 rounded-2xl border border-[#0070FF]/10 relative overflow-hidden shadow-xl group">
            <div className="flex items-center gap-3 mb-8">
              <Sparkles size={16} className="text-[#0070FF] animate-pulse" />
              <h4 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-[0.4em]">Efficiency Pulse</h4>
            </div>
            <div className="space-y-6">
              <div className="flex items-end justify-between">
                <div>
                   <span className="text-5xl font-semibold text-zinc-900">{completionPercentage}%</span>
                   <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mt-1">Alignment Alpha</p>
                </div>
              </div>
              <div className="relative h-2 w-full glass rounded-full overflow-hidden border border-black/10">
                <div className={`h-full neon-bg transition-all duration-1000`} style={{ width: `${completionPercentage}%` }}></div>
              </div>
              <div className="p-4 glass rounded-xl border border-zinc-100 bg-zinc-50/50">
                <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-widest leading-relaxed italic">"Cycle velocity is nominal."</p>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
