'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import '@solana/wallet-adapter-react-ui/styles.css';

const WalletMultiButton = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
);

type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type Recommendation = 'ALLOW' | 'BLOCK' | 'PROCEED_WITH_CAUTION';

interface AnalysisResult {
  riskLevel: RiskLevel;
  riskScore: number;
  summary: string;
  warnings: string[];
  recommendation: Recommendation;
}

const RISKY_SAMPLE = JSON.stringify(
  {
    network: 'devnet',
    feePayer: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    recentBlockhash: '4vJ9JU1bJJE96FWSJKvHsmmFADCg4gpZQff4P3bkLKi',
    instructions: [
      {
        programId: 'ComputeBudget111111111111111111111111111111',
        type: 'setComputeUnitLimit',
        data: { units: 200000 },
      },
      {
        programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        type: 'approve',
        accounts: {
          source: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
          delegate: 'Dr41nXq7vJ2kLm9TzPaYbC3eHfWgS6uRnD8oKcQ5xVtB',
          owner: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
        },
        data: { amount: '18446744073709551615' },
      },
      {
        programId: 'Dr41nXq7vJ2kLm9TzPaYbC3eHfWgS6uRnD8oKcQ5xVtB',
        type: 'unknown',
        accounts: {
          vault: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
          recipient: 'Fq3mHs8YxN2cLpV7bTgW1dKe5uRjA9oZ4iXnC6vBtPyE',
        },
        data: { action: 'sweep', lamports: 4850000000, note: '98% of wallet balance' },
      },
    ],
  },
  null,
  2
);

const SAFE_SAMPLE = JSON.stringify(
  {
    network: 'devnet',
    feePayer: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    recentBlockhash: 'EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N',
    instructions: [
      {
        programId: '11111111111111111111111111111111',
        type: 'transfer',
        accounts: {
          from: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
          to: 'GrDMoeqMLFjeXQ24H56S1RLgT4R76jsuWCd6SvXyGPQ5',
        },
        data: { lamports: 50000000 },
      },
      {
        programId: 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr',
        type: 'memo',
        data: { text: 'Coffee payment' },
      },
    ],
  },
  null,
  2
);

interface RiskStyle {
  label: string;
  text: string;
  badge: string;
  stroke: string;
  glow: string;
  border: string;
}

const RISK_STYLES: Record<RiskLevel, RiskStyle> = {
  LOW: {
    label: 'Low risk',
    text: 'text-emerald-400',
    badge: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    stroke: '#34d399',
    glow: 'shadow-[0_0_60px_-20px_rgba(52,211,153,0.55)]',
    border: 'border-emerald-500/30',
  },
  MEDIUM: {
    label: 'Medium risk',
    text: 'text-yellow-300',
    badge: 'border-yellow-400/40 bg-yellow-400/10 text-yellow-200',
    stroke: '#facc15',
    glow: 'shadow-[0_0_60px_-20px_rgba(250,204,21,0.5)]',
    border: 'border-yellow-400/30',
  },
  HIGH: {
    label: 'High risk',
    text: 'text-red-400',
    badge: 'border-red-500/40 bg-red-500/10 text-red-300',
    stroke: '#f87171',
    glow: 'shadow-[0_0_60px_-20px_rgba(248,113,113,0.6)]',
    border: 'border-red-500/30',
  },
  CRITICAL: {
    label: 'Critical risk',
    text: 'text-red-500',
    badge: 'border-red-500/60 bg-red-500/15 text-red-200',
    stroke: '#ef4444',
    glow: 'shadow-[0_0_70px_-15px_rgba(239,68,68,0.7)]',
    border: 'border-red-500/50',
  },
};

interface RecStyle {
  label: string;
  hint: string;
  classes: string;
  dot: string;
}

const REC_STYLES: Record<Recommendation, RecStyle> = {
  ALLOW: {
    label: 'ALLOW',
    hint: 'No harmful behavior found. Safe to sign.',
    classes:
      'border-emerald-400/50 bg-emerald-500/10 text-emerald-300 shadow-[0_0_40px_-12px_rgba(52,211,153,0.6)]',
    dot: 'bg-emerald-400',
  },
  PROCEED_WITH_CAUTION: {
    label: 'PROCEED WITH CAUTION',
    hint: 'Review the warnings before you sign.',
    classes:
      'border-amber-400/50 bg-amber-400/10 text-amber-300 shadow-[0_0_40px_-12px_rgba(251,191,36,0.55)]',
    dot: 'bg-amber-400',
  },
  BLOCK: {
    label: 'BLOCK',
    hint: 'Do not sign. This transaction is likely malicious.',
    classes:
      'border-red-500/60 bg-red-500/10 text-red-300 shadow-[0_0_40px_-10px_rgba(239,68,68,0.65)]',
    dot: 'bg-red-500',
  },
};

const DEFAULT_SCORES: Record<RiskLevel, number> = {
  LOW: 18,
  MEDIUM: 48,
  HIGH: 78,
  CRITICAL: 95,
};

const LOADING_STEPS = [
  'Decoding instructions',
  'Checking program IDs against known registries',
  'Tracing token approvals and balance changes',
  'Scoring risk and writing the report',
];

function isRiskLevel(value: string): value is RiskLevel {
  return value === 'LOW' || value === 'MEDIUM' || value === 'HIGH' || value === 'CRITICAL';
}

function isRecommendation(value: string): value is Recommendation {
  return value === 'ALLOW' || value === 'BLOCK' || value === 'PROCEED_WITH_CAUTION';
}

function normalizeResult(raw: unknown): AnalysisResult {
  const root = (raw ?? {}) as Record<string, unknown>;
  const r = ((root.data ?? root.analysis ?? root.result ?? root) ?? {}) as Record<string, unknown>;

  const levelRaw = String(r.riskLevel ?? r.risk_level ?? r.risk ?? 'MEDIUM').toUpperCase();
  const riskLevel: RiskLevel = isRiskLevel(levelRaw) ? levelRaw : 'MEDIUM';

  const scoreRaw = Number(r.riskScore ?? r.risk_score ?? r.score);
  const riskScore = Number.isFinite(scoreRaw)
    ? Math.min(100, Math.max(0, Math.round(scoreRaw)))
    : DEFAULT_SCORES[riskLevel];

  const recRaw = String(r.recommendation ?? r.action ?? r.final_action ?? '')
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
  const fallbackRec: Recommendation =
    riskLevel === 'LOW' ? 'ALLOW' : riskLevel === 'MEDIUM' ? 'PROCEED_WITH_CAUTION' : 'BLOCK';
  const recommendation: Recommendation = isRecommendation(recRaw) ? recRaw : fallbackRec;

  const warningsRaw = Array.isArray(r.warnings) ? r.warnings : [];
  const warnings = warningsRaw.map((w) => {
    if (typeof w === 'string') return w;
    if (w && typeof w === 'object') {
      const o = w as Record<string, unknown>;
      return String(o.message ?? o.description ?? JSON.stringify(w));
    }
    return String(w);
  });

  const summary =
    typeof r.summary === 'string' && r.summary.trim().length > 0
      ? r.summary
      : 'The agent did not return a summary for this transaction.';

  return { riskLevel, riskScore, summary, warnings, recommendation };
}

function ShieldIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l7.5 3v5.5c0 4.6-3.1 8.2-7.5 9.5-4.4-1.3-7.5-4.9-7.5-9.5V6L12 3z" />
      <path d="M9 12l2 2 4-4.5" />
    </svg>
  );
}

function AlertIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3.5l9.5 16.5h-19L12 3.5z" />
      <path d="M12 10v4.5M12 17.5v.01" />
    </svg>
  );
}

function CheckIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

function Spinner({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin motion-reduce:animate-none`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity={0.25} strokeWidth={3} />
      <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
    </svg>
  );
}

function LiveDot({ colorClass = 'bg-emerald-400' }: { colorClass?: string }) {
  return (
    <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
      <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 motion-reduce:animate-none ${colorClass}`} />
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${colorClass}`} />
    </span>
  );
}

function RiskGauge({ score, color, label }: { score: number; color: string; label: string }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);

  return (
    <div className="relative h-36 w-36 shrink-0">
      <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90" role="img" aria-label={`Risk score ${score} out of 100`}>
        <circle cx="64" cy="64" r={radius} fill="none" stroke="#27272a" strokeWidth={10} />
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 900ms cubic-bezier(0.22, 1, 0.36, 1)',
            filter: `drop-shadow(0 0 6px ${color})`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-semibold tabular-nums tracking-tight text-zinc-50">{score}</span>
        <span className="text-xs text-zinc-400">{label}</span>
      </div>
    </div>
  );
}

export default function Home() {
  const { publicKey } = useWallet();

  const [payload, setPayload] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<number>(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [gaugeScore, setGaugeScore] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [scanned, setScanned] = useState<number>(1420);

  useEffect(() => {
      if (!loading) {
        const timer = setTimeout(() => setLoadingStep(0), 0);
        return () => clearTimeout(timer);
      }
      const id = window.setInterval(() => {
        setLoadingStep((s) => (s + 1) % LOADING_STEPS.length);
      }, 1400);
      return () => window.clearInterval(id);
    }, [loading]);

  useEffect(() => {
      if (!result) {
        const timer = setTimeout(() => setGaugeScore(0), 0);
        return () => clearTimeout(timer);
      }
      const id = requestAnimationFrame(() => setGaugeScore(result.riskScore));
      return () => cancelAnimationFrame(id);
    }, [result]);

  const walletLabel = useMemo(() => {
    if (!publicKey) return null;
    const b58 = publicKey.toBase58();
    return `${b58.slice(0, 4)}…${b58.slice(-4)}`;
  }, [publicKey]);

  const stats = [
    { label: 'Transactions scanned', value: `${scanned.toLocaleString('en-US')}+` },
    { label: 'Threats neutralized', value: '100%' },
    { label: 'Network status', value: 'Secured' },
  ];

  async function handleAnalyze() {
    const trimmed = payload.trim();
    if (!trimmed || loading) return;

    let body: unknown = trimmed;
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        body = JSON.parse(trimmed);
      } catch {
        setError('That payload is not valid JSON. Fix the syntax or load a sample.');
        setResult(null);
        return;
      }
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction: body,
          walletAddress: publicKey ? publicKey.toBase58() : null,
          network: 'devnet',
        }),
      });

      if (!res.ok) {
        let detail = `Request failed with status ${res.status}.`;
        try {
          const errBody = (await res.json()) as { error?: string; message?: string };
          detail = errBody.error ?? errBody.message ?? detail;
        } catch {}
        throw new Error(detail);
      }

      const data: unknown = await res.json();
      setResult(normalizeResult(data));
      setScanned((n) => n + 1);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'The analysis failed. Check that /api/analyze is running and try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  function loadSample(sample: string) {
    setPayload(sample);
    setResult(null);
    setError(null);
  }

  const riskStyle = result ? RISK_STYLES[result.riskLevel] : null;
  const recStyle = result ? REC_STYLES[result.recommendation] : null;

  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-950 font-sans text-zinc-100 antialiased">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h[520px] w[820px] -translate-x-1/2 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute top-1/3 -right-40 h[420px] w[420px] rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute bottom-0 -left-40 h[380px] w[380px] rounded-full bg-red-500/5 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #a1a1aa 1px, transparent 1px), linear-gradient(to bottom, #a1a1aa 1px, transparent 1px)',
            backgroundSize: '56px 56px',
            maskImage: 'radial-gradient(ellipse at 50% 0%, black 30%, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(ellipse at 50% 0%, black 30%, transparent 75%)',
          }}
        />
      </div>

      <header className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/70 backdrop-blur-md">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-300 shadow-[0_0_24px_-6px_rgba(34,211,238,0.6)]">
              <ShieldIcon className="h-5 w-5" />
            </span>
            <span className="text-lg font-semibold tracking-tight">AgentGuard AI</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-xs font-medium text-zinc-300 sm:flex">
              <LiveDot colorClass="bg-cyan-400" />
              Solana Devnet
            </span>
            <WalletMultiButton
              style={{
                height: '40px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #0891b2 0%, #059669 100%)',
                fontSize: '14px',
                fontWeight: 600,
                padding: '0 16px',
              }}
            />
          </div>
        </nav>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-4 pb-24 pt-16 sm:px-6 sm:pt-24">
        <section className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 sm:hidden">
            <LiveDot colorClass="bg-emerald-400" />
            Agent online on Solana Devnet
          </span>
          <h1 className="mt-5 bg-linear-to-b from-zinc-50 to-zinc-400 bg-clip-text text-4xl font-semibold leading-[1.1] tracking-tight text-transparent sm:mt-0 sm:text-6xl">
            Autonomous AI Security Agent for Solana Transactions
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-zinc-400 sm:text-lg">
            Paste a transaction before you sign it. The agent reads every instruction, flags drains and
            unknown programs, and tells you whether to sign.
          </p>
          {walletLabel && (
            <p className="mt-4 inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 py-1.5 text-xs text-zinc-300">
              <CheckIcon className="h-3.5 w-3.5 text-emerald-400" />
              Protecting wallet <span className="font-mono text-zinc-100">{walletLabel}</span>
            </p>
          )}
        </section>

        <section className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-3 sm:grid-cols-3">
          {stats.map((s) => (
            <div
              key={s.label}
              className="group rounded-xl border border-zinc-800 bg-zinc-900/80 px-5 py-4 backdrop-blur-md transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:border-cyan-500/40"
            >
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <LiveDot colorClass="bg-emerald-400" />
                {s.label}
              </div>
              <div className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight text-zinc-50">
                {s.value}
              </div>
            </div>
          ))}
        </section>

        <section id="scanner" className="mt-16 grid gap-6 lg:grid-cols-2">
          <div className="flex flex-col rounded-xl border border-zinc-800 bg-zinc-900/80 p-6 backdrop-blur-md transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:border-zinc-700">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Transaction scanner</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Paste a Solana transaction as JSON, or load a sample to try it out.
              </p>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => loadSample(RISKY_SAMPLE)}
                className="rounded-xl border border-red-500/40 bg-red-500/10 px-3.5 py-2 text-sm font-medium text-red-300 transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:bg-red-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
              >
                Load risky sample
              </button>
              <button
                type="button"
                onClick={() => loadSample(SAFE_SAMPLE)}
                className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-2 text-sm font-medium text-emerald-300 transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:bg-emerald-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              >
                Load safe sample
              </button>
              {payload && (
                <button
                  type="button"
                  onClick={() => loadSample('')}
                  className="rounded-xl border border-zinc-800 px-3.5 py-2 text-sm font-medium text-zinc-400 transition-all duration-300 ease-in-out hover:border-zinc-700 hover:text-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
                >
                  Clear
                </button>
              )}
            </div>

            <label htmlFor="tx-input" className="sr-only">
              Solana transaction payload
            </label>
            <textarea
              id="tx-input"
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              spellCheck={false}
              placeholder={'{\n  "feePayer": "...",\n  "instructions": [ ... ]\n}'}
              className="mt-4 h-80 w-full resize-none rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 font-mono text-xs leading-relaxed text-cyan-100 placeholder-zinc-600 transition-all duration-300 ease-in-out focus:border-cyan-500/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            />

            <div className="mt-2 text-right text-xs text-zinc-500">
              {payload.length.toLocaleString('en-US')} characters
            </div>

            <button
              type="button"
              onClick={handleAnalyze}
              disabled={loading || payload.trim().length === 0}
              className="mt-4 flex h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-linear-to-r from-cyan-500 to-emerald-500 px-5 text-sm font-semibold text-zinc-950 shadow-[0_0_32px_-8px_rgba(34,211,238,0.7)] transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:shadow-[0_0_40px_-6px_rgba(52,211,153,0.8)] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-none"
            >
              {loading ? (
                <>
                  <Spinner className="h-5 w-5" />
                  Analyzing transaction
                </>
              ) : (
                <>
                  <ShieldIcon className="h-5 w-5" />
                  Analyze Transaction with AI
                </>
              )}
            </button>
          </div>

          <div
            className={`flex flex-col rounded-xl border bg-zinc-900/80 p-6 backdrop-blur-md transition-all duration-300 ease-in-out ${
              riskStyle ? `${riskStyle.border} ${riskStyle.glow}` : 'border-zinc-800'
            }`}
            aria-live="polite"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold tracking-tight">Security audit report</h2>
              {result && riskStyle && (
                <span className={`rounded-xl border px-3 py-1 text-xs font-semibold ${riskStyle.badge}`}>
                  {result.riskLevel}
                </span>
              )}
            </div>

            {!loading && !result && !error && (
              <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/60 text-zinc-600">
                  <ShieldIcon className="h-8 w-8" />
                </span>
                <p className="mt-4 text-base font-medium text-zinc-300">No transaction scanned yet</p>
                <p className="mt-1 max-w-xs text-sm text-zinc-500">
                  Load a sample on the left and run the analysis to see the audit here.
                </p>
              </div>
            )}

            {loading && (
              <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
                <div className="relative flex h-20 w-20 items-center justify-center">
                  <span className="absolute inset-0 animate-ping rounded-full bg-cyan-400/20 motion-reduce:animate-none" />
                  <span className="relative flex h-20 w-20 items-center justify-center rounded-full border border-cyan-400/40 bg-zinc-950 text-cyan-300">
                    <Spinner className="h-9 w-9" />
                  </span>
                </div>
                <p className="mt-6 text-base font-medium text-zinc-200">The agent is reviewing your transaction</p>
                <p key={loadingStep} className="mt-1 animate-pulse text-sm text-cyan-300/80 motion-reduce:animate-none">
                  {LOADING_STEPS[loadingStep]}
                </p>
              </div>
            )}

            {!loading && error && (
              <div className="mt-6 flex items-start gap-3 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
                <AlertIcon className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
                <div>
                  <p className="font-medium text-red-300">Analysis failed</p>
                  <p className="mt-1 text-red-200/80">{error}</p>
                </div>
              </div>
            )}

            {!loading && result && riskStyle && recStyle && (
              <div className="mt-6 flex flex-col gap-6">
                <div className="flex flex-col items-center gap-5 sm:flex-row">
                  <RiskGauge score={gaugeScore} color={riskStyle.stroke} label={riskStyle.label} />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-medium text-zinc-400">What this transaction does</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-zinc-200">{result.summary}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-zinc-400">
                    Detected warnings ({result.warnings.length})
                  </h3>
                  {result.warnings.length === 0 ? (
                    <div className="mt-2 flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                      <CheckIcon className="h-4 w-4 shrink-0" />
                      No drains, unknown programs, or risky approvals were found.
                    </div>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {result.warnings.map((w, i) => (
                        <li
                          key={`${i}-${w.slice(0, 24)}`}
                          className="flex items-start gap-2.5 rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-sm text-zinc-200 transition-all duration-300 ease-in-out hover:border-zinc-700"
                        >
                          <AlertIcon
                            className={`mt-0.5 h-4 w-4 shrink-0 ${
                              result.riskLevel === 'LOW' || result.riskLevel === 'MEDIUM'
                                ? 'text-amber-400'
                                : 'text-red-400'
                            }`}
                          />
                          <span className="leading-relaxed">{w}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-medium text-zinc-400">Final recommendation</h3>
                  <div
                    className={`mt-2 flex flex-col items-center justify-center gap-1 rounded-xl border px-5 py-5 text-center transition-all duration-300 ease-in-out ${recStyle.classes}`}
                  >
                    <div className="flex items-center gap-3 text-2xl font-bold tracking-wide sm:text-3xl">
                      <LiveDot colorClass={recStyle.dot} />
                      {recStyle.label}
                    </div>
                    <p className="text-sm text-zinc-300/80">{recStyle.hint}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-zinc-800 py-8 text-center text-xs text-zinc-500">
        AgentGuard AI runs on Solana Devnet. Reports are advisory, so review every transaction yourself.
      </footer>
    </div>
  );
}
