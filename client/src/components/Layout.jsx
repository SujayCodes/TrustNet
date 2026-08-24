import { NavLink, useNavigate } from 'react-router-dom';
import { Home, MessageCircleQuestion, FolderGit2, Trophy, Bell, Search, LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';
import { useEffect, useState } from 'react';
import api from '../api/client';

const NAV = [
  { to: '/', label: 'Feed', icon: Home, end: true },
  { to: '/questions', label: 'Q&A', icon: MessageCircleQuestion },
  { to: '/projects', label: 'Projects', icon: FolderGit2 },
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { to: '/search', label: 'Search', icon: Search },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = async () => {
      try {
        const { data } = await api.get('/notifications');
        if (!cancelled) setUnread(data.notifications.filter(n => !n.is_read).length);
      } catch { /* ignore */ }
    };
    load();
    const id = setInterval(load, 15000);
    return () => { cancelled = true; clearInterval(id); };
  }, [user]);

  return (
    <div className="min-h-screen bg-ink text-paper flex">
      <aside className="w-60 shrink-0 border-r border-ledger flex flex-col px-4 py-6 sticky top-0 h-screen">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 px-2 mb-8">
          <ShieldCheck className="text-teal-bright" size={22} />
          <span className="font-display font-bold text-lg tracking-tight">TrustNet</span>
        </button>

        <nav className="flex flex-col gap-1 flex-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive ? 'bg-ledger-soft text-teal-bright' : 'text-mist hover:text-paper hover:bg-ledger-soft/60'
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
          <NavLink
            to="/notifications"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors relative ${
                isActive ? 'bg-ledger-soft text-teal-bright' : 'text-mist hover:text-paper hover:bg-ledger-soft/60'
              }`
            }
          >
            <Bell size={18} />
            Notifications
            {unread > 0 && (
              <span className="absolute right-3 top-2 bg-rose text-white text-[10px] font-mono rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                {unread}
              </span>
            )}
          </NavLink>
        </nav>

        {user ? (
          <div className="border-t border-ledger pt-4 mt-4">
            <button onClick={() => navigate(`/u/${user.username}`)} className="flex items-center gap-2.5 px-2 w-full text-left mb-2 group">
              <Avatar seed={user.username} size={34} />
              <div className="min-w-0">
                <div className="text-sm font-medium truncate group-hover:text-teal-bright transition-colors">{user.display_name}</div>
                <div className="text-xs text-mist-dim truncate">@{user.username}</div>
              </div>
            </button>
            <button onClick={() => { logout(); navigate('/login'); }} className="flex items-center gap-2 px-2 py-1.5 text-xs text-mist hover:text-rose transition-colors w-full">
              <LogOut size={14} /> Sign out
            </button>
          </div>
        ) : (
          <div className="border-t border-ledger pt-4 mt-4 flex flex-col gap-2">
            <button onClick={() => navigate('/login')} className="text-sm bg-teal text-ink font-medium rounded-lg py-2 hover:bg-teal-bright transition-colors">Sign in</button>
          </div>
        )}
      </aside>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
