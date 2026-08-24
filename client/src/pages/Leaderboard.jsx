import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Trophy } from 'lucide-react';
import api from '../api/client';
import Avatar from '../components/Avatar';

export default function Leaderboard() {
  const [skills, setSkills] = useState([]);
  const [skill, setSkill] = useState('');
  const [rows, setRows] = useState(null);

  useEffect(() => {
    api.get('/users/skills/all').then(({ data }) => setSkills(data.skills));
  }, []);

  useEffect(() => {
    setRows(null);
    api.get('/users/leaderboard', { params: skill ? { skill } : {} }).then(({ data }) => setRows(data.leaderboard));
  }, [skill]);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="px-6 py-6 border-b border-ledger">
        <h1 className="font-display font-semibold text-xl flex items-center gap-2"><Trophy size={20} className="text-amber" /> Leaderboard</h1>
        <p className="text-mist text-sm mt-1">Ranked by verified trust — not by who has the most followers.</p>
        <select value={skill} onChange={(e) => setSkill(e.target.value)} className="mt-4 bg-ink-raised border border-ledger rounded-lg px-3 py-2 text-sm text-mist outline-none">
          <option value="">Overall trust score</option>
          {skills.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
        </select>
      </div>

      {rows === null && <div className="px-6 py-10 text-mist text-sm">Loading...</div>}
      <div className="divide-y divide-ledger">
        {rows?.map((r, i) => (
          <Link key={r.id} to={`/u/${r.username}`} className="flex items-center gap-4 px-6 py-4 hover:bg-ledger-soft/40 transition-colors">
            <span className={`font-mono text-sm w-6 text-right ${i < 3 ? 'text-amber-bright font-semibold' : 'text-mist-dim'}`}>{i + 1}</span>
            <Avatar seed={r.avatar_seed || r.username} size={36} />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">{r.display_name}</div>
              <div className="text-xs text-mist-dim truncate">{r.headline}</div>
            </div>
            <div className="flex items-center gap-1 text-xs text-mist shrink-0">
              <Users size={12} /> {r.followers}
            </div>
            <div className="font-mono font-semibold text-teal-bright w-14 text-right shrink-0">{r.score.toFixed(1)}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
