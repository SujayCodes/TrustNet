import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search as SearchIcon } from 'lucide-react';
import api from '../api/client';
import Avatar from '../components/Avatar';

export default function Search() {
  const [q, setQ] = useState('');
  const [minScore, setMinScore] = useState('');
  const [results, setResults] = useState(null);

  useEffect(() => {
    const id = setTimeout(() => {
      api.get('/users/search', { params: { q: q || undefined, minScore: minScore || undefined } })
        .then(({ data }) => setResults(data.results));
    }, 250);
    return () => clearTimeout(id);
  }, [q, minScore]);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="px-6 py-6 border-b border-ledger">
        <h1 className="font-display font-semibold text-xl">Find people</h1>
        <p className="text-mist text-sm mt-1">Search by name, skill, or minimum trust score.</p>
        <div className="flex gap-2 mt-4">
          <div className="flex items-center gap-2 bg-ink-raised border border-ledger rounded-lg px-3 py-2 flex-1">
            <SearchIcon size={14} className="text-mist-dim" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, username, headline..." className="bg-transparent text-sm outline-none flex-1" />
          </div>
          <input
            type="number"
            min="0" max="100"
            value={minScore}
            onChange={(e) => setMinScore(e.target.value)}
            placeholder="Min score"
            className="w-28 bg-ink-raised border border-ledger rounded-lg px-3 py-2 text-sm outline-none focus:border-teal"
          />
        </div>
      </div>

      {results === null && <div className="px-6 py-10 text-mist text-sm">Searching...</div>}
      {results?.length === 0 && <div className="px-6 py-10 text-mist text-sm">No matches found.</div>}
      <div className="divide-y divide-ledger">
        {results?.map((r) => (
          <Link key={r.id} to={`/u/${r.username}`} className="flex items-center gap-4 px-6 py-4 hover:bg-ledger-soft/40 transition-colors">
            <Avatar seed={r.avatar_seed || r.username} size={36} />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">{r.display_name}</div>
              <div className="text-xs text-mist-dim truncate">{r.headline}</div>
            </div>
            <div className="font-mono font-semibold text-teal-bright shrink-0">{r.score.toFixed(1)}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
