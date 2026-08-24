import { useState } from 'react';
import { Heart, MessageSquare, Link as LinkIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import Avatar from './Avatar';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function PostCard({ post, onChange }) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(post.liked);
  const [likes, setLikes] = useState(post.likes);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState(null);
  const [commentText, setCommentText] = useState('');

  const toggleLike = async () => {
    if (!user) return;
    const { data } = await api.post(`/posts/${post.id}/like`);
    setLiked(data.liked);
    setLikes(data.likes);
  };

  const loadComments = async () => {
    setShowComments((v) => !v);
    if (!comments) {
      const { data } = await api.get(`/posts/${post.id}/comments`);
      setComments(data.comments);
    }
  };

  const submitComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    await api.post(`/posts/${post.id}/comments`, { content: commentText.trim() });
    const { data } = await api.get(`/posts/${post.id}/comments`);
    setComments(data.comments);
    setCommentText('');
    onChange?.();
  };

  let hostname = '';
  try { hostname = post.evidenceUrl ? new URL(post.evidenceUrl).hostname : ''; } catch { /* ignore invalid url */ }

  return (
    <div className="border-b border-ledger px-6 py-5">
      <div className="flex gap-3">
        <Link to={`/u/${post.author.username}`}>
          <Avatar seed={post.author.avatarSeed || post.author.username} size={38} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <Link to={`/u/${post.author.username}`} className="font-medium hover:text-teal-bright transition-colors">{post.author.displayName}</Link>
            <span className="text-mist-dim">@{post.author.username}</span>
            <span className="text-mist-dim">·</span>
            <span className="text-mist-dim">{formatDistanceToNow(new Date(post.createdAt + 'Z'))} ago</span>
            {post.skillName && (
              <span className="ml-auto bg-ledger-soft text-teal-bright text-[11px] px-2 py-0.5 rounded-full">{post.skillName}</span>
            )}
          </div>
          <p className="text-paper text-sm mt-1.5 whitespace-pre-wrap leading-relaxed">{post.content}</p>
          {post.evidenceUrl && (
            <a href={post.evidenceUrl} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-1.5 text-xs text-teal-bright hover:underline w-fit">
              <LinkIcon size={12} /> Evidence: {hostname}
            </a>
          )}
          <div className="flex items-center gap-5 mt-3">
            <button onClick={toggleLike} disabled={!user} className={`flex items-center gap-1.5 text-xs transition-colors ${liked ? 'text-rose' : 'text-mist hover:text-rose'}`}>
              <Heart size={15} fill={liked ? 'currentColor' : 'none'} /> {likes}
            </button>
            <button onClick={loadComments} className="flex items-center gap-1.5 text-xs text-mist hover:text-teal-bright transition-colors">
              <MessageSquare size={15} /> {post.commentCount}
            </button>
          </div>

          {showComments && (
            <div className="mt-3 pl-2 border-l-2 border-ledger space-y-3">
              {comments?.map((c, i) => (
                <div key={i} className="flex gap-2 text-xs">
                  <Avatar seed={c.author.avatarSeed || c.author.username} size={22} />
                  <div>
                    <span className="font-medium">{c.author.displayName}</span>{' '}
                    <span className="text-mist">{c.content}</span>
                  </div>
                </div>
              ))}
              {user && (
                <form onSubmit={submitComment} className="flex gap-2 mt-2">
                  <input
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Write a reply..."
                    className="flex-1 bg-ink border border-ledger rounded-lg px-3 py-1.5 text-xs focus:border-teal outline-none"
                  />
                  <button className="text-xs text-teal-bright font-medium">Post</button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
