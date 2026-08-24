import React from 'react';
import { useSelector } from 'react-redux';

export default function ParentPortal() {
  const { user } = useSelector((state) => state.auth);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-950/60 to-slate-900 p-6 rounded-3xl border border-pink-800/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-pink-500/20 text-pink-300 text-xs font-bold mb-2">
            <span>👪 Level 5: Parent & Guardian Portal</span>
          </div>
          <h1 className="text-2xl font-black text-white">Student Progress Report: John Doe (u1)</h1>
          <p className="text-xs text-pink-200/70 mt-1">
            Parent Account: {user?.name || 'Mr. Mark Doe'} • Linked Student: John Doe (CS2022-01)
          </p>
        </div>

        <div className="bg-slate-900 px-4 py-2 rounded-2xl border border-pink-800/50 text-right">
          <div className="text-[10px] text-pink-400 font-bold uppercase">Fee Compliance Status</div>
          <div className="text-sm font-bold text-emerald-400">✓ Up to Date</div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
          <div className="text-xs text-slate-400 font-semibold">Attendance Summary</div>
          <div className="text-3xl font-black text-emerald-400 mt-2">85%</div>
          <div className="text-[10px] text-emerald-500 mt-1">Sufficient attendance (Risk Threshold: 75%)</div>
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
          <div className="text-xs text-slate-400 font-semibold">Cumulative Grade (CGPA)</div>
          <div className="text-3xl font-black text-indigo-400 mt-2">8.5</div>
          <div className="text-[10px] text-slate-400 mt-1">First Class with Distinction</div>
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
          <div className="text-xs text-slate-400 font-semibold">Pending Semester Dues</div>
          <div className="text-3xl font-black text-white mt-2">₹1,50,000</div>
          <div className="text-[10px] text-amber-400 mt-1">Due Date: 01 June 2026</div>
        </div>
      </div>
    </div>
  );
}
