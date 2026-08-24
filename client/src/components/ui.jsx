import { Award } from 'lucide-react';

export function BadgeChip({ label, description }) {
  return (
    <div
      title={description}
      className="inline-flex items-center gap-1.5 bg-amber-dim border border-amber/30 text-amber-bright text-xs px-2.5 py-1 rounded-full"
    >
      <Award size={12} />
      {label}
    </div>
  );
}

export function Card({ children, className = '' }) {
  return <div className={`bg-ink-raised border border-ledger rounded-2xl ${className}`}>{children}</div>;
}

export function PrimaryButton({ children, className = '', ...props }) {
  return (
    <button
      className={`bg-teal hover:bg-teal-bright text-ink font-medium rounded-lg px-4 py-2 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, className = '', ...props }) {
  return (
    <button
      className={`border border-ledger hover:border-mist-dim text-paper rounded-lg px-4 py-2 text-sm transition-colors disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="text-center py-16 px-6">
      <h3 className="font-display text-paper font-semibold mb-1.5">{title}</h3>
      <p className="text-mist text-sm max-w-sm mx-auto mb-4">{description}</p>
      {action}
    </div>
  );
}

export function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="bg-rose-dim border border-rose/30 text-rose text-sm rounded-lg px-3 py-2 mb-3">
      {message}
    </div>
  );
}
