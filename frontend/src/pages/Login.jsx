import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const roles = [
  'Software Developer',
  'AI/ML Engineer',
  'Data Analyst',
  'Cloud Engineer',
  'Cyber Security Analyst',
];

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '' });
  const [role, setRole] = useState(roles[0]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) return;
    setLoading(true);
    const candidateData = { ...form, role };
    const localSessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    try {
      const { data } = await axios.post('/api/interview/session', {
        name: form.name,
        email: form.email,
        role,
      });
      sessionStorage.setItem('sessionId', data.sessionId);
    } catch {
      sessionStorage.setItem('sessionId', localSessionId);
    }
    sessionStorage.setItem('candidate', JSON.stringify(candidateData));
    setLoading(false);
    navigate('/upload');
  };

  return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card fade-in" style={{ width: '100%', maxWidth: 460, padding: 48 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{ fontSize: 28, marginBottom: 8 }}>
            <span className="gradient-text">CAMS</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
            Cognitive Adaptive Multi-Modal Interview System
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: 'var(--text-secondary)' }}>
              Full Name
            </label>
            <input
              className="input"
              placeholder="Enter your name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: 'var(--text-secondary)' }}>
              Email Address
            </label>
            <input
              className="input"
              type="email"
              placeholder="Enter your email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          <div style={{ marginBottom: 32 }}>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: 'var(--text-secondary)' }}>
              Select Role
            </label>
            <select
              className="input"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              {roles.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%' }}
            disabled={loading}
          >
            {loading ? 'Creating Session...' : 'Start Interview'}
          </button>
        </form>
      </div>
    </div>
  );
}
