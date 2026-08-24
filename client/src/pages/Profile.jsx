import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { UserPlus, UserMinus, ShieldCheck, Sparkles, Plus, Share2 } from 'lucide-react';
import { format } from 'date-fns';
import api, { apiErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import TrustRing from '../components/TrustRing';
import TrustLedgerCard from '../components/TrustLedgerCard';
import SkillConstellation from '../components/SkillConstellation';
import TrustCard from '../components/TrustCard';
import Modal from '../components/Modal';
import ChallengeModal from '../components/ChallengeModal';
import { BadgeChip, Card, PrimaryButton, GhostButton, ErrorBanner } from '../components/ui';
import PostCard from '../components/PostCard';

export default function Profile() {
  const { username } = useParams();
  const { user: me } = useAuth();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [projects, setProjects] = useState([]);
  const [endorsements, setEndorsements] = useState([]);
  const [activeSkillId, setActiveSkillId] = useState(null);
  const [skillBreakdown, setSkillBreakdown] = useState(null);
  const [tab, setTab] = useState('posts');
  const [editing, setEditing] = useState(false);
  const [endorseOpen, setEndorseOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [addSkillOpen, setAddSkillOpen] = useState(false);
  const [challengeSkill, setChallengeSkill] = useState(null);
  const [showTrustCard, setShowTrustCard] = useState(false);

  const load = () => {
    api.get(`/users/${username}`).then(({ data }) => setProfile(data)).catch(() => setProfile(false));
    api.get('/posts', { params: { author: username } }).then(({ data }) => setPosts(data.posts));
    api.get('/projects', { params: { username } }).then(({ data }) => setProjects(data.projects));
    api.get(`/endorsements/${username}`).then(({ data }) => setEndorsements(data.endorsements));
  };

  useEffect(() => { load(); setActiveSkillId(null); setSkillBreakdown(null); }, [username]);

  const toggleFollow = async () => {
    if (profile.isFollowing) await api.delete(`/users/${username}/follow`);
    else await api.post(`/users/${username}/follow`);
    load();
  };

  const viewSkillBreakdown = async (skillId, skillName) => {
    if (activeSkillId === skillId) { setActiveSkillId(null); setSkillBreakdown(null); return; }
    setActiveSkillId(skillId);
    const { data } = await api.get(`/trust/${username}`, { params: { skill: skillName } });
    setSkillBreakdown(data);
  };

  if (profile === false) return <div className="max-w-2xl mx-auto px-6 py-10 text-mist text-sm">User not found.</div>;
  if (!profile) return <div className="max-w-2xl mx-auto px-6 py-10 text-mist text-sm">Loading profile...</div>;

  const { user, skills, trust, badges, followers, following, isFollowing, isSelf, scoreHistory } = profile;
  const chartData = scoreHistory.map((s) => ({ date: format(new Date(s.recorded_at + 'Z'), 'MMM d'), score: s.score }));

  return (
    <div className="max-w-3xl mx-auto pb-16">
      <div className="px-6 py-6 border-b border-ledger">
        <div className="flex items-start gap-4 flex-wrap">
          <Avatar seed={user.avatar_seed || user.username} size={64} />
          <div className="flex-1 min-w-0">
            <h1 className="font-display font-semibold text-xl">{user.display_name}</h1>
            <p className="text-mist text-sm">@{user.username}</p>
            {user.headline && <p className="text-paper text-sm mt-1">{user.headline}</p>}
            {user.bio && <p className="text-mist text-sm mt-1">{user.bio}</p>}
            <div className="flex items-center gap-4 mt-2 text-xs text-mist">
              <span><b className="text-paper font-mono">{followers}</b> followers</span>
              <span><b className="text-paper font-mono">{following}</b> following</span>
              <span>Joined {format(new Date(user.created_at + 'Z'), 'MMM yyyy')}</span>
            </div>
            <div className="flex gap-2 flex-wrap mt-2">
              {badges.map((b) => <BadgeChip key={b.id} label={b.label} description={b.description} />)}
            </div>
          </div>
          <div className="flex flex-col gap-2 items-end">
            <TrustRing score={trust.overall.score} size={100} label="Overall" />
            {isSelf ? (
              <GhostButton onClick={() => setEditing(true)} className="text-xs px-3 py-1.5">Edit profile</GhostButton>
            ) : me && (
              <button onClick={toggleFollow} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors ${isFollowing ? 'border border-ledger text-mist hover:text-rose' : 'bg-teal text-ink hover:bg-teal-bright'}`}>
                {isFollowing ? <><UserMinus size={13}/> Unfollow</> : <><UserPlus size={13}/> Follow</>}
              </button>
            )}
            <button onClick={() => setShowTrustCard(true)} className="flex items-center gap-1.5 text-xs text-mist hover:text-teal-bright">
              <Share2 size={13} /> Share trust card
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 border-b border-ledger grid md:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-semibold text-sm uppercase tracking-wide text-mist">Skill Constellation</h2>
            {isSelf && (
              <button onClick={() => setAddSkillOpen(true)} className="flex items-center gap-1 text-xs text-teal-bright hover:underline">
                <Plus size={12} /> Add skill
              </button>
            )}
          </div>
          {trust.perSkill.length > 0 ? (
            <SkillConstellation overallScore={trust.overall.score} skills={trust.perSkill} />
          ) : (
            <p className="text-mist text-sm text-center py-10">No skills added yet.</p>
          )}
          <div className="flex flex-wrap gap-2 justify-center mt-2">
            {trust.perSkill.map((s) => (
              <button
                key={s.skillId}
                onClick={() => viewSkillBreakdown(s.skillId, s.skillName)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${activeSkillId === s.skillId ? 'border-teal-bright text-teal-bright' : 'border-ledger text-mist hover:text-paper'}`}
              >
                {s.skillName} · {s.score.toFixed(0)}
              </button>
            ))}
          </div>
          {isSelf && (
            <div className="flex flex-wrap gap-2 justify-center mt-3">
              {skills.map((s) => (
                <button key={s.id} onClick={() => setChallengeSkill(s.name)} className="flex items-center gap-1 text-[11px] text-mist hover:text-amber-bright">
                  <Sparkles size={11} /> Challenge: {s.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="font-display font-semibold text-sm uppercase tracking-wide text-mist mb-3">
            {activeSkillId ? `${trust.perSkill.find(s=>s.skillId===activeSkillId)?.skillName} Ledger` : 'Overall Trust Ledger'}
          </h2>
          <TrustLedgerCard breakdown={activeSkillId ? skillBreakdown?.breakdown || [] : trust.overall.breakdown} />
        </div>
      </div>

      {chartData.length > 1 && (
        <div className="px-6 py-6 border-b border-ledger">
          <h2 className="font-display font-semibold text-sm uppercase tracking-wide text-mist mb-3">Trust Over Time</h2>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="date" stroke="#5b6472" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} stroke="#5b6472" fontSize={11} tickLine={false} axisLine={false} width={28} />
                <Tooltip contentStyle={{ background: '#12161d', border: '1px solid #232a35', borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="score" stroke="#35d6a4" strokeWidth={2} dot={{ r: 3, fill: '#35d6a4' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {!isSelf && me && (
        <div className="px-6 py-4 border-b border-ledger flex gap-2">
          <GhostButton onClick={() => setEndorseOpen(true)}>Endorse a skill</GhostButton>
          <GhostButton onClick={() => setVerifyOpen(true)}>Request peer verification</GhostButton>
        </div>
      )}

      <div className="px-6 pt-4 flex gap-4 border-b border-ledger">
        {['posts', 'projects', 'endorsements'].map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`pb-3 text-sm capitalize border-b-2 transition-colors ${tab === t ? 'border-teal-bright text-teal-bright' : 'border-transparent text-mist hover:text-paper'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'posts' && (
        <div>
          {posts.length === 0 && <p className="text-mist text-sm px-6 py-8">No posts yet.</p>}
          {posts.map((p) => <PostCard key={p.id} post={p} onChange={load} />)}
        </div>
      )}
      {tab === 'projects' && (
        <div className="p-6 grid gap-4">
          {projects.length === 0 && <p className="text-mist text-sm">No projects yet.</p>}
          {projects.map((p) => (
            <Card key={p.id} className="p-4">
              <h3 className="font-medium">{p.title}</h3>
              <p className="text-mist text-sm mt-1">{p.description}</p>
              <div className="flex items-center justify-between mt-2">
                <a href={p.url} target="_blank" rel="noreferrer" className="text-xs text-teal-bright hover:underline">View evidence →</a>
                <span className="text-xs text-mist flex items-center gap-1"><ShieldCheck size={12}/> {p.verifiedCount} verified</span>
              </div>
            </Card>
          ))}
        </div>
      )}
      {tab === 'endorsements' && (
        <div className="p-6 space-y-3">
          {endorsements.length === 0 && <p className="text-mist text-sm">No endorsements yet.</p>}
          {endorsements.map((e, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Avatar seed={e.endorser.avatarSeed || e.endorser.username} size={22} />
                <span className="text-sm font-medium">{e.endorser.displayName}</span>
                <span className="text-xs text-mist-dim">endorsed</span>
                <span className="text-xs bg-ledger-soft text-teal-bright px-2 py-0.5 rounded-full">{e.skillName}</span>
              </div>
              {e.evidence && <p className="text-sm text-mist ml-8">{e.evidence}</p>}
            </Card>
          ))}
        </div>
      )}

      {editing && <EditProfileModal user={user} onClose={() => setEditing(false)} onSaved={load} />}
      {endorseOpen && <EndorseModal targetUsername={username} onClose={() => setEndorseOpen(false)} onDone={load} />}
      {verifyOpen && <VerifyRequestModal targetUsername={username} skills={skills} onClose={() => setVerifyOpen(false)} />}
      {addSkillOpen && <AddSkillModal onClose={() => setAddSkillOpen(false)} onDone={load} existingSkillIds={skills.map(s=>s.id)} />}
      {challengeSkill && <ChallengeModal skillName={challengeSkill} onClose={() => setChallengeSkill(null)} onDone={load} />}
      {showTrustCard && (
        <Modal title="Shareable trust card" onClose={() => setShowTrustCard(false)}>
          <TrustCard user={user} score={trust.overall.score} />
          <p className="text-xs text-mist-dim mt-3">Anyone can view this at trustnet.app/u/{user.username} — no login required.</p>
        </Modal>
      )}
    </div>
  );
}

function EditProfileModal({ user, onClose, onSaved }) {
  const [displayName, setDisplayName] = useState(user.display_name);
  const [headline, setHeadline] = useState(user.headline || '');
  const [bio, setBio] = useState(user.bio || '');
  const [error, setError] = useState('');
  const save = async () => {
    try {
      await api.put('/users/me/profile', { displayName, headline, bio });
      onSaved(); onClose();
    } catch (err) { setError(apiErrorMessage(err)); }
  };
  return (
    <Modal title="Edit profile" onClose={onClose}>
      <ErrorBanner message={error} />
      <div className="space-y-3">
        <div>
          <label className="text-xs text-mist mb-1 block">Display name</label>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full bg-ink border border-ledger rounded-lg px-3 py-2 text-sm outline-none focus:border-teal" />
        </div>
        <div>
          <label className="text-xs text-mist mb-1 block">Headline</label>
          <input value={headline} onChange={(e) => setHeadline(e.target.value)} className="w-full bg-ink border border-ledger rounded-lg px-3 py-2 text-sm outline-none focus:border-teal" />
        </div>
        <div>
          <label className="text-xs text-mist mb-1 block">Bio</label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className="w-full bg-ink border border-ledger rounded-lg px-3 py-2 text-sm outline-none focus:border-teal resize-none" />
        </div>
        <PrimaryButton onClick={save} className="w-full">Save changes</PrimaryButton>
      </div>
    </Modal>
  );
}

function EndorseModal({ targetUsername, onClose, onDone }) {
  const [skills, setSkills] = useState([]);
  const [skillId, setSkillId] = useState('');
  const [evidence, setEvidence] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { api.get('/users/skills/all').then(({ data }) => setSkills(data.skills)); }, []);
  const submit = async () => {
    if (!skillId) { setError('Please select a skill.'); return; }
    try {
      await api.post('/endorsements', { targetUsername, skillId, evidence });
      onDone(); onClose();
    } catch (err) { setError(apiErrorMessage(err)); }
  };
  return (
    <Modal title={`Endorse @${targetUsername}`} onClose={onClose}>
      <ErrorBanner message={error} />
      <div className="space-y-3">
        <select value={skillId} onChange={(e) => setSkillId(e.target.value)} className="w-full bg-ink border border-ledger rounded-lg px-3 py-2 text-sm outline-none focus:border-teal">
          <option value="">Select a skill</option>
          {skills.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <textarea value={evidence} onChange={(e) => setEvidence(e.target.value)} placeholder="Describe how you know this person is skilled here (specific evidence carries more weight)..." rows={3} className="w-full bg-ink border border-ledger rounded-lg px-3 py-2 text-sm outline-none focus:border-teal resize-none" />
        <PrimaryButton onClick={submit} className="w-full">Submit endorsement</PrimaryButton>
      </div>
    </Modal>
  );
}

function VerifyRequestModal({ targetUsername, skills, onClose }) {
  const [skillId, setSkillId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const submit = async () => {
    if (!skillId) { setError('Please select a skill.'); return; }
    try {
      await api.post('/verification-requests', { reviewerUsername: targetUsername, skillId, message });
      setSent(true);
    } catch (err) { setError(apiErrorMessage(err)); }
  };
  return (
    <Modal title={`Ask @${targetUsername} to verify you`} onClose={onClose}>
      {sent ? (
        <p className="text-sm text-teal-bright">Request sent. They'll see it in their notifications.</p>
      ) : (
        <div className="space-y-3">
          <ErrorBanner message={error} />
          <select value={skillId} onChange={(e) => setSkillId(e.target.value)} className="w-full bg-ink border border-ledger rounded-lg px-3 py-2 text-sm outline-none focus:border-teal">
            <option value="">Select a skill</option>
            {skills?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Remind them how they know your work..." rows={3} className="w-full bg-ink border border-ledger rounded-lg px-3 py-2 text-sm outline-none focus:border-teal resize-none" />
          <PrimaryButton onClick={submit} className="w-full">Send request</PrimaryButton>
        </div>
      )}
    </Modal>
  );
}

function AddSkillModal({ onClose, onDone, existingSkillIds }) {
  const [skills, setSkills] = useState([]);
  const [skillId, setSkillId] = useState('');
  useEffect(() => { api.get('/users/skills/all').then(({ data }) => setSkills(data.skills)); }, []);
  const submit = async () => {
    if (!skillId) return;
    await api.post('/users/me/skills', { skillId, selfRating: 50 });
    onDone(); onClose();
  };
  return (
    <Modal title="Add a skill" onClose={onClose}>
      <div className="space-y-3">
        <select value={skillId} onChange={(e) => setSkillId(e.target.value)} className="w-full bg-ink border border-ledger rounded-lg px-3 py-2 text-sm outline-none focus:border-teal">
          <option value="">Select a skill</option>
          {skills.filter(s => !existingSkillIds.includes(s.id)).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <p className="text-xs text-mist-dim">Your score for this skill will be earned entirely from your future activity — evidence, endorsements, and verification, not a self-rating.</p>
        <PrimaryButton onClick={submit} className="w-full">Add skill</PrimaryButton>
      </div>
    </Modal>
  );
}
