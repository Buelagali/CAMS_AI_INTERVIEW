import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import UploadResume from './pages/UploadResume';
import Interview from './pages/Interview';
import Result from './pages/Result';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/upload" element={<UploadResume />} />
      <Route path="/interview" element={<Interview />} />
      <Route path="/result" element={<Result />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
