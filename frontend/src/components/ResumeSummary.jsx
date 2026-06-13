function sanitize(str) {
  return str.replace(/[^\x20-\x7E\s]/g, '').trim();
}

export default function ResumeSummary({ resumeData, resumeMatch }) {
  if (!resumeData || !resumeData.skills) {
    return (
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 120 }}>
        <p style={{ color: 'var(--text-muted)' }}>No resume data available</p>
      </div>
    );
  }

  const hasSkills = resumeData.skills.length > 0;
  const hasEducation = resumeData.education?.length > 0;
  const hasExperience = resumeData.experience > 0;
  const hasRawText = resumeData.rawText && resumeData.rawText.length > 20;
  const hasData = hasSkills || hasEducation || hasExperience || hasRawText;

  return (
    <div className="card">
      <h3 style={{ fontSize: 16, marginBottom: 16, color: 'var(--text-secondary)' }}>
        Resume Summary
      </h3>

      {!hasData ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          No resume data available.
        </p>
      ) : (
        <>
          {hasRawText && !hasSkills && !hasEducation && !hasExperience && (
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16 }}>
              Resume text was provided but skills could not be auto-detected.
            </p>
          )}
          {resumeData.skills.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Skills ({resumeData.skills.length})
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {resumeData.skills.slice(0, 15).map((skill) => (
                  <span
                    key={skill}
                    style={{
                      padding: '3px 10px',
                      borderRadius: 12,
                      fontSize: 12,
                      background: 'rgba(108, 99, 255, 0.12)',
                      color: 'var(--accent-1)',
                    }}
                  >
                    {skill}
                  </span>
                ))}
                {resumeData.skills.length > 15 && (
                  <span style={{ padding: '3px 10px', fontSize: 12, color: 'var(--text-muted)' }}>
                    +{resumeData.skills.length - 15} more
                  </span>
                )}
              </div>
            </div>
          )}

          {resumeData.experience > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Experience
              </h4>
              <p style={{ fontSize: 15, color: 'var(--text-primary)' }}>{resumeData.experience} years</p>
            </div>
          )}

          {resumeData.education?.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Education
              </h4>
              {resumeData.education.map((edu, i) => (
                <p key={i} style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 2 }}>
                  {sanitize(edu)}
                </p>
              ))}
            </div>
          )}

          {resumeData.projects?.length > 0 && (
            <div>
              <h4 style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Projects
              </h4>
              {resumeData.projects.slice(0, 3).map((proj, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  <p style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>{sanitize(proj.name)}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                    {sanitize(proj.description?.substring(0, 100))}
                  </p>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {resumeMatch?.matchDetails && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--glass-border)' }}>
          <h4 style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Match Breakdown
          </h4>
          {Object.entries(resumeMatch.matchDetails).map(([key, val]) => (
            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: val >= 70 ? 'var(--accent-2)' : 'var(--accent-3)' }}>
                {val}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
