import { stageStateLabel, type Stage } from './race-week';

const marks = { completed: '✓', current: '●', upcoming: '○' } as const;

// Race-week progression. State is conveyed by text and symbol, not colour alone.
export function StageTimeline({
  stages,
  compact = false,
}: {
  stages: Stage[];
  compact?: boolean;
}) {
  return (
    <ol
      className={`stage-timeline${compact ? ' is-compact' : ''}`}
      aria-label="Race-week progress"
    >
      {stages.map((s) => (
        <li
          key={s.id}
          data-state={s.state}
          aria-current={s.state === 'current' ? 'step' : undefined}
        >
          <span className="stage-mark" aria-hidden="true">
            {marks[s.state]}
          </span>
          <span className="stage-name">{s.label}</span>
          <span className="stage-state">{stageStateLabel[s.state]}</span>
        </li>
      ))}
    </ol>
  );
}
