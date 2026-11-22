/**
 * createFetchThunk.js — REDUX_MIGRATION_PLAN.md §4: cuts the boilerplate
 * for the common "fetch a list" shape across ~20 backend domains. Optional
 * sugar — a domain whose endpoint needs query params or a POST body still
 * hand-writes its own createAsyncThunk; this only covers a plain GET.
 */
import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetch } from '../api/client';

export const createFetchThunk = (typePrefix, endpointFn) =>
  createAsyncThunk(typePrefix, (arg) => apiFetch(typeof endpointFn === 'function' ? endpointFn(arg) : endpointFn));
