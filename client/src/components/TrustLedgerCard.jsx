import { HelpCircle } from 'lucide-react';
import { useState } from 'react';

export default function TrustLedgerCard({ breakdown = [], title = 'Trust Ledger', compact = false }) {
  const [openKey, setOpenKey] = useState(null);

  return (
    <div className="ledger-card rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-paper text-sm tracking-wide uppercase">{title}</h3>
        <span className="text-[10px] font-mono text-mist-dim">evidence-weighted</span>
      </div>
      <div className="space-y-0">
        {breakdown.map((row, i) => (
          <div key={row.key}>
            <button
              type="button"
              onClick={() => setOpenKey(openKey === row.key ? null : row.key)}
              className="w-full flex items-center gap-3 py-2.5 text-left group"
              style={{ borderTop: i === 0 ? 'none' : '1px dashed var(--color-ledger)' }}
            >
              <span className="text-paper text-sm flex-1 group-hover:text-teal-bright transition-colors">{row.label}</span>
              <span className="text-mist-dim text-xs font-mono">×{row.weight}%</span>
              <span className="font-mono text-sm w-14 text-right text-mist">{row.subScore}</span>
              <span className="font-mono text-sm w-12 text-right font-semibold text-teal-bright">+{row.contribution}</span>
              <HelpCircle size={13} className="text-mist-dim shrink-0" />
            </button>
            {openKey === row.key && !compact && (
              <div className="pb-3 pl-1 pr-8 text-xs text-mist leading-relaxed">
                {EXPLAIN[row.key] || 'Derived from verifiable activity tied to this account.'}
                {' '}
                <span className="text-mist-dim">
                  Evidence points: <span className="font-mono">{row.evidenceCount ?? 0}</span>
                  {row.extra?.idleDays !== undefined && (
                    <> · Inactive for <span className="font-mono">{row.extra.idleDays}</span> days</>
                  )}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const EXPLAIN = {
  acceptedAnswers: 'Counts answers the asker themselves marked as accepted — the strongest signal that help was actually useful.',
  helpfulAnswers: 'Counts net upvotes across all answers, showing sustained usefulness beyond a single accepted answer.',
  endorsements: 'Peer endorsements are weighted by the endorser\'s own trust score and diminish for repeat endorsers, so ten endorsements from one friend count far less than ten from different, credible peers.',
  projects: 'Projects with a real evidence link (repo, demo, write-up) count more, and independent peer verification boosts them further.',
  consistency: 'Rewards regular contribution over the last 90 days and decays if the account goes quiet for more than two weeks.',
  postQuality: 'Measures engagement per post rather than raw post count, so quality is rewarded over volume.',
  peerVerification: 'Formal verification requests approved by a reviewer, weighted by that reviewer\'s own trust.',
  accountHistory: 'Account age and a clean standing (no upheld reports) build a small baseline of trust over time.',
};
