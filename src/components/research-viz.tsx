import { useEffect, useRef, useState } from "react";

/* ---------------- live signal hook ---------------- */

function useTick(intervalMs = 1200) {
  const [t, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT((v) => v + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return t;
}

export function LiveBadge({ label = "Live stream" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-foreground/15 bg-foreground/5 px-3 py-1">
      <span className="live-dot h-1.5 w-1.5 rounded-full bg-foreground" />
      <span className="t-marker text-foreground/75">{label}</span>
    </span>
  );
}

/* ---------------- EEG multi-channel trace ---------------- */

export function EEGTrace({
  channels = 6,
  height = 180,
  speed = 1,
}: {
  channels?: number;
  height?: number;
  speed?: number;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const seeds = Array.from({ length: channels }, (_, i) => 0.7 + i * 0.37);
    let phase = 0;

    const draw = () => {
      phase += 0.02 * speed;
      ctx.clearRect(0, 0, w, h);

      // grid
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }

      const band = h / channels;
      for (let c = 0; c < channels; c++) {
        const mid = band * c + band / 2;
        const seed = seeds[c] ?? 1;
        ctx.beginPath();
        for (let x = 0; x <= w; x += 2) {
          const t = x / 40 + phase * (1 + c * 0.05);
          const v =
            Math.sin(t * seed) * 0.5 +
            Math.sin(t * seed * 2.7 + 1.2) * 0.28 +
            Math.sin(t * seed * 6.1 + 0.4) * 0.14 +
            (Math.random() - 0.5) * 0.1;
          const y = mid + v * (band * 0.36);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(255,255,255,${0.85 - c * 0.09})`;
        ctx.lineWidth = 1.1;
        ctx.stroke();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [channels, speed]);

  return (
    <canvas
      ref={ref}
      aria-label="Live multi-channel EEG trace"
      role="img"
      className="w-full"
      style={{ height }}
    />
  );
}

/* ---------------- MRI slice viewer ---------------- */

export function MRIScan({ label = "T1 / axial" }: { label?: string }) {
  const [slice, setSlice] = useState(42);
  useEffect(() => {
    let dir = 1;
    const id = setInterval(() => {
      setSlice((s) => {
        if (s > 78) dir = -1;
        if (s < 14) dir = 1;
        return s + dir;
      });
    }, 90);
    return () => clearInterval(id);
  }, []);

  const spread = (slice - 46) / 46;

  return (
    <div className="relative overflow-hidden scope instrument rounded-xl border border-foreground/12">
      <svg viewBox="0 0 200 200" className="block w-full" role="img" aria-label="MRI axial slice">
        <defs>
          <radialGradient id="mriTissue" cx="50%" cy="48%" r="55%">
            <stop offset="0%" stopColor="#f4f4f4" stopOpacity="0.92" />
            <stop offset="55%" stopColor="#9a9a9a" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#111" stopOpacity="0.95" />
          </radialGradient>
          <filter id="mriBlur">
            <feGaussianBlur stdDeviation="1.1" />
          </filter>
        </defs>

        <ellipse cx="100" cy="100" rx={72 - Math.abs(spread) * 22} ry={86 - Math.abs(spread) * 26} fill="url(#mriTissue)" />
        <g filter="url(#mriBlur)" opacity="0.85">
          <ellipse cx="100" cy="100" rx={54 - Math.abs(spread) * 16} ry={68 - Math.abs(spread) * 20} fill="none" stroke="#e6e6e6" strokeWidth="0.7" />
          <path
            d={`M100 ${34 + Math.abs(spread) * 12} L100 ${166 - Math.abs(spread) * 12}`}
            stroke="#0a0a0a"
            strokeWidth="2.4"
          />
          {Array.from({ length: 9 }, (_, i) => {
            const y = 52 + i * 12;
            const amp = 26 - Math.abs(spread) * 9 - Math.abs(i - 4) * 2.2;
            return (
              <path
                key={i}
                d={`M${100 - amp} ${y} Q ${100 - amp / 2} ${y + (i % 2 ? 5 : -5)} 100 ${y} Q ${100 + amp / 2} ${y + (i % 2 ? -5 : 5)} ${100 + amp} ${y}`}
                fill="none"
                stroke="rgba(255,255,255,0.55)"
                strokeWidth="0.8"
              />
            );
          })}
        </g>
        <ellipse cx="100" cy="100" rx={73 - Math.abs(spread) * 22} ry={87 - Math.abs(spread) * 26} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.8" />
      </svg>

      <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-foreground/25 to-transparent scan-sweep" />

      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-black/85 to-transparent px-3 py-2">
        <span className="t-marker text-foreground/70">{label}</span>
        <span className="t-num text-[0.72rem] text-foreground/70">slice {slice}/92</span>
      </div>
    </div>
  );
}

/* ---------------- 3D tractography ---------------- */

export function Tractography({ bundles = 26 }: { bundles?: number }) {
  const [rot, setRot] = useState(0);
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      setRot((r) => (r + 0.25) % 360);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const paths = Array.from({ length: bundles }, (_, i) => {
    const a = (i / bundles) * Math.PI * 2;
    const r = 34 + (i % 5) * 9;
    const x1 = 100 + Math.cos(a) * r;
    const y1 = 100 + Math.sin(a) * r * 0.72;
    const x2 = 100 - Math.cos(a) * r * 0.85;
    const y2 = 100 - Math.sin(a) * r * 0.55;
    const cx = 100 + Math.cos(a + 1.1) * (r * 1.5);
    const cy = 100 + Math.sin(a + 0.8) * (r * 0.9);
    return { d: `M${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`, o: 0.25 + (i % 6) * 0.12 };
  });

  return (
    <div className="relative overflow-hidden scope instrument rounded-xl border border-foreground/12">
      <div style={{ perspective: "900px" }}>
        <div
          style={{ transform: `rotateY(${rot}deg) rotateX(12deg)`, transformStyle: "preserve-3d" }}
          className="will-change-transform"
        >
          <svg viewBox="0 0 200 200" className="block w-full" role="img" aria-label="3D white-matter tractography">
            <g fill="none" strokeLinecap="round">
              {paths.map((p, i) => (
                <path
                  key={i}
                  d={p.d}
                  stroke={`rgba(255,255,255,${p.o})`}
                  strokeWidth={i % 4 === 0 ? 1.4 : 0.7}
                  strokeDasharray="120 900"
                  className="flow-line"
                  style={{ animationDelay: `${-i * 0.5}s` }}
                />
              ))}
            </g>
            <circle cx="100" cy="100" r="3" fill="rgba(255,255,255,0.9)" />
          </svg>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-black/85 to-transparent px-3 py-2">
        <span className="t-marker text-foreground/70">DTI tractography</span>
        <span className="t-num text-[0.72rem] text-foreground/70">{bundles * 1417} streamlines</span>
      </div>
    </div>
  );
}

/* ---------------- synaptic firing field ---------------- */

export function SynapseField({ nodes = 34 }: { nodes?: number }) {
  const t = useTick(700);
  const pts = Array.from({ length: nodes }, (_, i) => {
    const a = i * 2.399963;
    const r = 8 + Math.sqrt(i / nodes) * 82;
    return { x: 100 + Math.cos(a) * r, y: 100 + Math.sin(a) * r * 0.8, i };
  });

  return (
    <div className="relative overflow-hidden scope instrument rounded-xl border border-foreground/12">
      <svg viewBox="0 0 200 200" className="block w-full" role="img" aria-label="Live synaptic firing field">
        <g stroke="rgba(255,255,255,0.14)" strokeWidth="0.5">
          {pts.map((p, i) => {
            const q = pts[(i + 3) % pts.length]!;
            return <line key={i} x1={p.x} y1={p.y} x2={q.x} y2={q.y} />;
          })}
        </g>
        {pts.map((p) => {
          const hot = (p.i + t) % 5 === 0;
          return (
            <circle
              key={p.i}
              cx={p.x}
              cy={p.y}
              r={hot ? 3.2 : 1.5}
              fill={hot ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.4)"}
              style={{ transition: "r 400ms ease, fill 400ms ease" }}
            />
          );
        })}
      </svg>
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-black/85 to-transparent px-3 py-2">
        <span className="t-marker text-foreground/70">Synaptic field</span>
        <span className="t-num text-[0.72rem] text-foreground/70">
          {(1240 + ((t * 37) % 260)).toLocaleString()} junctions live
        </span>
      </div>
    </div>
  );
}

/* ---------------- risk / prediction curve ---------------- */

export function RiskCurve() {
  const t = useTick(1600);
  const shift = (t % 6) * 2;
  const path = `M0 92 C 60 90, 120 ${86 - shift / 2}, 180 ${74 - shift} S 300 ${44 - shift}, 400 ${14 - shift / 2}`;

  return (
    <div className="relative overflow-hidden scope instrument rounded-xl border border-foreground/12 p-4">
      <svg viewBox="0 0 400 110" className="block w-full" role="img" aria-label="Pre-symptomatic risk trajectory">
        <g stroke="rgba(255,255,255,0.08)">
          {[0, 27, 54, 81, 108].map((y) => (
            <line key={y} x1="0" y1={y} x2="400" y2={y} />
          ))}
        </g>
        <path d={`${path} L400 110 L0 110 Z`} fill="rgba(255,255,255,0.06)" />
        <path
          d={path}
          fill="none"
          stroke="rgba(255,255,255,0.9)"
          strokeWidth="1.6"
          strokeDasharray="600"
          strokeDashoffset="0"
          style={{ transition: "d 1200ms ease" }}
        />
        <line x1="250" y1="0" x2="250" y2="110" stroke="rgba(255,255,255,0.35)" strokeDasharray="3 4" />
        <text x="256" y="14" fill="rgba(255,255,255,0.6)" fontSize="8" fontFamily="monospace">
          CLINICAL ONSET
        </text>
      </svg>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <span className="t-marker text-foreground/70">Degeneration signature</span>
        <span className="t-num text-[0.72rem] text-foreground/70">
          lead time {6.4 + ((t % 5) * 0.2).toFixed(1) === "6.4" ? "6.4" : (6.4 + (t % 5) * 0.2).toFixed(1)} yrs
        </span>
      </div>
    </div>
  );
}

/* ---------------- metric readout ---------------- */

export function Metric({
  label,
  value,
  unit,
  jitter = 0,
}: {
  label: string;
  value: number;
  unit?: string;
  jitter?: number;
}) {
  const t = useTick(1400);
  const shown = jitter ? (value + (((t * 7919) % 100) / 100 - 0.5) * jitter).toFixed(jitter < 1 ? 2 : 1) : value;
  return (
    <div className="rounded-lg border border-foreground/10 bg-foreground/[0.03] px-4 py-3">
      <p className="t-marker text-ash">{label}</p>
      <p className="t-num mt-2 text-[1.35rem] font-semibold text-foreground">
        {shown}
        {unit ? <span className="ml-1 text-[0.8rem] font-normal text-ash">{unit}</span> : null}
      </p>
    </div>
  );
}

/* ---------------- brain heat map (grayscale activation) ---------------- */

export function BrainHeatmap({
  label = "Cortical activation — axial",
  cells = 22,
}: {
  label?: string;
  cells?: number;
}) {
  const t = useTick(900);
  const grid = Array.from({ length: cells * cells }, (_, i) => {
    const x = i % cells;
    const y = Math.floor(i / cells);
    const nx = (x / (cells - 1)) * 2 - 1;
    const ny = (y / (cells - 1)) * 2 - 1;
    const inside = nx * nx * 1.15 + ny * ny * 0.85 < 1;
    const v =
      0.5 +
      0.5 *
        Math.sin(nx * 3.1 + t * 0.22) *
        Math.cos(ny * 2.6 - t * 0.17) *
        Math.cos((nx + ny) * 1.7 + t * 0.11);
    return { x, y, inside, v: Math.max(0, Math.min(1, v)) };
  });

  return (
    <div className="scope instrument relative rounded-xl border border-foreground/12">
      <svg viewBox={`0 0 ${cells} ${cells}`} className="block w-full" role="img" aria-label={label}>
        <defs>
          <clipPath id="brainClip">
            <ellipse cx={cells / 2} cy={cells / 2} rx={cells * 0.46} ry={cells * 0.5} />
          </clipPath>
        </defs>
        <g clipPath="url(#brainClip)">
          {grid.map((c, i) =>
            c.inside ? (
              <rect
                key={i}
                x={c.x}
                y={c.y}
                width="1"
                height="1"
                fill={`rgba(255,255,255,${(0.06 + c.v * 0.85).toFixed(3)})`}
                style={{ transition: "fill 900ms linear" }}
              />
            ) : null,
          )}
          <path
            d={`M${cells / 2} 1 L${cells / 2} ${cells - 1}`}
            stroke="rgba(0,0,0,0.75)"
            strokeWidth="0.35"
          />
        </g>
        <ellipse
          cx={cells / 2}
          cy={cells / 2}
          rx={cells * 0.46}
          ry={cells * 0.5}
          fill="none"
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="0.12"
        />
      </svg>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-12 scan-sweep bg-gradient-to-b from-foreground/20 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-paper via-paper/70 to-transparent px-3 py-2">
        <span className="t-marker text-foreground/70">{label}</span>
        <span className="t-num text-[0.72rem] text-foreground/70">
          {(0.72 + ((t * 13) % 20) / 100).toFixed(2)} norm. µV
        </span>
      </div>
    </div>
  );
}

/* ---------------- connectome adjacency matrix ---------------- */

export function ConnectomeMatrix({ n = 16 }: { n?: number }) {
  const t = useTick(1100);
  return (
    <div className="scope instrument rounded-xl border border-foreground/12 p-3">
      <svg viewBox={`0 0 ${n} ${n}`} className="block w-full" role="img" aria-label="Connectome adjacency matrix">
        {Array.from({ length: n * n }, (_, i) => {
          const x = i % n;
          const y = Math.floor(i / n);
          const v =
            x === y
              ? 1
              : Math.abs(Math.sin((x * 12.9898 + y * 78.233 + t * 0.4) * 1.13)) * 0.9;
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width="0.94"
              height="0.94"
              fill={`rgba(255,255,255,${(0.04 + v * 0.8).toFixed(3)})`}
              style={{ transition: "fill 1100ms linear" }}
            />
          );
        })}
      </svg>
      <div className="mt-3 flex items-center justify-between">
        <span className="t-marker text-foreground/70">Region × region coupling</span>
        <span className="t-num text-[0.72rem] text-foreground/70">{n * n} edges</span>
      </div>
    </div>
  );
}

/* ---------------- band power bars ---------------- */

export function BandPower() {
  const t = useTick(800);
  const bands = [
    { k: "δ", base: 0.72 },
    { k: "θ", base: 0.54 },
    { k: "α", base: 0.86 },
    { k: "β", base: 0.42 },
    { k: "γ", base: 0.63 },
    { k: "hγ", base: 0.31 },
  ];
  return (
    <div className="scope instrument rounded-xl border border-foreground/12 p-4">
      <div className="flex h-32 items-end gap-2.5">
        {bands.map((b, i) => {
          const h = Math.max(
            8,
            Math.min(100, (b.base + Math.sin(t * 0.7 + i) * 0.16) * 100),
          );
          return (
            <div key={b.k} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-2">
              <div
                className="w-full rounded-t-[3px] bg-gradient-to-t from-foreground/25 to-foreground"
                style={{ height: `${h}%`, transition: "height 800ms cubic-bezier(0.16,1,0.3,1)" }}
              />
              <span className="t-num text-center text-[0.7rem] text-foreground/60">{b.k}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="t-marker text-foreground/70">Spectral band power</span>
        <span className="t-num text-[0.72rem] text-foreground/70">1.2 kHz · 1024 ch</span>
      </div>
    </div>
  );
}

/* ---------------- coronal slice triptych ---------------- */

export function SliceTriptych({ titles = ["Coronal", "Sagittal", "Axial"] }: { titles?: string[] }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {titles.map((tt, i) => (
        <div key={tt} className="scope instrument relative rounded-lg border border-foreground/12">
          <svg viewBox="0 0 100 100" className="block w-full" role="img" aria-label={`${tt} slice`}>
            <defs>
              <radialGradient id={`g${i}`} cx="50%" cy="48%" r="58%">
                <stop offset="0%" stopColor="#efefef" stopOpacity="0.9" />
                <stop offset="60%" stopColor="#8e8e8e" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#0d0d0d" stopOpacity="0.95" />
              </radialGradient>
            </defs>
            <ellipse cx="50" cy="50" rx={i === 1 ? 30 : 36} ry={i === 2 ? 42 : 38} fill={`url(#g${i})`} />
            {Array.from({ length: 6 }, (_, k) => (
              <path
                key={k}
                d={`M${20 + k * 2} ${26 + k * 8} Q 50 ${18 + k * 9} ${80 - k * 2} ${26 + k * 8}`}
                fill="none"
                stroke="rgba(255,255,255,0.45)"
                strokeWidth="0.6"
              />
            ))}
          </svg>
          <span className="t-marker absolute left-2 top-2 text-[0.6rem] text-foreground/60">{tt}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------------- cohort risk distribution ---------------- */

export function CohortBars() {
  const t = useTick(1500);
  const rows = [
    { k: "Cohort A · n=412", v: 0.82 },
    { k: "Cohort B · n=336", v: 0.64 },
    { k: "Cohort C · n=298", v: 0.47 },
    { k: "Controls · n=260", v: 0.12 },
  ];
  return (
    <div className="space-y-4">
      {rows.map((r, i) => {
        const v = Math.max(0.05, Math.min(1, r.v + Math.sin(t * 0.5 + i) * 0.03));
        return (
          <div key={r.k}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[0.85rem] font-medium text-foreground/85">{r.k}</span>
              <span className="t-num text-[0.78rem] text-ash">{(v * 100).toFixed(1)}%</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
              <div
                className="h-full rounded-full bg-foreground"
                style={{ width: `${v * 100}%`, transition: "width 1500ms cubic-bezier(0.16,1,0.3,1)" }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- gauge ring ---------------- */

export function Gauge({ label, value, unit = "%" }: { label: string; value: number; unit?: string }) {
  const t = useTick(1700);
  const v = Math.max(0, Math.min(100, value + Math.sin(t * 0.6) * 0.8));
  const c = 2 * Math.PI * 42;
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 100 100" className="h-20 w-20 shrink-0 -rotate-90" role="img" aria-label={label}>
        <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="6" className="text-foreground/12" />
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          className="text-foreground"
          strokeDasharray={c}
          strokeDashoffset={c - (c * v) / 100}
          style={{ transition: "stroke-dashoffset 1600ms cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      <div className="min-w-0">
        <p className="t-num text-[1.5rem] font-semibold text-foreground">
          {v.toFixed(1)}
          <span className="ml-1 text-[0.8rem] font-normal text-ash">{unit}</span>
        </p>
        <p className="mt-1 text-[0.82rem] text-ash">{label}</p>
      </div>
    </div>
  );
}

/* ---------------- telemetry ticker ---------------- */

export function Ticker({ lines }: { lines: string[] }) {
  const t = useTick(1300);
  const shown = lines.map((l, i) => lines[(i + t) % lines.length]!);
  return (
    <ul className="space-y-2.5 font-mono text-[0.74rem] leading-relaxed text-ash">
      {shown.slice(0, 6).map((l, i) => (
        <li key={i} className="flex gap-3">
          <span className="shrink-0 text-foreground/45">
            {String((t * 7 + i * 13) % 999).padStart(3, "0")}
          </span>
          <span className="min-w-0 truncate">{l}</span>
        </li>
      ))}
    </ul>
  );
}
