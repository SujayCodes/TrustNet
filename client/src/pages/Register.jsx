import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiErrorMessage } from '../api/client';
import { PrimaryButton, ErrorBanner } from '../components/ui';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '', displayName: '', headline: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      navigate('/');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8">
          <ShieldCheck className="text-teal-bright" size={26} />
          <span className="font-display font-bold text-xl">TrustNet</span>
        </div>
        <div className="bg-ink-raised border border-ledger rounded-2xl p-6">
          <h1 className="font-display font-semibold text-lg mb-1">Build your reputation</h1>
          <p className="text-mist text-sm mb-5">Every claim here comes with a receipt.</p>
          <ErrorBanner message={error} />
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="text-xs text-mist mb-1 block">Display name</label>
              <input value={form.displayName} onChange={update('displayName')} className="w-full bg-ink border border-ledger rounded-lg px-3 py-2 text-sm outline-none focus:border-teal" placeholder="Sujay Rao" autoFocus />
            </div>
            <div>
              <label className="text-xs text-mist mb-1 block">Username</label>
              <input value={form.username} onChange={update('username')} className="w-full bg-ink border border-ledger rounded-lg px-3 py-2 text-sm outline-none focus:border-teal" placeholder="sujay" />
            </div>
            <div>
              <label className="text-xs text-mist mb-1 block">Email</label>
              <input type="email" value={form.email} onChange={update('email')} className="w-full bg-ink border border-ledger rounded-lg px-3 py-2 text-sm outline-none focus:border-teal" placeholder="you@example.com" />
            </div>
            <div>
              <label className="text-xs text-mist mb-1 block">Headline</label>
              <input value={form.headline} onChange={update('headline')} className="w-full bg-ink border border-ledger rounded-lg px-3 py-2 text-sm outline-none focus:border-teal" placeholder="Software Developer" />
            </div>
            <div>
              <label className="text-xs text-mist mb-1 block">Password</label>
              <input type="password" value={form.password} onChange={update('password')} className="w-full bg-ink border border-ledger rounded-lg px-3 py-2 text-sm outline-none focus:border-teal" placeholder="At least 6 characters" />
            </div>
            <PrimaryButton type="submit" className="w-full mt-2" disabled={loading}>
              {loading ? 'Creating account...' : 'Create account'}
            </PrimaryButton>
          </form>
        </div>
        <p className="text-center text-sm text-mist mt-4">
          Already have an account? <Link to="/login" className="text-teal-bright hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
