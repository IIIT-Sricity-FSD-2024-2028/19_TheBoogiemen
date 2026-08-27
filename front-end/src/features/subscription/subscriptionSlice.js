import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const fetchSubscriptionPlansThunk = createAsyncThunk('subscription/fetchPlans', async (_, { rejectWithValue }) => {
  try {
    const res = await fetch('/api/platform/subscriptions/plans');
    return await res.json();
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

export const fetchTokenMeterThunk = createAsyncThunk('subscription/fetchMeter', async (tenantId, { rejectWithValue }) => {
  try {
    const res = await fetch(`/api/platform/tokens/meter?tenant_id=${tenantId || 't1'}`, {
      headers: { 'x-tenant-id': tenantId || 't1' },
    });
    return await res.json();
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

export const upgradeSubscriptionThunk = createAsyncThunk(
  'subscription/upgradeTier',
  async ({ tenant_id, plan_tier }, { rejectWithValue }) => {
    try {
      const res = await fetch('/api/platform/subscriptions/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id, plan_tier }),
      });
      const data = await res.json();
      if (!res.ok) return rejectWithValue(data.message || 'Upgrade failed');
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const initialState = {
  plans: [],
  tokenMeter: null,
  apiKeys: [],
  loading: false,
  error: null,
};

const subscriptionSlice = createSlice({
  name: 'subscription',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSubscriptionPlansThunk.fulfilled, (state, action) => {
        state.plans = action.payload;
      })
      .addCase(fetchTokenMeterThunk.fulfilled, (state, action) => {
        state.tokenMeter = action.payload;
      })
      .addCase(upgradeSubscriptionThunk.fulfilled, (state, action) => {
        if (state.tokenMeter && action.payload.tenant) {
          state.tokenMeter.subscription_tier = action.payload.tenant.subscription_tier;
          state.tokenMeter.monthly_quota = action.payload.tenant.monthly_token_quota;
        }
      });
  },
});

export default subscriptionSlice.reducer;
