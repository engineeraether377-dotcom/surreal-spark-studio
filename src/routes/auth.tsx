import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { FormEvent, useEffect, useState } from "react";

type StoredUser = { name: string; email: string; password: string };

const USERS_KEY = "cognivance_users";
const SESSION_KEY = "cognivance_session";

function readUsers(): StoredUser[] {
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || "[]"); } catch { return []; }
}

export const Route = createFileRoute("/auth")({ component: AuthPage });

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(SESSION_KEY)) navigate({ to: "/research" });
  }, [navigate]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    await new Promise((resolve) => setTimeout(resolve, 350));

    const normalized = email.trim().toLowerCase();
    if (!normalized || !password) { setError("Enter your email and password."); setBusy(false); return; }

    const users = readUsers();
    if (mode === "signup") {
      if (!name.trim()) { setError("Enter your name."); setBusy(false); return; }
      if (password.length < 8) { setError("Use at least 8 characters for your password."); setBusy(false); return; }
      if (users.some((u) => u.email === normalized)) { setError("An account with this email already exists."); setBusy(false); return; }
      const user = { name: name.trim(), email: normalized, password };
      localStorage.setItem(USERS_KEY, JSON.stringify([...users, user]));
      localStorage.setItem(SESSION_KEY, JSON.stringify({ name: user.name, email: user.email, signedInAt: Date.now() }));
      navigate({ to: "/research" });
    } else {
      const user = users.find((u) => u.email === normalized && u.password === password);
      if (!user) { setError("Email or password is incorrect."); setBusy(false); return; }
      localStorage.setItem(SESSION_KEY, JSON.stringify({ name: user.name, email: user.email, signedInAt: Date.now() }));
      navigate({ to: "/research" });
    }
    setBusy(false);
  };

  return (
    <main className="min-h-screen bg-[#020406] px-5 py-8 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[1180px] items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-2xl border border-white/10 bg-[#070a0d] shadow-2xl lg:grid-cols-[1.15fr_.85fr]">
          <section className="relative hidden min-h-[680px] overflow-hidden border-r border-white/10 p-10 lg:block">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(43,211,242,.13),transparent_35%),linear-gradient(rgba(255,255,255,.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.018)_1px,transparent_1px)] bg-[length:auto,30px_30px,30px_30px]" />
            <div className="relative z-10 flex h-full flex-col justify-between">
              <div><div className="font-mono text-[8px] tracking-[.4em] text-cyan-300/55">COGNIVANCE LABS / NIMBLE</div><h1 className="mt-6 max-w-[12ch] text-5xl font-medium tracking-[-.06em]">The research console.</h1><p className="mt-6 max-w-[42ch] text-sm leading-7 text-white/45">Access the NIMBLE research environment, interactive neural reconstructions and instrument programme materials.</p></div>
              <div className="relative mx-auto h-64 w-64 [perspective:900px]">
                {Array.from({ length: 9 }, (_, i) => <img key={i} src="https://upload.wikimedia.org/wikipedia/commons/b/b2/MRI_of_Human_Brain.jpg" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-contain grayscale contrast-[1.8] brightness-[1.4] mix-blend-screen" style={{ transform: `translateZ(${(i - 4) * 10}px) scale(${1 - Math.abs(i - 4) * .018})`, opacity: .08 + (4 - Math.abs(i - 4)) * .035 }} />)}
              </div>
              <div className="flex gap-8 font-mono text-[7px] tracking-[.2em] text-white/25"><span>T1W</span><span>3D RECONSTRUCTION</span><span>ONLINE</span></div>
            </div>
          </section>

          <section className="p-7 sm:p-10 lg:p-12">
            <Link to="/" className="font-mono text-[7px] tracking-[.25em] text-white/30 hover:text-white/60">← COGNIVANCE LABS</Link>
            <div className="mt-14"><div className="flex rounded-full border border-white/10 bg-black/20 p-1"><button type="button" onClick={() => { setMode("login"); setError(""); }} className={`flex-1 rounded-full px-4 py-2 text-sm transition ${mode === "login" ? "bg-white text-black" : "text-white/45"}`}>Sign in</button><button type="button" onClick={() => { setMode("signup"); setError(""); }} className={`flex-1 rounded-full px-4 py-2 text-sm transition ${mode === "signup" ? "bg-white text-black" : "text-white/45"}`}>Create account</button></div>
              <h2 className="mt-10 text-3xl font-medium tracking-[-.04em]">{mode === "login" ? "Welcome back." : "Create your research account."}</h2>
              <p className="mt-3 text-sm leading-6 text-white/40">{mode === "login" ? "Sign in to continue to the NIMBLE research console." : "Create an account for the Cognivance Labs research environment."}</p>
              <form onSubmit={submit} className="mt-9 space-y-4">
                {mode === "signup" && <label className="block"><span className="mb-2 block font-mono text-[7px] uppercase tracking-[.2em] text-white/30">Name</span><input value={name} onChange={(e)=>setName(e.target.value)} autoComplete="name" className="w-full rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none transition placeholder:text-white/20 focus:border-cyan-300/45" placeholder="Your name" /></label>}
                <label className="block"><span className="mb-2 block font-mono text-[7px] uppercase tracking-[.2em] text-white/30">Email</span><input value={email} onChange={(e)=>setEmail(e.target.value)} type="email" autoComplete="email" className="w-full rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none transition placeholder:text-white/20 focus:border-cyan-300/45" placeholder="you@company.com" /></label>
                <label className="block"><span className="mb-2 block font-mono text-[7px] uppercase tracking-[.2em] text-white/30">Password</span><input value={password} onChange={(e)=>setPassword(e.target.value)} type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} className="w-full rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none transition placeholder:text-white/20 focus:border-cyan-300/45" placeholder="••••••••" /></label>
                {error && <div className="rounded-lg border border-red-400/20 bg-red-400/[.06] px-3 py-2 text-xs text-red-200/75">{error}</div>}
                <button disabled={busy} type="submit" className="w-full rounded-lg bg-white px-5 py-3.5 text-sm font-semibold text-black transition hover:bg-cyan-100 disabled:cursor-wait disabled:opacity-50">{busy ? "Authenticating…" : mode === "login" ? "Enter research console" : "Create research account"}</button>
              </form>
              <p className="mt-7 text-center text-[10px] leading-5 text-white/25">Research access is currently a local demo session. Production authentication should be connected to a managed identity provider before collecting real user credentials.</p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
