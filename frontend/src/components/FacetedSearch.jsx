import { useState } from 'react';
import { useExercises } from '../hooks/useExercises';
import { LoadingState } from './ui/LoadingState';
import { EmptyState } from './ui/EmptyState';
import { ErrorState } from './ui/ErrorState';

const CATEGORIES = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', ''];
const EQUIPMENT = ['Barbell', 'Dumbbell', 'Kettlebell', 'Bodyweight', 'Cable', 'Machine', ''];

export function FacetedSearch({ onSelectExercise, selectedId = null }) {
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [equipment, setEquipment] = useState('');
  const [offset, setOffset] = useState(0);

  const { status, data, error, refetch } = useExercises({ q, category, equipment, offset });

  const hasFilters = q || category || equipment;
  const showEmpty = status === 'empty';
  const showError = status === 'error';
  const showLoading = status === 'loading';
  const showResults = status === 'success' && data?.length > 0;

  return (
    <section className="faceted-search" aria-label="Search exercises">
      <h2>Exercise database</h2>
      <div className="faceted-search-filters">
        <input
          type="search"
          placeholder="Search by name…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search exercises by name"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Filter by muscle group"
        >
          <option value="">All muscle groups</option>
          {CATEGORIES.filter(Boolean).map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={equipment}
          onChange={(e) => setEquipment(e.target.value)}
          aria-label="Filter by equipment"
        >
          <option value="">All equipment</option>
          {EQUIPMENT.filter(Boolean).map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
      </div>

      {showLoading && <LoadingState message="Searching exercises…" />}
      {showError && <ErrorState message={error} onRetry={refetch} />}
      {showEmpty && (
        <EmptyState
          message={hasFilters ? 'No exercises match your filters.' : 'No exercises in the database yet.'}
          actionLabel="Clear filters"
          onAction={() => { setQ(''); setCategory(''); setEquipment(''); setOffset(0); }}
        />
      )}

      {showResults && (
        <ul className="faceted-search-results">
          {data.map((ex) => (
            <li key={ex.id}>
              <button
                type="button"
                className={`faceted-search-item ${selectedId === ex.id ? 'selected' : ''}`}
                onClick={() => onSelectExercise?.(ex)}
                aria-pressed={selectedId === ex.id}
              >
                <span className="faceted-search-item-name">{ex.name}</span>
                {(ex.category || ex.equipment) && (
                  <span className="faceted-search-item-meta">
                    {[ex.category, ex.equipment].filter(Boolean).join(' · ')}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
