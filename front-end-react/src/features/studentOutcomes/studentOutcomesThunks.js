import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetch } from '../../api/client';

export const fetchMyOutcomes = createAsyncThunk('studentOutcomes/fetch', () => apiFetch('/students/me/outcomes'));
