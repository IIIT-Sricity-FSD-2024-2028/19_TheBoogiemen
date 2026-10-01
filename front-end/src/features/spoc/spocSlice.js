import { createResourceSlice } from '../../app/createResourceSlice';

/**
 * SPOC server data shared by several SPOC Portal views.
 *
 *   overview  GET /api/college/overview   Dashboard, Setup wizard, Subscription
 *             (college, subscription, seats, people counts, setup progress, payments)
 *
 * Everything else (people, settings, plans) is local to one view via useApiResource.
 */
const { reducer, thunks, selectResource } = createResourceSlice('spoc', {
  overview: '/college/overview',
});

export const fetchSpocOverview = thunks.overview;
export const selectSpocResource = selectResource;

export default reducer;
