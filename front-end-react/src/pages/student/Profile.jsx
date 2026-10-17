/** Profile — ported from legacy fixes.js renderStudentProfile(). */

import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';

export default function Profile() {
  const [student, setStudent] = useState(undefined);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiFetch('/students/me')
      .then(setStudent)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="stats-card">
      <div className="stats-card-header">
        <h3>Student Profile</h3>
      </div>
      <div className="stats-card-body" style={{ padding: 24 }}>
        {error ? (
          <p style={{ color: '#ef4444' }}>Failed to load profile: {error}</p>
        ) : !student ? null : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color: '#fff' }}>
                {(student.first_name || 'S')[0]}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 20 }}>{student.first_name} {student.last_name || ''}</h3>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>
                  {student.branch || 'CSE'} · Batch {student.batch || '2024-2028'} · Section {student.section || 'A'}
                </p>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 14 }}>
              <div><span style={{ color: '#64748b' }}>Student ID</span><div style={{ fontWeight: 600 }}>{student.user_id}</div></div>
              <div><span style={{ color: '#64748b' }}>Email</span><div style={{ fontWeight: 600 }}>{student.email}</div></div>
              <div><span style={{ color: '#64748b' }}>CGPA</span><div style={{ fontWeight: 700, color: '#6366f1', fontSize: 20 }}>{student.cgpa || 'N/A'}</div></div>
              <div><span style={{ color: '#64748b' }}>Phone</span><div style={{ fontWeight: 600 }}>{student.phone || 'Not set'}</div></div>
              <div><span style={{ color: '#64748b' }}>Date of Birth</span><div style={{ fontWeight: 600 }}>{student.dob || 'N/A'}</div></div>
              <div><span style={{ color: '#64748b' }}>Join Date</span><div style={{ fontWeight: 600 }}>{student.join_date || 'N/A'}</div></div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
