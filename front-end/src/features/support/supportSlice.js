import { createResourceSlice } from '../../app/createResourceSlice';

/**
 * Platform Support data shared by several sections: the queue summary (dashboard,
 * queue header) and the staff list (dashboard, queue assignment, team page).
 */
const { reducer, thunks, selectResource } = createResourceSlice('support', {
  summary: '/platform/summary',
  team: '/platform/team',
});

export const fetchSupportSummary = thunks.summary;
export const fetchSupportTeam = thunks.team;
export const selectSupportResource = selectResource;

export default reducer;
