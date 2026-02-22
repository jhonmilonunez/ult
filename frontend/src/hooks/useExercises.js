import { useState, useEffect, useCallback } from 'react';
import { apiFetch, buildQuery } from '../api/client';

const LIMIT = 20;

export function useExercises(filters = {}) {
  const { q = '', category = '', equipment = '', offset = 0 } = filters;
  const [state, setState] = useState({
    status: 'idle', // 'idle' | 'loading' | 'empty' | 'success' | 'error'
    data: null,
    error: null,
  });

  const fetchExercises = useCallback(async () => {
    setState((s) => ({ ...s, status: 'loading', error: null }));
    try {
      const query = buildQuery({ q, category, equipment, limit: LIMIT, offset });
      const data = await apiFetch(`/api/exercises${query}`);
      const list = Array.isArray(data) ? data : data?.items ?? [];
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
        error: err.message || 'Failed to load exercises',
      });
      throw err;
    }
  }, [q, category, equipment, offset]);

  useEffect(() => {
    fetchExercises();
  }, [fetchExercises]);

  return {
    ...state,
    refetch: fetchExercises,
  };
}
