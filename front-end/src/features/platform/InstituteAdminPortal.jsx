import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchHierarchyThunk } from '../hierarchy/hierarchySlice';
import { fetchTokenMeterThunk, upgradeSubscriptionThunk } from '../subscription/subscriptionSlice';

export default function InstituteAdminPortal() {
  const dispatch = useDispatch();
  const { tenant } = useSelector((state) => state.auth);
  const { tokenMeter } = useSelector((state) => state.subscription);
  const { hierarchy, departments, tenantMetrics } = useSelector((state) => state.hierarchy);

  const [apiKeyName, setApiKeyName] = useState('');
  const [apiKeysList, setApiKeysList] = useState([]);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const tenantId = tenant?.tenant_id || 't1';

  useEffect(() => {
    dispatch(fetchHierarchyThunk(tenantId));
    dispatch(fetchTokenMeterThunk(tenantId));
    loadApiKeys();
  }, [dispatch, tenantId]);

  const loadApiKeys = async () => {
    try {
      const res = await fetch(`/api/platform/tokens/keys`, { headers: { 'x-tenant-id': tenantId } });
      const data = await res.json();
      setApiKeysList(data || []);
    } catch (e) {
      console.error('Failed to load API keys', e);
    }
  };

  const handleGenerateKey = async (e) => {
    e.preventDefault();
    if (!apiKeyName) return;
    const res = await fetch('/api/platform/tokens/keys/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-tenant-id': tenantId },
      body: JSON.stringify({ name: apiKeyName }),
    });
    const data = await res.json();
    if (data.success) {
      setApiKeyName('');
      loadApiKeys();
    }
  };

  const handleUpgradeTier = async (newTier) => {
    await dispatch(upgradeSubscriptionThunk({ tenant_id: tenantId, plan_tier: newTier }));
    dispatch(fetchTokenMeterThunk(tenantId));
    setShowUpgradeModal(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Campus Director Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 p-6 rounded-3xl border border-indigo-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-3xl">
            {tenant?.logo || '🏫'}
          </div>
          <div>
            <div className="inline-flex items-center space-x-2 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold uppercase tracking-wider mb-1">
              <span>🏛️ Level 1: Institute Super Admin</span>
            </div>
            <h1 className="text-2xl font-black text-white">{tenant?.name || 'Institute Campus Workspace'}</h1>
            <p className="text-xs text-indigo-200/70 font-mono mt-0.5">
              Code: {tenant?.code} • Domain: {tenant?.domain || 'campus.edu'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowUpgradeModal(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition-all"
          >
            ⭐ Manage Plan ({tokenMeter?.subscription_tier || tenant?.subscription_tier})
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Token Meter Card */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">Token Quota Consumption</span>
            <span className="text-[10px] font-bold text-amber-400">{tokenMeter?.usage_percentage || 0}%</span>
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {tokenMeter?.used_tokens?.toLocaleString() || 0} / {tokenMeter?.monthly_quota?.toLocaleString() || 0}
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full ${
                (tokenMeter?.usage_percentage || 0) >= 90 ? 'bg-red-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${tokenMeter?.usage_percentage || 0}%` }}
            ></div>
          </div>
          <div className="text-[10px] text-slate-400">Monthly token metering active</div>
        </div>

        {/* Seat Usage Card */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-2">
          <div className="text-xs text-slate-400 font-semibold">Active Seat Allocation</div>
          <div className="text-2xl font-black text-indigo-400">
            {tenantMetrics?.seats?.used || 120} <span className="text-xs text-slate-400 font-normal">/ {tenantMetrics?.seats?.allocated || 500} seats</span>
          </div>
          <div className="text-[10px] text-emerald-400 font-medium">
            {tenantMetrics?.seats?.allocated - tenantMetrics?.seats?.used} seats available
          </div>
        </div>

        {/* Departments Card */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-2">
          <div className="text-xs text-slate-400 font-semibold">Academic Departments</div>
          <div className="text-2xl font-black text-purple-400">{departments.length}</div>
          <div className="text-[10px] text-slate-400">Computer Science, Electronics, etc.</div>
        </div>

        {/* Total Faculty & Students */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-2">
          <div className="text-xs text-slate-400 font-semibold">Total Campus Users</div>
          <div className="text-2xl font-black text-emerald-400">
            {(hierarchy.faculty_mentors?.length || 0) + (hierarchy.students?.length || 0)}
          </div>
          <div className="text-[10px] text-slate-400">
            {hierarchy.faculty_mentors?.length || 0} Faculty • {hierarchy.students?.length || 0} Students
          </div>
        </div>
      </div>

      {/* Institutional Hierarchy Breakdown */}
      <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-white">Institutional Actor Hierarchy</h2>
          <p className="text-xs text-slate-400">Multi-tier role delegation: Director → HOD → Faculty → Student → Parent</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Level 1: Director */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-amber-500/30 space-y-3">
            <div className="text-xs font-bold text-amber-300 uppercase tracking-wider">Level 1: Director</div>
            {hierarchy.director_super_admin?.map((u) => (
              <div key={u.user_id} className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                <div className="font-bold text-xs text-white">{u.name || u.username}</div>
                <div className="text-[10px] text-slate-400 font-mono">{u.email}</div>
              </div>
            ))}
          </div>

          {/* Level 2: HODs */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-blue-500/30 space-y-3">
            <div className="text-xs font-bold text-blue-300 uppercase tracking-wider">Level 2: Department Heads (HOD)</div>
            {hierarchy.department_heads?.map((u) => (
              <div key={u.user_id} className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                <div className="font-bold text-xs text-white">{u.name || u.username}</div>
                <div className="text-[10px] text-slate-400 font-mono">{u.email}</div>
              </div>
            ))}
          </div>

          {/* Level 3: Faculty */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-emerald-500/30 space-y-3">
            <div className="text-xs font-bold text-emerald-300 uppercase tracking-wider">Level 3: Faculty Mentors</div>
            {hierarchy.faculty_mentors?.map((u) => (
              <div key={u.user_id} className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                <div className="font-bold text-xs text-white">{u.name || u.username}</div>
                <div className="text-[10px] text-slate-400 font-mono">{u.email}</div>
              </div>
            ))}
          </div>

          {/* Level 4: Students */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-indigo-500/30 space-y-3">
            <div className="text-xs font-bold text-indigo-300 uppercase tracking-wider">Level 4: Enrolled Students</div>
            {hierarchy.students?.map((u) => (
              <div key={u.user_id} className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                <div className="font-bold text-xs text-white">{u.name || u.username}</div>
                <div className="text-[10px] text-slate-400 font-mono">{u.email}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* API Key Management */}
      <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white">API Integration Key Management</h2>
            <p className="text-xs text-slate-400">Generate secure API keys to integrate campus biometric devices, LMS, or ERPs</p>
          </div>

          <form onSubmit={handleGenerateKey} className="flex items-center space-x-2">
            <input
              type="text"
              value={apiKeyName}
              onChange={(e) => setApiKeyName(e.target.value)}
              placeholder="e.g. Attendance Biometric Device"
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              required
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all"
            >
              + Generate Key
            </button>
          </form>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {apiKeysList.map((k) => (
            <div key={k.key_id} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div>
                <div className="font-bold text-xs text-slate-200">{k.name}</div>
                <div className="text-[10px] text-indigo-400 font-mono mt-1 select-all bg-slate-900 px-2 py-0.5 rounded border border-slate-800 inline-block">
                  {k.key_token}
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                {k.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Upgrade Subscription Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md p-6 rounded-3xl shadow-2xl relative space-y-4">
            <button onClick={() => setShowUpgradeModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg font-bold">✕</button>

            <h3 className="text-xl font-bold text-white">Upgrade Subscription Tier</h3>
            <p className="text-xs text-slate-400">Choose a plan tier to expand student seats and token quotas</p>

            <div className="space-y-3 pt-2">
              <button
                onClick={() => handleUpgradeTier('Growth Campus')}
                className="w-full p-4 rounded-2xl bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-500/50 text-left flex items-center justify-between transition-all"
              >
                <div>
                  <div className="font-bold text-sm text-indigo-300">Growth Campus</div>
                  <div className="text-xs text-slate-400">250 Seats • 500,000 API Tokens</div>
                </div>
                <span className="font-extrabold text-white text-sm">$299/mo</span>
              </button>

              <button
                onClick={() => handleUpgradeTier('Enterprise University')}
                className="w-full p-4 rounded-2xl bg-purple-950/40 hover:bg-purple-900/60 border border-purple-500/50 text-left flex items-center justify-between transition-all"
              >
                <div>
                  <div className="font-bold text-sm text-purple-300">Enterprise University</div>
                  <div className="text-xs text-slate-400">5,000 Seats • 5,000,000 API Tokens</div>
                </div>
                <span className="font-extrabold text-white text-sm">$799/mo</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
