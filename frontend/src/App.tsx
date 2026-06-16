import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ClientPortal from './pages/ClientPortal';
import AdminDashboard from './pages/AdminDashboard';
import './index.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/admin" replace />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/projeto/:slug" element={<ClientPortal />} />
      </Routes>
    </Router>
  );
}

export default App;
