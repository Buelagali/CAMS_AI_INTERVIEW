import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import FeedbackCard from '../components/FeedbackCard';
import ResumeSummary from '../components/ResumeSummary';

export default function Dashboard() {
  const navigate = useNavigate();
  const candidate = JSON.parse(sessionStorage.getItem('candidate') || '{}');
  const scores = JSON.parse(sessionStorage.getItem('finalScores') || '{}');
  const feedback = JSON.parse(sessionStorage.getItem('feedback') || '{}');
  const resumeData = JSON.parse(sessionStorage.getItem('resumeData') || '{}');
  const resumeMatch = JSON.parse(sessionStorage.getItem('resumeMatch') || '{}');

  const scoreEntries = Object.entries(scores)
    .filter(([k]) => k !== 'overall')
    .map(([key, val]) => ({ category: key.charAt(0).toUpperCase() + key.slice(1), score: val }));

  const performanceData = scoreEntries.map((s, i) => ({
    name: s.category,
    value: s.score,
    fill: ['#6c63ff', '#00d4aa', '#ffd93d', '#ff6b9d', '#ff8a5c', '#a78bfa', '#34d399', '#f472b6'][i] || '#6c63ff',
  }));

  const timelineData = [
    { question: 'Q1', score: Math.round(scores.technical * 0.7 + Math.random() * 20) },
    { question: 'Q2', score: Math.round(scores.semantic * 0.6 + Math.random() * 25) },
    { question: 'Q3', score: Math.round(scores.confidence * 0.8 + Math.random() * 15) },
    { question: 'Q4', score: Math.round(scores.technical * 0.6 + Math.random() * 20) },
    { question: 'Q5', score: Math.round(scores.communication * 0.7 + Math.random() * 25) },
    { question: 'Q6', score: Math.round(scores.behavior * 0.8 + Math.random() * 15) },
    { question: 'Q7', score: Math.round(scores.semantic * 0.5 + Math.random() * 30) },
    { question: 'Q8', score: Math.round(scores.overall * 0.5 + Math.random() * 10) },
  ];

  return (
    <div className="page fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
        <div>
          <h1 style={{ fontSize: 28, marginBottom: 4 }}>Performance <span className="gradient-text">Dashboard</span></h1>
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

      <div className="grid-2" style={{ marginBottom: 32 }}>
        <div className="card">
          <h3 style={{ fontSize: 16, marginBottom: 16, color: 'var(--text-secondary)' }}>Performance Timeline</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={timelineData}>
              <defs>
                <linearGradient id="timelineGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent-1)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--accent-1)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="question" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#1a1a3a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white' }}
              />
              <Area type="monotone" dataKey="score" stroke="var(--accent-1)" fill="url(#timelineGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <ResumeSummary resumeData={resumeData} resumeMatch={resumeMatch} />
      </div>

      {feedback.strengths && <FeedbackCard feedback={feedback} />}

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
