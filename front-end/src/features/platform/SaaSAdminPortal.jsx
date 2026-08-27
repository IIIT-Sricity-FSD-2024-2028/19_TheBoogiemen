import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchTenantsThunk } from '../tenant/tenantSlice';
import { fetchSubscriptionPlansThunk } from '../subscription/subscriptionSlice';

export default function SaaSAdminPortal() {
  const dispatch = useDispatch();
  const { allTenants } = useSelector((state) => state.tenant);
  const { plans } = useSelector((state) => state.subscription);

  useEffect(() => {
    dispatch(fetchTenantsThunk());
    dispatch(fetchSubscriptionPlansThunk());
  }, [dispatch]);

  const totalTokens = allTenants.reduce((acc, t) => acc + (t.used_tokens || 0), 0);
  const totalSeats = allTenants.reduce((acc, t) => acc + (t.seats_used || 0), 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-purple-950/40 p-6 rounded-3xl border border-purple-800/50">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold mb-2">
            <span>🌐 Level 0: SaaS Owner Dashboard</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white">Platform Super Admin Control</h1>
          <p className="text-xs text-purple-200/70 mt-1">
            Global management of all subscribed educational institutions, token meters, revenue, and platform health.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="bg-slate-900 px-4 py-2 rounded-2xl border border-purple-800/50 text-right">
            <div className="text-[10px] text-purple-400 uppercase font-bold">Total Tenants</div>
            <div className="text-xl font-extrabold text-white">{allTenants.length} Subscribed</div>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
          <div className="text-xs text-slate-400 font-semibold">Active Subscribed Institutes</div>
          <div className="text-3xl font-black text-white mt-2">{allTenants.length}</div>
          <div className="text-[10px] text-emerald-400 mt-1">100% Operational Uptime</div>
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
          <div className="text-xs text-slate-400 font-semibold">Global Student Seats Active</div>
          <div className="text-3xl font-black text-indigo-400 mt-2">{totalSeats.toLocaleString()}</div>
          <div className="text-[10px] text-slate-500 mt-1">Across all institute tenants</div>
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
          <div className="text-xs text-slate-400 font-semibold">Global API Token Usage</div>
          <div className="text-3xl font-black text-amber-400 mt-2">{totalTokens.toLocaleString()}</div>
          <div className="text-[10px] text-amber-500/80 mt-1">API Requests Processed</div>
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
          <div className="text-xs text-slate-400 font-semibold">Platform Monthly MRR</div>
          <div className="text-3xl font-black text-emerald-400 mt-2">$3,296</div>
          <div className="text-[10px] text-emerald-500 mt-1">+24% MoM Growth</div>
        </div>
      </div>

      {/* Subscribed Institutions Table */}
      <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Subscribed Educational Institutions</h2>
            <p className="text-xs text-slate-400">Manage tenant accounts, seat limits, and token metering</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold border-b border-slate-800">
              <tr>
                <th className="p-4">Institute</th>
                <th className="p-4">Tenant Code</th>
                <th className="p-4">Subscription Tier</th>
                <th className="p-4">Seat Allocation</th>
                <th className="p-4">Token Meter Usage</th>
                <th className="p-4">Status</th>
                <th className="p-4">Valid Until</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {allTenants.map((t) => {
                const percentage = Math.round((t.used_tokens / t.monthly_token_quota) * 100);
                return (
                  <tr key={t.tenant_id} className="hover:bg-slate-800/40">
                    <td className="p-4 font-bold flex items-center space-x-2">
                      <span className="text-xl">{t.logo || '🏫'}</span>
                      <div>
                        <div className="text-slate-100">{t.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{t.domain}</div>
                      </div>
                    </td>
                    <td className="p-4 font-mono font-bold text-indigo-300">{t.code}</td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold">
                        {t.subscription_tier}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="font-bold text-slate-200">{t.seats_used}</span> / <span className="text-slate-400">{t.seats_allocated} seats</span>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-mono text-slate-300">{t.used_tokens?.toLocaleString()} / {t.monthly_token_quota?.toLocaleString()}</span>
                          <span className="font-bold text-amber-400">{percentage}%</span>
                        </div>
                        <div className="w-32 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${percentage > 90 ? 'bg-red-500' : 'bg-emerald-500'}`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase">
                        {t.status}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400 font-mono">{t.valid_until}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
