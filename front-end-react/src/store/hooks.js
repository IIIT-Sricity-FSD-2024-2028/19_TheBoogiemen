/**
 * store/hooks.js — plain re-exports (REDUX_MIGRATION_PLAN.md §3 calls these
 * useAppDispatch/useAppSelector "or plain for JS"). This is a JS codebase,
 * so there's no type augmentation to gain from wrapping them — the names
 * exist so every slice imports from one place, not `react-redux` directly,
 * keeping a single swap point if that ever needs to change.
 */
import { useDispatch, useSelector } from 'react-redux';

export const useAppDispatch = () => useDispatch();
export const useAppSelector = useSelector;
