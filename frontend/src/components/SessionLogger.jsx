import { useState, useCallback } from 'react';
import { useSession, useCreateSession, useAddSet, useEndSession } from '../hooks/useSession';
import { useExerciseHistory } from '../hooks/useExerciseHistory';
import { FacetedSearch } from './FacetedSearch';
import { LoadingState } from './ui/LoadingState';
import { EmptyState } from './ui/EmptyState';
import { ErrorState } from './ui/ErrorState';

const initialSetForm = { weightKg: '', reps: '' };

export function SessionLogger() {
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [setForm, setSetForm] = useState(initialSetForm);
  const [nextSetNumber, setNextSetNumber] = useState(1);
  const [lastIdempotencyKey, setLastIdempotencyKey] = useState(null);

  const { session, status: sessionStatus, error: sessionError, refetch: refetchSession } = useSession(currentSessionId);
  const { create, loading: creatingSession, error: createError } = useCreateSession();
  const { addSet, loading: savingSet, error: addSetError, pendingKey } = useAddSet(
    currentSessionId,
    () => {
      refetchSession();
      setSetForm(initialSetForm);
      setNextSetNumber((n) => n + 1);
    }
  );
  const { endSession, loading: endingSession, error: endError } = useEndSession(currentSessionId, () => {
    setCurrentSessionId(null);
    setSelectedExercise(null);
    setSetForm(initialSetForm);
    setNextSetNumber(1);
  });

  const historyEnabled = !!selectedExercise?.id;
  const { status: historyStatus, data: historyData, refetch: refetchHistory } = useExerciseHistory(
    selectedExercise?.id,
    { limit: 5, enabled: historyEnabled }
  );

  const handleStartSession = useCallback(async () => {
    try {
      const data = await create();
      if (data?.id) setCurrentSessionId(data.id);
    } catch (_) {}
  }, [create]);

  const handleSelectExercise = useCallback((ex) => {
    setSelectedExercise(ex);
    setNextSetNumber(1);
    setSetForm(initialSetForm);
  }, []);

  const handleAddSet = useCallback(async () => {
    if (!currentSessionId || !selectedExercise) return;
    const reps = setForm.reps.trim();
    if (!reps || Number(reps) < 1) return;

    const idempotencyKey = lastIdempotencyKey || `idem-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    setLastIdempotencyKey(idempotencyKey);
    try {
      await addSet(
        {
          exerciseId: selectedExercise.id,
          setNumber: nextSetNumber,
          weightKg: setForm.weightKg.trim() === '' ? null : setForm.weightKg,
          reps: Number(reps),
        },
        idempotencyKey
      );
      setLastIdempotencyKey(null);
    } catch (_) {
      // On retry, reuse same key so backend can dedupe
    }
  }, [currentSessionId, selectedExercise, setForm, nextSetNumber, addSet, lastIdempotencyKey]);

  const isSubmitting = !!savingSet || !!pendingKey;
  const sessionLoaded = sessionStatus === 'success' && session;
  const setsByExercise = session?.exercise_sets ?? session?.sets ?? [];
  const currentExerciseSets = selectedExercise
    ? setsByExercise.filter((s) => s.exercise_id === selectedExercise.id)
    : [];

  return (
    <section className="session-logger" aria-label="Log workout">
      <h2>Workout session</h2>

      {!currentSessionId && (
        <div className="session-logger-start">
          {createError && <ErrorState message={createError} onRetry={handleStartSession} />}
          <button
            type="button"
            className="accent"
            onClick={handleStartSession}
            disabled={creatingSession}
          >
            {creatingSession ? 'Starting…' : 'Start session'}
          </button>
        </div>
      )}

      {currentSessionId && sessionStatus === 'loading' && (
        <LoadingState message="Loading session…" />
      )}
      {currentSessionId && sessionStatus === 'error' && (
        <ErrorState message={sessionError} onRetry={refetchSession} />
      )}

      {currentSessionId && sessionLoaded && (
        <>
          <div className="session-logger-meta">
            <p>Session started {session.started_at ? new Date(session.started_at).toLocaleString() : '—'}</p>
            <button
              type="button"
              className="secondary"
              onClick={() => endSession()}
              disabled={endingSession}
            >
              {endingSession ? 'Ending…' : 'End session'}
            </button>
          </div>

          <FacetedSearch
            onSelectExercise={handleSelectExercise}
            selectedId={selectedExercise?.id}
          />

          {selectedExercise && (
            <div className="session-logger-log">
              <h3>Log: {selectedExercise.name}</h3>

              {/* In-context history */}
              <div className="session-logger-history" aria-label="Previous performance">
                <h4>Previous</h4>
                {historyStatus === 'loading' && <LoadingState message="Loading history…" />}
                {historyStatus === 'error' && (
                  <ErrorState message="Could not load history" onRetry={refetchHistory} />
                )}
                {historyStatus === 'empty' && <p className="muted">No previous logs for this exercise.</p>}
                {historyStatus === 'success' && historyData?.length > 0 && (
                  <ul className="session-logger-history-list">
                    {historyData.map((sess, i) => (
                      <li key={sess.id || i}>
                        <span className="session-logger-history-date">
                          {sess.started_at ? new Date(sess.started_at).toLocaleDateString() : '—'}
                        </span>
                        <span className="session-logger-history-sets">
                          {(sess.sets || []).map((set, j) => (
                            <span key={j} className="set-pill">
                              {set.weight_kg != null ? `${set.weight_kg} kg × ${set.reps}` : `${set.reps} reps`}
                            </span>
                          ))}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Current sets in this session */}
              {currentExerciseSets.length > 0 && (
                <div className="session-logger-current-sets">
                  <h4>This session</h4>
                  <ul>
                    {currentExerciseSets
                      .sort((a, b) => (a.set_number ?? 0) - (b.set_number ?? 0))
                      .map((s) => (
                        <li key={s.id}>
                          Set {s.set_number}: {s.weight_kg != null ? `${s.weight_kg} kg × ` : ''}{s.reps} reps
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              {/* Add set form — retry-safe */}
              <div className="session-logger-form">
                <h4>Add set</h4>
                {addSetError && <ErrorState message={addSetError} onRetry={handleAddSet} />}
                <label>
                  Weight (kg) <input
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="Optional"
                    value={setForm.weightKg}
                    onChange={(e) => setSetForm((f) => ({ ...f, weightKg: e.target.value }))}
                    disabled={isSubmitting}
                  />
                </label>
                <label>
                  Reps <input
                    type="number"
                    min="1"
                    required
                    value={setForm.reps}
                    onChange={(e) => setSetForm((f) => ({ ...f, reps: e.target.value }))}
                    disabled={isSubmitting}
                  />
                </label>
                <button
                  type="button"
                  onClick={handleAddSet}
                  disabled={isSubmitting || !setForm.reps || Number(setForm.reps) < 1}
                >
                  {isSubmitting ? 'Saving…' : `Save set ${nextSetNumber}`}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
