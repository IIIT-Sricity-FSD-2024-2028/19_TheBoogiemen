import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchStudentProfile, selectStudentResource } from '../studentSlice';
import { selectCurrentUser } from '../../auth/authSlice';
import { ResourceView, EmptyState } from '../../../shared/ui/StatusViews';
import { displayValue, formatDate, formatStudentId } from '../../../shared/format';

/** custom_fields is an array of { key, label, value } defined by the college. */
const customFields = (p) => (Array.isArray(p.custom_fields) ? p.custom_fields.filter((f) => f && f.key) : []);

export default function StudentProfile() {
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
  const profile = useSelector(selectStudentResource('profile'));

  useEffect(() => {
    dispatch(fetchStudentProfile());
  }, [dispatch]);

  return (
    <>
      <div className="sp-page-header">
        <div>
          <h1 className="sp-page-title">My Profile</h1>
          <p className="sp-page-subtitle">Your record as held by the institute.</p>
        </div>
      </div>

      <ResourceView
        resource={profile}
        onRetry={() => dispatch(fetchStudentProfile({ force: true }))}
        isEmpty={(data) => !data || typeof data !== 'object'}
        empty={<EmptyState title="No profile found" message="The institute has no student record for this account." />}
      >
        {(p) => (
          <>
            <section className="sp-card" aria-labelledby="profile-personal">
              <h2 id="profile-personal" className="sp-section-title">Personal details</h2>
              <dl className="sp-details">
                <div><dt>Full name</dt><dd>{displayValue([p.first_name, p.last_name].filter(Boolean).join(' '))}</dd></div>
                <div><dt>Roll number</dt><dd>{p.roll_no || formatStudentId(p.user_id)}</dd></div>
                <div><dt>Email</dt><dd>{displayValue(p.email || user?.email)}</dd></div>
                <div><dt>Phone</dt><dd>{displayValue(p.phone)}</dd></div>
                <div><dt>Date of birth</dt><dd>{formatDate(p.dob)}</dd></div>
              </dl>
            </section>

            <section className="sp-card sp-section" aria-labelledby="profile-academic">
              <h2 id="profile-academic" className="sp-section-title">Academic details</h2>
              <dl className="sp-details">
                <div><dt>Institute</dt><dd>{displayValue(p.college)}</dd></div>
                <div><dt>Programme</dt><dd>{displayValue(p.programme)}</dd></div>
                <div><dt>Department</dt><dd>{p.department_name ? `${p.department_name}${p.department_code ? ` (${p.department_code})` : ''}` : displayValue(p.branch)}</dd></div>
                <div><dt>Semester</dt><dd>{displayValue(p.semester)}</dd></div>
                <div><dt>Batch</dt><dd>{displayValue(p.batch)}</dd></div>
                <div><dt>Section</dt><dd>{displayValue(p.section)}</dd></div>
                <div><dt>CGPA</dt><dd>{displayValue(p.cgpa)}</dd></div>
                <div><dt>Joined</dt><dd>{formatDate(p.join_date)}</dd></div>
              </dl>
            </section>

            {customFields(p).length > 0 && (
              <section className="sp-card sp-section" aria-labelledby="profile-extra">
                <h2 id="profile-extra" className="sp-section-title">Additional details</h2>
                <dl className="sp-details">
                  {customFields(p).map((f) => (
                    <div key={f.key}><dt>{f.label || f.key}</dt><dd>{displayValue(f.value, 'Not provided')}</dd></div>
                  ))}
                </dl>
              </section>
            )}
          </>
        )}
      </ResourceView>
    </>
  );
}
