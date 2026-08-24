import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, MessageSquare, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { PrimaryButton, GhostButton, ErrorBanner } from '../components/ui';
import { apiErrorMessage } from '../api/client';

export default function Questions() {
  const { user } = useAuth();
  const [questions, setQuestions] = useState(null);
  const [skills, setSkills] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [skillId, setSkillId] = useState('');
  const [error, setError] = useState('');

  const load = () => api.get('/questions').then(({ data }) => setQuestions(data.questions));

  useEffect(() => {
    load();
    api.get('/users/skills/all').then(({ data }) => setSkills(data.skills));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/questions', { title, body, skillId: skillId || null });
      setTitle(''); setBody(''); setSkillId(''); setShowForm(false);
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="px-6 py-6 border-b border-ledger flex items-center justify-between">
        <div>
          <h1 className="font-display font-semibold text-xl">Questions</h1>
          <p className="text-mist text-sm mt-1">Accepted answers count more than any bio.</p>
        </div>
        {user && (
          <GhostButton onClick={() => setShowForm((v) => !v)}>
            {showForm ? <span className="flex items-center gap-1"><X size={14}/> Cancel</span> : 'Ask a question'}
          </GhostButton>
        )}
      </div>

      {showForm && (
        <form onSubmit={submit} className="px-6 py-5 border-b border-ledger space-y-2.5">
          <ErrorBanner message={error} />
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Question title" className="w-full bg-ink-raised border border-ledger rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-teal" />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Add context and details..." rows={3} className="w-full bg-ink-raised border border-ledger rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-teal resize-none" />
          <div className="flex gap-2 items-center">
            <select value={skillId} onChange={(e) => setSkillId(e.target.value)} className="bg-ink-raised border border-ledger rounded-lg px-2.5 py-1.5 text-xs text-mist outline-none">
              <option value="">Tag a skill (optional)</option>
              {skills.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <PrimaryButton type="submit" className="ml-auto">Post question</PrimaryButton>
          </div>
        </form>
      )}

      {questions === null && <div className="px-6 py-10 text-mist text-sm">Loading questions...</div>}
      {questions?.length === 0 && <div className="px-6 py-10 text-mist text-sm">No questions yet.</div>}
      {questions?.map((q) => (
        <Link key={q.id} to={`/questions/${q.id}`} className="block px-6 py-5 border-b border-ledger hover:bg-ledger-soft/40 transition-colors">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-medium text-paper flex items-center gap-2">
                {q.hasAccepted && <CheckCircle2 size={15} className="text-teal-bright shrink-0" />}
                {q.title}
              </h3>
              <p className="text-mist text-xs mt-1 line-clamp-2">{q.body}</p>
              <div className="flex items-center gap-2 mt-2 text-xs text-mist-dim">
                <span>@{q.author.username}</span>
                <span>·</span>
                <span>{formatDistanceToNow(new Date(q.createdAt + 'Z'))} ago</span>
                {q.skillName && <span className="bg-ledger-soft text-teal-bright px-2 py-0.5 rounded-full">{q.skillName}</span>}
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-mist text-xs shrink-0">
              <MessageSquare size={14} /> {q.answerCount}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
