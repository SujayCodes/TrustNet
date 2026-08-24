import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, ShieldCheck, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import api, { apiErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import { PrimaryButton, GhostButton, ErrorBanner, Card } from '../components/ui';

export default function Projects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState(null);
  const [skills, setSkills] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', skillId: '', url: '' });
  const [error, setError] = useState('');

  const load = () => api.get('/projects').then(({ data }) => setProjects(data.projects));

  useEffect(() => {
    load();
    api.get('/users/skills/all').then(({ data }) => setSkills(data.skills));
  }, []);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/projects', form);
      setForm({ title: '', description: '', skillId: '', url: '' });
      setShowForm(false);
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  const verify = async (id) => {
    try {
      await api.post(`/projects/${id}/verify`, { comment: 'Verified this project.' });
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="px-6 py-6 border-b border-ledger flex items-center justify-between">
        <div>
          <h1 className="font-display font-semibold text-xl">Projects</h1>
          <p className="text-mist text-sm mt-1">Evidence peers can independently verify.</p>
        </div>
        {user && (
          <GhostButton onClick={() => setShowForm((v) => !v)}>
            {showForm ? <span className="flex items-center gap-1"><X size={14}/> Cancel</span> : 'Add project'}
          </GhostButton>
        )}
      </div>

      {showForm && (
        <form onSubmit={submit} className="px-6 py-5 border-b border-ledger space-y-2.5">
          <ErrorBanner message={error} />
          <input value={form.title} onChange={update('title')} placeholder="Project title" className="w-full bg-ink-raised border border-ledger rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-teal" />
          <textarea value={form.description} onChange={update('description')} placeholder="What did you build? What problem did it solve?" rows={3} className="w-full bg-ink-raised border border-ledger rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-teal resize-none" />
          <input value={form.url} onChange={update('url')} placeholder="Evidence URL (repo, live demo, write-up)" className="w-full bg-ink-raised border border-ledger rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-teal" />
          <div className="flex items-center gap-2">
            <select value={form.skillId} onChange={update('skillId')} className="bg-ink-raised border border-ledger rounded-lg px-2.5 py-1.5 text-xs text-mist outline-none">
              <option value="">Tag a skill</option>
              {skills.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <PrimaryButton type="submit" className="ml-auto">Submit project</PrimaryButton>
          </div>
        </form>
      )}

      {projects === null && <div className="px-6 py-10 text-mist text-sm">Loading projects...</div>}
      {projects?.length === 0 && <div className="px-6 py-10 text-mist text-sm">No projects yet.</div>}
      <div className="p-6 grid gap-4">
        {projects?.map((p) => (
          <Card key={p.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Avatar seed={p.author.avatarSeed || p.author.username} size={20} />
                  <Link to={`/u/${p.author.username}`} className="text-xs text-mist hover:text-teal-bright">@{p.author.username}</Link>
                  <span className="text-xs text-mist-dim">· {formatDistanceToNow(new Date(p.createdAt + 'Z'))} ago</span>
                </div>
                <h3 className="font-medium text-paper">{p.title}</h3>
                {p.description && <p className="text-mist text-sm mt-1">{p.description}</p>}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {p.skillName && <span className="bg-ledger-soft text-teal-bright text-[11px] px-2 py-0.5 rounded-full">{p.skillName}</span>}
                  <a href={p.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-teal-bright hover:underline">
                    <ExternalLink size={12} /> View evidence
                  </a>
                </div>
              </div>
              <div className="text-center shrink-0">
                <div className="flex items-center gap-1 text-teal-bright font-mono text-sm">
                  <ShieldCheck size={15} /> {p.verifiedCount}
                </div>
                <div className="text-[10px] text-mist-dim">verified</div>
                {user && user.username !== p.author.username && (
                  <button onClick={() => verify(p.id)} className="text-[11px] text-mist hover:text-teal-bright mt-1">Verify</button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
