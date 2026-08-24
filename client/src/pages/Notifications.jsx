import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageSquare, UserPlus, ShieldCheck, CheckCircle2, Bell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import api from '../api/client';
import { EmptyState } from '../components/ui';

const ICONS = {
  like: Heart,
  comment: MessageSquare,
  follow: UserPlus,
  verify: ShieldCheck,
  endorsement: ShieldCheck,
  accepted: CheckCircle2,
  answer: MessageSquare,
  verify_request: ShieldCheck,
  verified: CheckCircle2,
};

export default function Notifications() {
  const [notifications, setNotifications] = useState(null);

  useEffect(() => {
    api.get('/notifications').then(({ data }) => setNotifications(data.notifications));
    api.post('/notifications/read');
  }, []);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="px-6 py-6 border-b border-ledger">
        <h1 className="font-display font-semibold text-xl flex items-center gap-2"><Bell size={20} /> Notifications</h1>
      </div>
      {notifications === null && <div className="px-6 py-10 text-mist text-sm">Loading...</div>}
      {notifications?.length === 0 && (
        <EmptyState title="Nothing yet" description="When people endorse you, verify your projects, or accept your answers, it'll show up here." />
      )}
      <div className="divide-y divide-ledger">
        {notifications?.map((n) => {
          const Icon = ICONS[n.type] || Bell;
          return (
            <Link key={n.id} to={n.link || '#'} className={`flex items-start gap-3 px-6 py-4 hover:bg-ledger-soft/40 transition-colors ${!n.is_read ? 'bg-ledger-soft/20' : ''}`}>
              <Icon size={16} className="text-teal-bright mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm text-paper">{n.message}</p>
                <p className="text-xs text-mist-dim mt-0.5">{formatDistanceToNow(new Date(n.created_at + 'Z'))} ago</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
