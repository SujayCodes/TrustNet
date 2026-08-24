import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiErrorMessage } from '../api/client';
import { PrimaryButton, ErrorBanner } from '../components/ui';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(identifier, password);
      navigate('/');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8">
          <ShieldCheck className="text-teal-bright" size={26} />
          <span className="font-display font-bold text-xl">TrustNet</span>
        </div>
        <div className="bg-ink-raised border border-ledger rounded-2xl p-6">
          <h1 className="font-display font-semibold text-lg mb-1">Welcome back</h1>
          <p className="text-mist text-sm mb-5">Sign in to your reputation.</p>
          <ErrorBanner message={error} />
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="text-xs text-mist mb-1 block">Username or email</label>
              <input
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full bg-ink border border-ledger rounded-lg px-3 py-2 text-sm outline-none focus:border-teal"
                placeholder="sujay"
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs text-mist mb-1 block">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-ink border border-ledger rounded-lg px-3 py-2 text-sm outline-none focus:border-teal"
                placeholder="••••••••"
              />
            </div>
            <PrimaryButton type="submit" className="w-full mt-2" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </PrimaryButton>
          </form>
          <p className="text-xs text-mist-dim mt-4 text-center">
            Demo accounts: <span className="font-mono">sujay</span>, <span className="font-mono">devraj</span>, <span className="font-mono">ananya</span> — password <span className="font-mono">password123</span>
          </p>
        </div>
        <p className="text-center text-sm text-mist mt-4">
          New to TrustNet? <Link to="/register" className="text-teal-bright hover:underline">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
