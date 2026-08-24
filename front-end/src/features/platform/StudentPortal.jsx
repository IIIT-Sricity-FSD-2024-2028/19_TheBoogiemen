import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';

export default function StudentPortal() {
  const { user } = useSelector((state) => state.auth);
  const [profileData, setProfileData] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`/api/students/profile/${user?.user_id || 'u1'}`);
      const data = await res.json();
      setProfileData(data);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-950/60 to-slate-900 p-6 rounded-3xl border border-indigo-800/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold mb-2">
            <span>👨‍🎓 Level 4: Student Hub</span>
          </div>
          <h1 className="text-2xl font-black text-white">Welcome, {profileData?.profile?.first_name || 'John'} {profileData?.profile?.last_name || 'Doe'}</h1>
          <p className="text-xs text-indigo-200/70 mt-1">
            Roll: {user?.user_id || 'u1'} • Branch: {profileData?.profile?.branch || 'CS'} • Batch: {profileData?.profile?.batch || '2022-2026'}
          </p>
        </div>

        <div className="bg-slate-900 px-4 py-2 rounded-2xl border border-indigo-800/50 text-right">
          <div className="text-[10px] text-indigo-400 font-bold uppercase">Current CGPA</div>
          <div className="text-2xl font-black text-emerald-400">{profileData?.profile?.cgpa || 8.5}</div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
          <div className="text-xs text-slate-400 font-semibold">Overall Attendance</div>
          <div className="text-3xl font-black text-emerald-400 mt-2">85%</div>
          <div className="text-[10px] text-emerald-500 mt-1">✓ Safe threshold (Above 75%)</div>
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
          <div className="text-xs text-slate-400 font-semibold">Enrolled Courses</div>
          <div className="text-3xl font-black text-indigo-400 mt-2">{profileData?.enrolledCourses?.length || 4}</div>
          <div className="text-[10px] text-slate-400 mt-1">Active Semester 5</div>
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
          <div className="text-xs text-slate-400 font-semibold">BTP Research Project</div>
          <div className="text-sm font-bold text-white mt-2">Blockchain Academic Records</div>
          <div className="text-[10px] text-amber-400 mt-1">45% Completed • Supervisor: Prof. Jane Smith</div>
        </div>
      </div>

      {/* Coursewise Breakdown */}
      <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-4">
        <h2 className="text-lg font-bold text-white">Enrolled Courses & Academic Performance</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(profileData?.enrolledCourses || [
            { course_code: 'CS201', course_name: 'Data Structures', attendance_percentage: 88 },
            { course_code: 'CS202', course_name: 'Database Systems', attendance_percentage: 82 },
          ]).map((c, i) => (
            <div key={i} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-indigo-400">{c.course_code}</span>
                <span className="text-xs font-bold text-emerald-400">{c.attendance_percentage || 85}% Attendance</span>
              </div>
              <div className="font-bold text-sm text-white">{c.course_name}</div>
              <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: `${c.attendance_percentage || 85}%` }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
