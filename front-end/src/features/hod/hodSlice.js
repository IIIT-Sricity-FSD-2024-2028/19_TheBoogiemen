import { createResourceSlice } from '../../app/createResourceSlice';

/** HOD portal data shared across sections: the department dashboard. */
const { reducer, thunks, selectResource } = createResourceSlice('hod', {
  dashboard: '/dashboard/hod',
});

export const fetchHodDashboard = thunks.dashboard;
export const selectHodResource = selectResource;
export default reducer;
