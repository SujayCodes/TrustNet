import { ShieldCheck } from 'lucide-react';

export default function TrustCard({ user, score }) {
  return (
    <div className="ledger-card rounded-2xl p-5 flex items-center gap-4">
      <div className="w-12 h-12 rounded-full border-2 border-teal-bright flex items-center justify-center shrink-0">
        <ShieldCheck className="text-teal-bright" size={22} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-mist-dim uppercase tracking-wide">Verified Trust Card</div>
        <div className="font-display font-semibold text-paper">{user.display_name}</div>
        <div className="text-xs text-mist truncate">trustnet.app/u/{user.username}</div>
      </div>
      <div className="font-mono font-bold text-2xl text-teal-bright shrink-0">{score.toFixed(1)}</div>
    </div>
  );
}
