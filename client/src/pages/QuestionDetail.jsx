import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, ChevronUp, ChevronDown, Link as LinkIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import api, { apiErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import { PrimaryButton, ErrorBanner } from '../components/ui';

export default function QuestionDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [body, setBody] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [error, setError] = useState('');

  const load = () => api.get(`/questions/${id}`).then(({ data }) => setData(data));

  useEffect(() => { load(); }, [id]);

  const submitAnswer = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post(`/questions/${id}/answers`, { body, evidenceUrl });
      setBody(''); setEvidenceUrl('');
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  const vote = async (answerId, value) => {
    if (!user) return;
    await api.post(`/questions/answers/${answerId}/vote`, { value });
    load();
  };

  const accept = async (answerId) => {
    try {
      await api.post(`/questions/answers/${answerId}/accept`);
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  if (!data) return <div className="max-w-2xl mx-auto px-6 py-10 text-mist text-sm">Loading...</div>;
  const { question, answers } = data;
  const isAsker = user?.username === question.author.username;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="px-6 py-6 border-b border-ledger">
        <h1 className="font-display font-semibold text-xl">{question.title}</h1>
        <p className="text-paper text-sm mt-2 leading-relaxed">{question.body}</p>
        <div className="flex items-center gap-2 mt-3 text-xs text-mist-dim">
          <Link to={`/u/${question.author.username}`} className="hover:text-teal-bright">@{question.author.username}</Link>
          <span>·</span>
          <span>{formatDistanceToNow(new Date(question.createdAt + 'Z'))} ago</span>
          {question.skillName && <span className="bg-ledger-soft text-teal-bright px-2 py-0.5 rounded-full">{question.skillName}</span>}
        </div>
      </div>

      <div className="px-6 py-4">
        <h2 className="text-sm font-medium text-mist mb-3">{answers.length} Answer{answers.length !== 1 && 's'}</h2>
        <div className="space-y-4">
          {answers.map((a) => (
            <div key={a.id} className={`border rounded-xl p-4 ${a.isAccepted ? 'border-teal/40 bg-teal-dim/20' : 'border-ledger'}`}>
              <div className="flex gap-3">
                <div className="flex flex-col items-center gap-1 pt-0.5">
                  <button onClick={() => vote(a.id, 1)} disabled={!user} className="text-mist hover:text-teal-bright disabled:opacity-40">
                    <ChevronUp size={18} />
                  </button>
                  <span className="font-mono text-sm">{a.votes}</span>
                  <button onClick={() => vote(a.id, -1)} disabled={!user} className="text-mist hover:text-rose disabled:opacity-40">
                    <ChevronDown size={18} />
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs text-mist-dim mb-1.5">
                    <Avatar seed={a.author.avatarSeed || a.author.username} size={20} />
                    <Link to={`/u/${a.author.username}`} className="text-paper hover:text-teal-bright font-medium">{a.author.displayName}</Link>
                    <span>·</span>
                    <span>{formatDistanceToNow(new Date(a.createdAt + 'Z'))} ago</span>
                    {a.isAccepted && <span className="flex items-center gap-1 text-teal-bright ml-1"><CheckCircle2 size={13}/> Accepted</span>}
                  </div>
                  <p className="text-sm text-paper leading-relaxed whitespace-pre-wrap">{a.body}</p>
                  {a.evidenceUrl && (
                    <a href={a.evidenceUrl} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-1.5 text-xs text-teal-bright hover:underline w-fit">
                      <LinkIcon size={12} /> View evidence
                    </a>
                  )}
                  {isAsker && !a.isAccepted && (
                    <button onClick={() => accept(a.id)} className="mt-2 text-xs text-teal-bright hover:underline">
                      Mark as accepted
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {user && (
        <div className="px-6 py-5 border-t border-ledger mt-2">
          <h3 className="text-sm font-medium mb-2">Your answer</h3>
          <ErrorBanner message={error} />
          <form onSubmit={submitAnswer} className="space-y-2.5">
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="Share a concrete, useful answer..." className="w-full bg-ink-raised border border-ledger rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-teal resize-none" />
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-ink-raised border border-ledger rounded-lg px-2.5 py-1.5 flex-1">
                <LinkIcon size={13} className="text-mist-dim" />
                <input value={evidenceUrl} onChange={(e) => setEvidenceUrl(e.target.value)} placeholder="Evidence link (optional)" className="bg-transparent text-xs outline-none flex-1 min-w-0" />
              </div>
              <PrimaryButton type="submit" disabled={!body.trim()}>Post answer</PrimaryButton>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
