export default function FeedbackCard({ feedback }) {
  if (!feedback || !feedback.strengths) return null;

  const sectionStyle = {
    marginBottom: 24,
    padding: 20,
    background: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 'var(--radius-sm)',
  };

  const tagStyle = (color) => ({
    padding: '6px 14px',
    borderRadius: 20,
    fontSize: 13,
    background: `${color}22`,
    color,
    border: `1px solid ${color}44`,
  });

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <h3 style={{ fontSize: 18, marginBottom: 20, color: 'var(--text-secondary)' }}>
        AI-Generated Feedback
      </h3>

      <div style={sectionStyle}>
        <h4 style={{ fontSize: 14, color: 'var(--accent-2)', marginBottom: 12 }}>
          Strengths
        </h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {feedback.strengths.map((s, i) => (
            <span key={i} style={tagStyle('var(--accent-2)')}>{s}</span>
          ))}
        </div>
      </div>

      <div style={sectionStyle}>
        <h4 style={{ fontSize: 14, color: 'var(--accent-3)', marginBottom: 12 }}>
          Areas for Improvement
        </h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {feedback.weaknesses?.map((w, i) => (
            <span key={i} style={tagStyle('var(--accent-3)')}>{w}</span>
          ))}
        </div>
      </div>

      <div style={sectionStyle}>
        <h4 style={{ fontSize: 14, color: 'var(--accent-4)', marginBottom: 12 }}>
          Recommended Skills
        </h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {feedback.recommendedSkills?.map((s, i) => (
            <span key={i} style={tagStyle('var(--accent-4)')}>{s}</span>
          ))}
        </div>
      </div>

      <div style={sectionStyle}>
        <h4 style={{ fontSize: 14, color: 'var(--accent-5)', marginBottom: 12 }}>
          Improvement Plan
        </h4>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {feedback.improvementAreas?.map((area, i) => (
            <li
              key={i}
              style={{
                padding: '8px 0',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                color: 'var(--text-secondary)',
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <span style={{ color: 'var(--accent-5)', fontSize: 16 }}>→</span>
              {area}
            </li>
          ))}
        </ul>
      </div>

      <div style={sectionStyle}>
        <h4 style={{ fontSize: 14, color: 'var(--text-primary)', marginBottom: 12 }}>
          Interview Summary
        </h4>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7 }}>
          {feedback.summary}
        </p>
      </div>

      <div
        style={{
          textAlign: 'center',
          padding: 16,
          borderRadius: 'var(--radius-sm)',
          background: 'linear-gradient(135deg, rgba(108,99,255,0.15), rgba(0,212,170,0.15))',
        }}
      >
        <span style={{ fontSize: 14, color: 'var(--text-muted)', marginRight: 12 }}>
          Recommendation:
        </span>
        <span
          style={{
            fontSize: 20,
            fontWeight: 700,
            background: feedback.recommendation === 'Strong Hire' || feedback.recommendation === 'Hire'
              ? 'linear-gradient(135deg, var(--accent-2), var(--accent-1))'
              : 'linear-gradient(135deg, var(--accent-3), var(--accent-5))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {feedback.recommendation}
        </span>
      </div>
    </div>
  );
}
