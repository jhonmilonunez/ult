import { useState, useEffect, useCallback } from 'react';
import { apiFetch, buildQuery } from '../api/client';

export function useExerciseHistory(exerciseId, options = {}) {
  const { limit = 10, enabled = true } = options;
  const [state, setState] = useState({
    status: 'idle', // 'idle' | 'loading' | 'empty' | 'success' | 'error'
    data: null,
    error: null,
  });

  const fetchHistory = useCallback(async () => {
    if (!exerciseId || !enabled) {
      setState({ status: 'idle', data: null, error: null });
      return null;
    }
    setState((s) => ({ ...s, status: 'loading', error: null }));
    try {
      const query = buildQuery({ limit });
      const data = await apiFetch(
        `/api/users/me/exercises/${exerciseId}/history${query}`
      );
      const list = Array.isArray(data) ? data : data?.sessions ?? [];
      setState({
        status: list.length === 0 ? 'empty' : 'success',
        data: list,
        error: null,
      });
      return list;
    } catch (err) {
      setState({
        status: 'error',
        data: null,
        error: err.message || 'Failed to load history',
      });
      throw err;
    }
  }, [exerciseId, limit, enabled]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return {
    ...state,
    refetch: fetchHistory,
  };
}
