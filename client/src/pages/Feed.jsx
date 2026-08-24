import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/PostCard';
import { PrimaryButton } from '../components/ui';
import { Link2 } from 'lucide-react';

export default function Feed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState(null);
  const [skills, setSkills] = useState([]);
  const [content, setContent] = useState('');
  const [skillId, setSkillId] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [posting, setPosting] = useState(false);

  const load = async () => {
    const { data } = await api.get('/posts');
    setPosts(data.posts);
  };

  useEffect(() => {
    load();
    api.get('/users/skills/all').then(({ data }) => setSkills(data.skills));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setPosting(true);
    try {
      await api.post('/posts', { content, skillId: skillId || null, evidenceUrl });
      setContent(''); setSkillId(''); setEvidenceUrl('');
      load();
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="px-6 py-6 border-b border-ledger">
        <h1 className="font-display font-semibold text-xl">Feed</h1>
        <p className="text-mist text-sm mt-1">What claim can you back up today?</p>
      </div>

      {user && (
        <form onSubmit={submit} className="px-6 py-5 border-b border-ledger space-y-2.5">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share what you built, learned, or verified..."
            rows={3}
            className="w-full bg-ink-raised border border-ledger rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-teal resize-none"
          />
          <div className="flex gap-2 flex-wrap items-center">
            <select value={skillId} onChange={(e) => setSkillId(e.target.value)} className="bg-ink-raised border border-ledger rounded-lg px-2.5 py-1.5 text-xs text-mist outline-none">
              <option value="">Tag a skill (optional)</option>
              {skills.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <div className="flex items-center gap-1.5 bg-ink-raised border border-ledger rounded-lg px-2.5 py-1.5 flex-1 min-w-[160px]">
              <Link2 size={13} className="text-mist-dim" />
              <input
                value={evidenceUrl}
                onChange={(e) => setEvidenceUrl(e.target.value)}
                placeholder="Evidence link (optional)"
                className="bg-transparent text-xs outline-none flex-1 min-w-0"
              />
            </div>
            <PrimaryButton type="submit" disabled={posting || !content.trim()} className="ml-auto">
              {posting ? 'Posting...' : 'Post'}
            </PrimaryButton>
          </div>
        </form>
      )}

      {posts === null && <div className="px-6 py-10 text-mist text-sm">Loading feed...</div>}
      {posts?.length === 0 && <div className="px-6 py-10 text-mist text-sm">No posts yet. Be the first to share something.</div>}
      {posts?.map((p) => <PostCard key={p.id} post={p} onChange={load} />)}
    </div>
  );
}
