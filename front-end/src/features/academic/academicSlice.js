import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const fetchStudentDashboardThunk = createAsyncThunk('academic/fetchStudent', async (userId, { rejectWithValue }) => {
  try {
    const res = await fetch(`/api/students/profile/${userId || 'u1'}`);
    return await res.json();
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

export const fetchFacultyDashboardThunk = createAsyncThunk('academic/fetchFaculty', async (userId, { rejectWithValue }) => {
  try {
    const res = await fetch(`/api/faculty/dashboard/${userId || 'u2'}`);
    return await res.json();
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

const initialState = {
  studentProfile: null,
  facultyDashboard: null,
  courses: [],
  attendance: [],
  marks: [],
  btpProjects: [],
  loading: false,
  error: null,
};

const academicSlice = createSlice({
  name: 'academic',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchStudentDashboardThunk.fulfilled, (state, action) => {
        state.studentProfile = action.payload;
      })
      .addCase(fetchFacultyDashboardThunk.fulfilled, (state, action) => {
        state.facultyDashboard = action.payload;
      });
  },
});

export default academicSlice.reducer;
