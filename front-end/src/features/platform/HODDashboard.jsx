import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchHierarchyThunk } from '../hierarchy/hierarchySlice';

export default function HODDashboard() {
  const dispatch = useDispatch();
  const { tenant, user } = useSelector((state) => state.auth);
  const { departments, hierarchy } = useSelector((state) => state.hierarchy);

  const [coursesList, setCoursesList] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState('');

  const tenantId = tenant?.tenant_id || 't1';

  useEffect(() => {
    dispatch(fetchHierarchyThunk(tenantId));
    loadCourses();
  }, [dispatch, tenantId]);

  const loadCourses = async () => {
    try {
      const res = await fetch('/api/admin/courses', { headers: { role: 'head', 'user-id': user?.user_id || 'u4' } });
      const data = await res.json();
      setCoursesList(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAssignFaculty = (e) => {
    e.preventDefault();
    if (!selectedCourse || !selectedFaculty) return;
    setCoursesList((prev) =>
      prev.map((c) =>
        c.course_id === selectedCourse
          ? { ...c, faculty_name: hierarchy.faculty_mentors?.find((f) => f.user_id === selectedFaculty)?.name || 'Assigned Faculty' }
          : c
      )
    );
    alert('Faculty assigned successfully to course!');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-950/60 to-slate-900 p-6 rounded-3xl border border-blue-800/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold mb-2">
            <span>🎓 Level 2: Department Admin / HOD Control</span>
          </div>
          <h1 className="text-2xl font-black text-white">Computer Science Department Control</h1>
          <p className="text-xs text-blue-200/70 mt-1">
            Oversee department curriculum, allocate faculty to courses, monitor student risk thresholds, and review batch progress.
          </p>
        </div>
      </div>

      {/* Course Faculty Allocation Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Assign Faculty Form */}
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-4">
          <h2 className="text-base font-bold text-white">Course Faculty Allocation</h2>
          <p className="text-xs text-slate-400">Map department faculty to curriculum courses</p>

          <form onSubmit={handleAssignFaculty} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Select Course</label>
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                required
              >
                <option value="">-- Choose Course --</option>
                {coursesList.map((c) => (
                  <option key={c.course_id} value={c.course_id}>
                    {c.course_code} - {c.course_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Assign Faculty Member</label>
              <select
                value={selectedFaculty}
                onChange={(e) => setSelectedFaculty(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                required
              >
                <option value="">-- Choose Faculty --</option>
                {hierarchy.faculty_mentors?.map((f) => (
                  <option key={f.user_id} value={f.user_id}>
                    {f.name || f.username} ({f.email})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all"
            >
              Assign Faculty Member
            </button>
          </form>
        </div>

        {/* Department Courses List */}
        <div className="lg:col-span-2 bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-4">
          <h2 className="text-base font-bold text-white">Department Course Offerings</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {coursesList.map((c) => (
              <div key={c.course_id} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-blue-400">{c.course_code}</span>
                  <span className="text-[10px] text-slate-400">{c.credits} Credits</span>
                </div>
                <div className="font-bold text-sm text-white">{c.course_name}</div>
                <div className="text-xs text-slate-400 flex items-center justify-between pt-2 border-t border-slate-900">
                  <span>Instructor:</span>
                  <span className="font-semibold text-emerald-400">{c.faculty_name || 'Unassigned'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
