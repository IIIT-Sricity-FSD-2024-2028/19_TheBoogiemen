import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetch } from '../../api/client';

/** Combines all of a course's sections' completion rows into one bySection
 *  map, same Promise.all the pre-Redux page's own load() did — the
 *  combining logic lives in the thunk, same pattern as
 *  classPerformanceThunks' fetchClassPerformanceForCourse. */
export const fetchTopicCompletionsForCourse = createAsyncThunk(
  'topicCompletions/fetchForCourse',
  async ({ courseId, sections }) => {
    const perSection = await Promise.all(
      sections.map((sec) => apiFetch(`/topic-completions?course_id=${courseId}&section=${sec}`).then((rows) => [sec, rows])),
    );
    const bySection = {};
    perSection.forEach(([sec, rows]) => {
      bySection[sec] = {};
      rows.forEach((r) => {
        bySection[sec][r.topic_id] = r.progress;
      });
    });
    return bySection;
  },
);

export const setTopicCompletion = createAsyncThunk(
  'topicCompletions/set',
  ({ courseId, section, topicId, progress }) =>
    apiFetch('/topic-completions', {
      method: 'PATCH',
      body: JSON.stringify({ course_id: courseId, section, topic_id: topicId, progress }),
    }).then((record) => ({ courseId, section, topicId, progress: record.progress })),
);
