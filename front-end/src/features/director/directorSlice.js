import { createResourceSlice } from '../../app/createResourceSlice';

/** Director portal data shared across sections: the college dashboard. */
const { reducer, thunks, selectResource } = createResourceSlice('director', {
  dashboard: '/dashboard/director',
});

export const fetchDirectorDashboard = thunks.dashboard;
export const selectDirectorResource = selectResource;
export default reducer;
