export default function QuestionCard({ question, isSpeaking, onRepeat }) {
  const typeColors = {
    hr: 'var(--accent-4)',
    technical: 'var(--accent-1)',
    behavioral: 'var(--accent-3)',
    resume: 'var(--accent-2)',
    adaptive: 'var(--accent-5)',
  };

  return (
    <div className="card" style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
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
        <div style={{ display: 'flex', gap: 8 }}>
          {isSpeaking && (
            <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
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
            </div>
          )}
          <button
            onClick={onRepeat}
            style={{
              background: 'none',
              border: '1px solid var(--glass-border)',
              borderRadius: 8,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '6px 10px',
              fontSize: 14,
              transition: 'all 0.3s ease',
            }}
            title="Repeat question"
          >
            🔊
          </button>
        </div>
      </div>

      <h2 style={{ fontSize: 20, fontWeight: 600, lineHeight: 1.5, marginBottom: 8 }}>
        {question.question}
      </h2>

      {isSpeaking && (
        <p style={{ color: 'var(--accent-2)', fontSize: 13, marginTop: 12 }}>
          AI Interviewer is speaking...
        </p>
      )}
    </div>
  );
}
