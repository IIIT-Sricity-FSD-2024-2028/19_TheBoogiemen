import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const fetchTenantsThunk = createAsyncThunk('tenant/fetchAll', async (_, { rejectWithValue }) => {
  try {
    const res = await fetch('/api/platform/tenants');
    return await res.json();
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

export const onboardInstituteThunk = createAsyncThunk('tenant/onboard', async (tenantData, { rejectWithValue }) => {
  try {
    const res = await fetch('/api/platform/tenants/onboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tenantData),
    });
    const data = await res.json();
    if (!res.ok) return rejectWithValue(data.message || 'Onboarding failed');
    return data;
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

const initialState = {
  allTenants: [],
  activeTenant: JSON.parse(localStorage.getItem('tenant') || 'null'),
  loading: false,
  error: null,
};

const tenantSlice = createSlice({
  name: 'tenant',
  initialState,
  reducers: {
    setActiveTenant: (state, action) => {
      state.activeTenant = action.payload;
      localStorage.setItem('tenant', JSON.stringify(action.payload));
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTenantsThunk.fulfilled, (state, action) => {
        state.allTenants = action.payload;
      })
      .addCase(onboardInstituteThunk.fulfilled, (state, action) => {
        if (action.payload.tenant) {
          state.allTenants.push(action.payload.tenant);
        }
      });
  },
});

export const { setActiveTenant } = tenantSlice.actions;
export default tenantSlice.reducer;
