import { useState, useEffect } from 'react';
import { apiFetch } from '../../api/client';

export default function Courses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadCourses = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch('/students/me/courses');
      setCourses(data || []);
    } catch (err) {
      console.error('Failed to load courses:', err);
      setError('Failed to load courses. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  if (loading) return <div className="loading-spinner">Loading courses...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="stats-card">
      <div className="stats-card-header">
        <h3>Enrolled Courses</h3>
      </div>
      <div className="stats-card-body" style={{ padding: 24 }}>
        {courses.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666', padding: 20 }}>
            No courses enrolled yet. Contact your academic administrator.
          </p>
        ) : (
          <div className="course-list">
            {courses.map((course) => (
              <div key={course.course_id || course.id} className="course-row" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 0',
                borderBottom: '1px solid #eee'
              }}>
                <div>
                  {/* Backend returns `course_name` / `course_code` (snake_cased),
                      not `name` / `code` — reading the wrong keys rendered blanks. */}
                  <h4 style={{ margin: '0 0 4px 0' }}>{course.course_name}</h4>
                  <span style={{ fontSize: '0.85rem', color: '#666' }}>
                    Code: {course.course_code} | Section: {course.section}
                  </span>
                  {course.credits != null && (
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 2 }}>
                      {course.credits} Credits · Sem {course.semester}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: '0.9rem', color: '#333', textAlign: 'right' }}>
                    Faculty: {course.faculty_name || 'TBA'}
                  </div>
                  {course.enrollment_status && (
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      padding: '3px 8px',
                      borderRadius: 4,
                      background: course.enrollment_status === 'active' ? '#e0f2fe' : '#e2e8f0',
                      color: course.enrollment_status === 'active' ? '#0369a1' : '#64748b'
                    }}>
                      {course.enrollment_status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}