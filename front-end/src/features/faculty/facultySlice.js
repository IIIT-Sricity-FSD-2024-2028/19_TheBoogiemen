import { createResourceSlice } from '../../app/createResourceSlice';

/**
 * Faculty server data shared by several Faculty Portal views.
 *
 *   dashboard  GET /api/dashboard/faculty   Dashboard, Students (at-risk list)
 *   sections   GET /api/academics/sections  My Sections, Attendance, Assessments, Students
 *
 * Data used by a single view stays in that view via useApiResource.
 */
const { reducer, thunks, selectResource, actions } = createResourceSlice('faculty', {
  dashboard: '/dashboard/faculty',
  sections: '/academics/sections',
});

export const fetchFacultyDashboard = thunks.dashboard;
export const fetchFacultySections = thunks.sections;
export const selectFacultyResource = selectResource;
export const { setResourceData: setFacultyResourceData } = actions;

export default reducer;
