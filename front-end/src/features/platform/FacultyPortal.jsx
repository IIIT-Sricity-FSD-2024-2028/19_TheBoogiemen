import React, { useState } from 'react';
import { useSelector } from 'react-redux';

export default function FacultyPortal() {
  const { user } = useSelector((state) => state.auth);

  const [attendanceDate, setAttendanceDate] = useState('2026-08-07');
  const [selectedCourse, setSelectedCourse] = useState('c1');
  const [markedStatus, setMarkedStatus] = useState({ u1: 'present', u6: 'absent' });
  const [attendanceSaved, setAttendanceSaved] = useState(false);

  const handleAttendanceSubmit = (e) => {
    e.preventDefault();
    setAttendanceSaved(true);
    setTimeout(() => setAttendanceSaved(false), 3000);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-950/60 to-slate-900 p-6 rounded-3xl border border-emerald-800/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold mb-2">
            <span>👨‍🏫 Level 3: Faculty & Mentor Portal</span>
          </div>
          <h1 className="text-2xl font-black text-white">Prof. Jane Smith Dashboard</h1>
          <p className="text-xs text-emerald-200/70 mt-1">
            Department of Computer Science • Mark attendance, enter marks, and supervise BTP research milestones.
          </p>
        </div>
      </div>

      {/* Attendance Marking Module */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Mark Class Attendance</h2>
              <p className="text-xs text-slate-400">Select course and record daily attendance</p>
            </div>

            {attendanceSaved && (
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold rounded-xl animate-fade-in">
                ✓ Attendance Recorded & Risk Checked!
              </span>
            )}
          </div>

          <form onSubmit={handleAttendanceSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Course</label>
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="c1">CS201 - Data Structures (Sec A)</option>
                  <option value="c2">CS202 - Database Systems (Sec A)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Lecture Date</label>
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            {/* Student Attendance Table */}
            <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="p-3">Student Name</th>
                    <th className="p-3">Roll / ID</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  <tr>
                    <td className="p-3 font-bold">John Doe</td>
                    <td className="p-3 font-mono text-slate-400">u1</td>
                    <td className="p-3">
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => setMarkedStatus({ ...markedStatus, u1: 'present' })}
                          className={`px-3 py-1 rounded-lg text-xs font-bold ${
                            markedStatus.u1 === 'present' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          Present
                        </button>
                        <button
                          type="button"
                          onClick={() => setMarkedStatus({ ...markedStatus, u1: 'absent' })}
                          className={`px-3 py-1 rounded-lg text-xs font-bold ${
                            markedStatus.u1 === 'absent' ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          Absent
                        </button>
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td className="p-3 font-bold">Alice Vance</td>
                    <td className="p-3 font-mono text-slate-400">u6</td>
                    <td className="p-3">
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => setMarkedStatus({ ...markedStatus, u6: 'present' })}
                          className={`px-3 py-1 rounded-lg text-xs font-bold ${
                            markedStatus.u6 === 'present' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          Present
                        </button>
                        <button
                          type="button"
                          onClick={() => setMarkedStatus({ ...markedStatus, u6: 'absent' })}
                          className={`px-3 py-1 rounded-lg text-xs font-bold ${
                            markedStatus.u6 === 'absent' ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          Absent
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all"
            >
              Submit Attendance Entry
            </button>
          </form>
        </div>

        {/* BTP Milestone Supervision Panel */}
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-4">
          <h2 className="text-base font-bold text-white">BTP / Research Supervision</h2>
          <p className="text-xs text-slate-400">State-Machine milestone approval workflow</p>

          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="text-xs font-bold text-indigo-300">Blockchain Academic Records</div>
            <div className="text-[10px] text-slate-400">Student: John Doe (u1)</div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 w-1/2"></div>
            </div>

            <div className="pt-2 flex items-center justify-between text-[10px]">
              <span className="text-slate-400">Milestone: Smart Contract Dev</span>
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">In-Progress</span>
            </div>

            <button
              onClick={() => alert('Milestone approved!')}
              className="w-full py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px]"
            >
              Approve Milestone Status
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
