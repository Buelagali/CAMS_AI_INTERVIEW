import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import CircularScore from '../components/CircularScore';
import FeedbackCard from '../components/FeedbackCard';
import { generatePDF } from '../utils/pdfGenerator';

export default function Result() {
  const navigate = useNavigate();
  const candidate = JSON.parse(sessionStorage.getItem('candidate') || '{}');
  const scores = JSON.parse(sessionStorage.getItem('finalScores') || '{}');
  const feedback = JSON.parse(sessionStorage.getItem('feedback') || '{}');
  const resumeMatch = JSON.parse(sessionStorage.getItem('resumeMatch') || '{}');

  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (scores.overall) setLoaded(true);
  }, []);

  const radarData = [
    { metric: 'Technical', value: scores.technical || 0 },
    { metric: 'Communication', value: scores.communication || 0 },
    { metric: 'Confidence', value: scores.confidence || 0 },
    { metric: 'Behavior', value: scores.behavior || 0 },
    { metric: 'Resume Match', value: scores.resumeMatch || 0 },
    { metric: 'Semantic', value: scores.semantic || 0 },
  ];

  const barData = Object.entries(scores)
    .filter(([k]) => k !== 'overall')
    .map(([key, val]) => ({ name: key.charAt(0).toUpperCase() + key.slice(1), score: val }));

  const barColors = ['#6c63ff', '#00d4aa', '#ffd93d', '#ff6b9d', '#ff8a5c', '#a78bfa', '#34d399', '#f472b6'];

  const handleDownloadPDF = () => {
    try {
      generatePDF({ candidate, scores, feedback, resumeMatch });
    } catch (err) {
      console.error('PDF generation failed:', err);
      alert('Failed to generate PDF. Check console for details.');
    }
  };

  if (!loaded) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>No results found. Please complete an interview first.</p>
      </div>
    );
  }

  return (
    <div className="page fade-in">
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h1 style={{ fontSize: 28, marginBottom: 8 }}>
          Interview <span className="gradient-text">Results</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          {candidate.name} &middot; {candidate.role}
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 40 }}>
        <div style={{ position: 'relative', width: 180, height: 180 }}>
          <svg width="180" height="180" viewBox="0 0 180 180">
            <circle cx="90" cy="90" r="80" fill="none" stroke="var(--glass-border)" strokeWidth="8" />
            <circle
              cx="90" cy="90" r="80"
              fill="none"
              stroke="url(#overallGrad)"
              strokeWidth="8"
              strokeDasharray={`${2 * Math.PI * 80 * (scores.overall || 0) / 100} ${2 * Math.PI * 80 * (1 - (scores.overall || 0) / 100)}`}
              strokeDashoffset={2 * Math.PI * 80 * 0.25}
              strokeLinecap="round"
              transform="rotate(-90, 90, 90)"
            />
            <defs>
              <linearGradient id="overallGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="var(--accent-1)" />
                <stop offset="100%" stopColor="var(--accent-2)" />
              </linearGradient>
            </defs>
            <text x="90" y="80" textAnchor="middle" dominantBaseline="central" fill="white" fontSize="36" fontWeight="800">
              {scores.overall || 0}%
            </text>
            <text x="90" y="115" textAnchor="middle" dominantBaseline="central" fill="var(--text-secondary)" fontSize="14">
              Overall Score
            </text>
          </svg>
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: 40 }}>
        {[
          { label: 'Technical', value: scores.technical, color: 'var(--accent-1)' },
          { label: 'Communication', value: scores.communication, color: 'var(--accent-2)' },
          { label: 'Confidence', value: scores.confidence, color: 'var(--accent-4)' },
          { label: 'Behavior', value: scores.behavior, color: 'var(--accent-3)' },
          { label: 'Resume Match', value: scores.resumeMatch, color: 'var(--accent-5)' },
          { label: 'Emotion', value: scores.emotion, color: 'var(--accent-3)' },
          { label: 'Semantic', value: scores.semantic, color: '#a78bfa' },
          { label: 'Skill Graph', value: scores.skillGraph, color: '#34d399' },
        ].map((s) => (
          <CircularScore key={s.label} label={s.label} value={s.value} color={s.color} size={120} />
        ))}
      </div>

      <div className="grid-2" style={{ marginBottom: 40 }}>
        <div className="card">
          <h3 style={{ fontSize: 16, marginBottom: 16, color: 'var(--text-secondary)' }}>Score Radar</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.1)" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
              <Radar name="Score" dataKey="value" stroke="var(--accent-1)" fill="var(--accent-1)" fillOpacity={0.3} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 style={{ fontSize: 16, marginBottom: 16, color: 'var(--text-secondary)' }}>Score Breakdown</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} angle={-45} textAnchor="end" height={80} />
              <YAxis domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#1a1a3a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white' }}
              />
              <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                {barData.map((_, idx) => (
                  <Cell key={idx} fill={barColors[idx % barColors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {feedback.strengths && <FeedbackCard feedback={feedback} />}

      <div style={{ display: 'flex', gap: 16, marginTop: 32, justifyContent: 'center' }}>
        <button className="btn btn-primary" onClick={handleDownloadPDF}>
          Download PDF Report
        </button>
        <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
          View Dashboard
        </button>
        <button className="btn btn-secondary" onClick={() => navigate('/')}>
          New Interview
        </button>
      </div>
    </div>
  );
}
