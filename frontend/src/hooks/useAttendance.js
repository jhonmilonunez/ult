import { useState, useEffect, useCallback } from 'react';
import { apiFetch, buildQuery } from '../api/client';

function getMonthRange(date) {
  const d = new Date(date);
  const from = new Date(d.getFullYear(), d.getMonth(), 1);
  const to = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export function useAttendance(monthDate = new Date()) {
  const { from, to } = getMonthRange(monthDate);
  const [state, setState] = useState({
    status: 'idle', // 'idle' | 'loading' | 'empty' | 'success' | 'error'
    data: null,
    error: null,
  });

  const fetchAttendance = useCallback(async () => {
    setState((s) => ({ ...s, status: 'loading', error: null }));
    try {
      const query = buildQuery({ from, to });
      const data = await apiFetch(`/api/users/me/attendance${query}`);
      const list = Array.isArray(data) ? data : data?.dates ?? [];
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
        error: err.message || 'Failed to load attendance',
      });
      throw err;
    }
  }, [from, to]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  return {
    ...state,
    refetch: fetchAttendance,
  };
}
