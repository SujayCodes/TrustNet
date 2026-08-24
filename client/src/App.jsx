import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Feed from './pages/Feed';
import Questions from './pages/Questions';
import QuestionDetail from './pages/QuestionDetail';
import Projects from './pages/Projects';
import Leaderboard from './pages/Leaderboard';
import Search from './pages/Search';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';

function RequireAuth({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const { ready } = useAuth();
  if (!ready) return null;

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<Layout><Feed /></Layout>} />
      <Route path="/questions" element={<Layout><Questions /></Layout>} />
      <Route path="/questions/:id" element={<Layout><QuestionDetail /></Layout>} />
      <Route path="/projects" element={<Layout><Projects /></Layout>} />
      <Route path="/leaderboard" element={<Layout><Leaderboard /></Layout>} />
      <Route path="/search" element={<Layout><Search /></Layout>} />
      <Route
        path="/notifications"
        element={
          <Layout>
            <RequireAuth><Notifications /></RequireAuth>
          </Layout>
        }
      />
      <Route path="/u/:username" element={<Layout><Profile /></Layout>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
