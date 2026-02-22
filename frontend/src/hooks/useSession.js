import { useState, useCallback } from 'react';
import { apiFetch } from '../api/client';

/**
 * Generate a simple idempotency key for retry-safe POSTs.
 * Caller can pass the same key on retry to avoid duplicate sets.
 */
export function useIdempotencyKey() {
  const [lastKey, setLastKey] = useState(null);
  const generate = useCallback(() => {
    const key = `idem-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    setLastKey(key);
    return key;
  }, []);
  return { generate, lastKey };
}

export function useSession(sessionId) {
  const [session, setSession] = useState(null);
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
  const [error, setError] = useState(null);

  const fetchSession = useCallback(async () => {
    if (!sessionId) {
      setSession(null);
      setStatus('idle');
      setError(null);
      return null;
    }
    setStatus('loading');
    setError(null);
    try {
      const data = await apiFetch(`/api/sessions/${sessionId}`);
      setSession(data);
      setStatus('success');
      return data;
    } catch (err) {
      setError(err.message || 'Failed to load session');
      setStatus('error');
      setSession(null);
      throw err;
    }
  }, [sessionId]);

  return { session, status, error, refetch: fetchSession };
}

export function useCreateSession() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const create = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch('/api/sessions', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      return data;
    } catch (err) {
      setError(err.message || 'Failed to start session');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { create, loading, error };
}

export function useAddSet(sessionId, onSuccess) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pendingKey, setPendingKey] = useState(null); // idempotency key in flight

  const addSet = useCallback(
    async (payload, idempotencyKey = null) => {
      if (!sessionId) return;
      const key = idempotencyKey || `idem-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      setPendingKey(key);
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch(`/api/sessions/${sessionId}/sets`, {
          method: 'POST',
          headers: { 'Idempotency-Key': key },
          body: JSON.stringify({
            exercise_id: payload.exerciseId,
            set_number: payload.setNumber,
            weight_kg: payload.weightKg != null ? Number(payload.weightKg) : null,
            reps: Number(payload.reps),
          }),
        });
        onSuccess?.(data);
        return data;
      } catch (err) {
        setError(err.message || 'Failed to save set');
        throw err;
      } finally {
        setLoading(false);
        setPendingKey(null);
      }
    },
    [sessionId, onSuccess]
  );

  return { addSet, loading, error, pendingKey };
}

export function useEndSession(sessionId, onSuccess) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const endSession = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        body: JSON.stringify({ ended_at: new Date().toISOString() }),
      });
      onSuccess?.(data);
      return data;
    } catch (err) {
      setError(err.message || 'Failed to end session');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [sessionId, onSuccess]);

  return { endSession, loading, error };
}
