import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing'; // ✅ NAYA: Landing page import kar liya
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import WorkspaceView from './pages/WorkspaceView';

// 🛡️ Security Guard: Sirf logged in users ke liye
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" />;
  return children;
};

// 🛡️ Auth Guard: Logged in user ko wapas login/landing page pe jane se rokega aur dashboard bhej dega
const PublicRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (token) return <Navigate to="/dashboard" />;
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* 🚀 Public Routes */}
        {/* ✅ NAYA: Landing page ab website ka default page hai */}
        <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} /> 
        
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

        {/* 🔒 Protected Routes (Authenticated only) */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/workspace/:id" 
          element={
            <ProtectedRoute>
              <WorkspaceView />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;