import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchFacultySections, selectFacultyResource } from '../facultySlice';
import { api } from '../../../services/apiClient';
import { apiRequestFailed } from '../../../app/apiActions';

/** The server compares dates in UTC (back-end core/util today()), so the portal does too. */
export const todayIso = () => new Date().toISOString().slice(0, 10);

export function daysAgoIso(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/** Attendance can be marked or changed within this many days (attendance.service EDIT_WINDOW_DAYS). */
export const EDIT_WINDOW_DAYS = 14;

export const sectionLabel = (s) => (s ? `${s.course_code} · Section ${s.section}` : '');

/** Loads the faculty member's own sections (shared through the faculty slice). */
export function useFacultySections() {
  const dispatch = useDispatch();
  const sections = useSelector(selectFacultyResource('sections'));
  useEffect(() => {
    dispatch(fetchFacultySections());
  }, [dispatch]);
  const reload = () => dispatch(fetchFacultySections({ force: true }));
  const list = Array.isArray(sections.data) ? sections.data : [];
  return { resource: sections, list, reload };
}

export function SectionSelect({ id, sections, value, onChange, includeAll, label = 'Section', invalid }) {
  return (
    <div className="sp-field" style={{ minWidth: 240 }}>
      <label htmlFor={id}>{label}</label>
      <select id={id} className="sp-select" value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={invalid ? 'true' : undefined}>
        {includeAll ? <option value="">All my sections</option> : <option value="">Choose a section</option>}
        {sections.map((s) => (
          <option key={s.course_section_id} value={s.course_section_id}>
            {s.course_code} {s.course_name} · Section {s.section}
          </option>
        ))}
      </select>
    </div>
  );
}

export const STATUS_TONE = {
  pending: 'is-warning',
  accepted: 'is-success',
  approved: 'is-success',
  rejected: 'is-danger',
  draft: 'is-neutral',
  published: 'is-success',
  active: 'is-info',
  completed: 'is-success',
  on_hold: 'is-warning',
  'in-progress': 'is-info',
  cancelled: 'is-neutral',
};

export function pctTone(pct, min = 75) {
  if (typeof pct !== 'number') return 'neutral';
  if (pct < min) return 'danger';
  if (pct < min + 10) return 'warning';
  return 'success';
}

/** Rosters of every section the faculty member teaches, one row per enrollment. */
export function useAllRosters(sections, ready) {
  const dispatch = useDispatch();
  const [state, setState] = useState({ status: 'loading', data: null, error: null });
  const [key, setKey] = useState(0);
  const ids = sections.map((s) => s.course_section_id).join(',');

  useEffect(() => {
    if (!ready) return undefined;
    const controller = new AbortController();
    setState((p) => ({ ...p, status: 'loading', error: null }));
    Promise.all(
      sections.map((s) =>
        api.get(`/academics/sections/${encodeURIComponent(s.course_section_id)}/students`, { signal: controller.signal }).then((rows) =>
          (rows || []).map((r) => ({ ...r, course_section_id: s.course_section_id, course_code: s.course_code, class_section: s.section }))
        )
      )
    )
      .then((lists) => setState({ status: 'succeeded', data: lists.flat(), error: null }))
      .catch((err) => {
        if (err.name === 'AbortError') return;
        const error = { message: err.message, status: err.status ?? 0 };
        setState({ status: 'failed', data: null, error });
        dispatch(apiRequestFailed({ ...error, path: '/academics/sections/:id/students', method: 'GET' }));
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids, ready, key, dispatch]);

  const reload = useCallback(() => setKey((k) => k + 1), []);
  return { ...state, reload };
}

