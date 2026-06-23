import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Cell } from 'recharts';
import FeedbackCard from '../components/FeedbackCard';
import ResumeSummary from '../components/ResumeSummary';

export default function Dashboard() {
  const navigate = useNavigate();
  const candidate = JSON.parse(sessionStorage.getItem('candidate') || '{}');
  const scores = JSON.parse(sessionStorage.getItem('finalScores') || '{}');
  const feedback = JSON.parse(sessionStorage.getItem('feedback') || '{}');
  const resumeData = JSON.parse(sessionStorage.getItem('resumeData') || '{}');
  const resumeMatch = JSON.parse(sessionStorage.getItem('resumeMatch') || '{}');

  const scoreEntries = [
    { key: 'technical', label: 'Technical', color: '#6c63ff' },
    { key: 'communication', label: 'Communication', color: '#00d4aa' },
    { key: 'confidence', label: 'Confidence', color: '#ffd93d' },
    { key: 'behavior', label: 'Behavior', color: '#ff6b9d' },
    { key: 'emotionStability', label: 'Emotion Stability', color: '#f472b6' },
    { key: 'resumeMatch', label: 'Resume Match', color: '#ff8a5c' },
    { key: 'projectKnowledge', label: 'Project Knowledge', color: '#a78bfa' },
    { key: 'roleMatch', label: 'Role Match', color: '#34d399' },
  ];

  const performanceData = scoreEntries.map((s) => ({
    name: s.label,
    value: scores[s.key] || 0,
    fill: s.color,
  }));

  const scoreValues = scoreEntries
    .filter((s) => scores[s.key])
    .map((s) => ({ category: s.label, score: scores[s.key] }));

  const avgPerf = scoreValues.length > 0
    ? Math.round(scoreValues.reduce((a, b) => b.score + a, 0) / scoreValues.length)
    : 0;

  const topScore = scoreValues.length > 0
    ? scoreValues.reduce((a, b) => a.score > b.score ? a : b)
    : { category: 'N/A', score: 0 };

  const lowScore = scoreValues.length > 0
    ? scoreValues.reduce((a, b) => a.score < b.score ? a : b)
    : { category: 'N/A', score: 0 };

  return (
    <div className="page fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, marginBottom: 4 }}>Recruiter <span className="gradient-text">Dashboard</span></h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            {candidate.name} &middot; {candidate.role}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 36, fontWeight: 800 }} className="gradient-text">
            {scores.overall || 0}%
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Overall Score</div>
        </div>
      </div>

      <div className="grid-3" style={{ marginBottom: 24 }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: avgPerf >= 65 ? 'var(--accent-2)' : 'var(--accent-3)' }}>{avgPerf}%</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Average Performance</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--accent-2)' }}>{topScore.score}%</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Best: {topScore.category}</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--accent-3)' }}>{lowScore.score}%</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Needs Work: {lowScore.category}</div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 32 }}>
        <div className="card">
          <h3 style={{ fontSize: 16, marginBottom: 16, color: 'var(--text-secondary)' }}>Performance Overview</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={performanceData}>
              <defs>
                <linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent-1)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--accent-1)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.07)" />
              <XAxis dataKey="name" tick={{ fill: 'var(--text-primary)', fontSize: 11 }} angle={-35} textAnchor="end" height={80} />
              <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8, color: '#1a1a2e' }}
              />
              <Area type="monotone" dataKey="value" stroke="var(--accent-1)" fill="url(#perfGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 style={{ fontSize: 16, marginBottom: 16, color: 'var(--text-secondary)' }}>Score Comparison</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.07)" />
              <XAxis dataKey="name" tick={{ fill: 'var(--text-primary)', fontSize: 11 }} angle={-35} textAnchor="end" height={80} />
              <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8, color: '#1a1a2e' }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {performanceData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <ResumeSummary resumeData={resumeData} resumeMatch={resumeMatch} />

      {feedback.strengths && <div style={{ marginTop: 24 }}><FeedbackCard feedback={feedback} /></div>}

      <div style={{ marginTop: 32, display: 'flex', gap: 12, justifyContent: 'center' }}>
        <button className="btn btn-secondary" onClick={() => navigate('/result')}>
          View Full Results
        </button>
        <button className="btn btn-secondary" onClick={() => navigate('/')}>
          New Interview
        </button>
      </div>
    </div>
  );
}
