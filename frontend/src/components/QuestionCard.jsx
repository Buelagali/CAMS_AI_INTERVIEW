const DIFFICULTY_LABELS = { 1: 'Beginner', 2: 'Intermediate', 3: 'Advanced', 4: 'Expert' };
const DIFFICULTY_COLORS = { 1: 'var(--accent-2)', 2: 'var(--accent-4)', 3: 'var(--accent-5)', 4: 'var(--accent-3)' };

export default function QuestionCard({ question, isSpeaking, onRepeat, difficulty }) {
  const typeColors = {
    hr: 'var(--accent-4)',
    technical: 'var(--accent-1)',
    behavioral: 'var(--accent-3)',
    resume: 'var(--accent-2)',
    adaptive: 'var(--accent-5)',
  };

  const diffLabel = DIFFICULTY_LABELS[difficulty] || '';
  const diffColor = DIFFICULTY_COLORS[difficulty] || 'var(--accent-1)';

  return (
    <div className="card question-card" style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span
            style={{
              padding: '4px 14px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              background: `${typeColors[question.type] || 'var(--accent-1)'}22`,
              color: typeColors[question.type] || 'var(--accent-1)',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            {question.type}
          </span>
          {diffLabel && (
            <span
              style={{
                padding: '4px 14px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
                background: `${diffColor}22`,
                color: diffColor,
              }}
            >
              Level {difficulty}: {diffLabel}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {isSpeaking && (
            <div style={{ display: 'flex', gap: 3, alignItems: 'center', padding: '4px 10px', borderRadius: 8, background: 'rgba(0,212,170,0.1)' }}>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="pulse"
                  style={{
                    width: 4,
                    height: 12 + i * 4,
                    background: 'var(--accent-2)',
                    borderRadius: 2,
                    animationDelay: `${i * 0.2}s`,
                  }}
                />
              ))}
              <span style={{ fontSize: 11, color: 'var(--accent-2)', marginLeft: 6 }}>Speaking</span>
            </div>
          )}
          <button
            onClick={onRepeat}
            className="btn-icon"
            title="Repeat question"
          >
            🔊
          </button>
        </div>
      </div>

      <h2 style={{ fontSize: 20, fontWeight: 600, lineHeight: 1.5, marginBottom: 8 }}>
        {question.question}
      </h2>
    </div>
  );
}
