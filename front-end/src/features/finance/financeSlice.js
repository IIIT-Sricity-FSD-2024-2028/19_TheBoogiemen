import { createResourceSlice } from '../../app/createResourceSlice';

/**
 * Finance server data shared by several Finance Portal views.
 *
 *   summary     GET /api/fees/summary      Dashboard, Dues & reminders
 *   structures  GET /api/fees/structures   Fee structures
 *
 * Fee records, payments and people are loaded per view with useApiResource.
 */
const { reducer, thunks, selectResource } = createResourceSlice('finance', {
  summary: '/fees/summary',
  structures: '/fees/structures',
});

export const fetchFeeSummary = thunks.summary;
export const fetchFeeStructures = thunks.structures;
export const selectFinanceResource = selectResource;

export default reducer;
