import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetch } from '../../api/client';

/**
 * Dashboard.jsx's SyllabusTracker only — one /topic-completions fetch per
 * enrolled course, each returning topics already merged with this
 * section's completion % (getTopicsWithCompletion on the backend), so
 * `modules` here keeps each row's title, unlike features/topicCompletions'
 * byCourse (built for Dev 4's faculty Dashboard.jsx), which intentionally
 * discards the title and keeps only progress keyed by topic_id. Different
 * real need, so a separate fetch rather than bending that slice's shape.
 *
 * Takes the already-resolved courses + default section as args — the
 * component fetches studentCourses/studentProfile first (shared slices)
 * and passes their resolved values in here.
 */
export const fetchMySyllabusProgress = createAsyncThunk(
  'studentSyllabus/fetch',
  async ({ courses, defaultSection }) => {
    const combined = await Promise.all(
      (courses || []).map(async (c) => {
        const courseSec = c.section || defaultSection;
        const topics = await apiFetch(`/topic-completions?course_id=${c.course_id}&section=${courseSec}`).catch(() => []);
        const overall = topics.length ? Math.round(topics.reduce((s, t) => s + (t.progress || 0), 0) / topics.length) : 0;
        return {
          course_id: c.course_id,
          course_code: c.course_code || '',
          course_name: c.course_name || '',
          section: courseSec,
          faculty_name: c.faculty_name,
          progress: overall,
          modules: topics.map((t) => ({ name: t.title, progress: t.progress })),
        };
      }),
    );
    return combined;
  },
);
