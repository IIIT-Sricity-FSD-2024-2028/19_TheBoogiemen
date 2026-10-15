// front-end-react/src/pages/student/Courses.jsx
import { useState, useEffect } from 'react';
import { apiFetch } from '../../api/client'; // Adjust path if your api utility is located elsewhere

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
          <p style={{ textAlign: 'center', color: '#888', padding: '20px 0' }}>
            No courses enrolled. Please contact your academic head or admin to be assigned to a course section.
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
                  <h4 style={{ margin: '0 0 4px 0' }}>{course.name}</h4>
                  <span style={{ fontSize: '0.85rem', color: '#666' }}>
                    Code: {course.code} | Section: {course.section}
                  </span>
                </div>
                <div style={{ fontSize: '0.9rem', color: '#333' }}>
                  Faculty: {course.faculty_name || 'TBA'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}