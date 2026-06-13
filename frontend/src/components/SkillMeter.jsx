export default function SkillMeter({ skills = [], matchedSkills = [], missingSkills = [] }) {
  const maxDisplay = 10;
  const displaySkills = skills.slice(0, maxDisplay);
  const matchedSet = new Set(matchedSkills.map((s) => s.toLowerCase()));
  const missingSet = new Set(missingSkills.map((s) => s.toLowerCase()));

  const getSkillStatus = (skill) => {
    if (matchedSet.has(skill.toLowerCase())) return 'matched';
    if (missingSet.has(skill.toLowerCase())) return 'missing';
    return 'neutral';
  };

  const matchRate = skills.length > 0
    ? Math.round((matchedSkills.filter((ms) =>
        skills.some((s) => s.toLowerCase().includes(ms.toLowerCase()))
      ).length / skills.length) * 100)
    : 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h4 style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Skills Analysis</h4>
        <span style={{ fontSize: 13, color: matchRate >= 60 ? 'var(--accent-2)' : 'var(--accent-3)' }}>
          {matchRate}% match
        </span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {displaySkills.map((skill) => {
          const status = getSkillStatus(skill);
          const statusColors = {
            matched: { bg: 'rgba(0, 212, 170, 0.15)', color: 'var(--accent-2)' },
            missing: { bg: 'rgba(255, 107, 157, 0.15)', color: 'var(--accent-3)' },
            neutral: { bg: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' },
          };
          const colors = statusColors[status];

          return (
            <span
              key={skill}
              style={{
                padding: '4px 12px',
                borderRadius: 16,
                fontSize: 12,
                background: colors.bg,
                color: colors.color,
                border: '1px solid transparent',
              }}
            >
              {skill}
            </span>
          );
        })}
      </div>
    </div>
  );
}
