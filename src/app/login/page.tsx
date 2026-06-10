"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/domains/auth/actions/login";
import { getSchoolBranding } from "@/domains/auth/actions/branding";
import { 
  GraduationCap, Loader2, Lock, User, Eye, EyeOff, 
  Shield, Zap, Users, Settings, ArrowRight, 
  ShieldCheck, Headphones, Mail, KeyRound
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [school, setSchool] = useState<any>(null);

  useEffect(() => {
    async function fetchBranding() {
      const branding = await getSchoolBranding();
      if (branding) {
        setSchool(branding);
      }
    }
    fetchBranding();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const formData = new FormData(e.currentTarget);
      let username = formData.get("username") as string;
      const password = formData.get("password") as string;

      const result = await login({ username, password });

      if (result?.error) {
        setError(result.error);
        setIsLoading(false);
        return;
      }
      // Success is handled by redirect() in the server action
    } catch (err: any) {
      // Don't show error if it's a redirect (Next.js throws an error for redirects)
      const isRedirect = 
        err?.message === "NEXT_REDIRECT" || 
        err?.digest?.startsWith("NEXT_REDIRECT") ||
        String(err).includes("NEXT_REDIRECT") ||
        (err instanceof Error && err.message.includes("NEXT_REDIRECT"));

      if (isRedirect) {
        return;
      }

      console.error("Login Client Error Details:", err);

      // Friendly message for Next.js internal Server Action errors
      if (err.message?.toLowerCase().includes("unexpected response")) {
        setError("Le serveur a mis trop de temps à répondre. يرجى التأكد من اتصال الإنترنت والمحاولة مرة أخرى.");
      } else {
        setError("Erreur inattendue. Veuillez réessayer. (Vérifiez la console pour plus de détails)");
      }
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] flex flex-col relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-200px] left-[-100px] w-[600px] h-[600px] bg-indigo-600/8 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-200px] right-[-100px] w-[600px] h-[600px] bg-purple-600/8 rounded-full blur-[150px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/3 rounded-full blur-[200px]" />
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }} />
      </div>

      {/* Top Bar */}
      <header className="relative z-10 flex items-center gap-3 p-6 md:p-8">
        <div className="w-11 h-11 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
          {school?.logoPath ? (
            <img src={school.logoPath} alt={school.name} className="w-full h-full object-cover rounded-xl" />
          ) : (
            <GraduationCap size={22} className="text-white" />
          )}
        </div>
        <div>
          <p className="text-white font-black text-lg tracking-tight">
            {school?.name ? school.name.toUpperCase() : "EDUT"} <span className="text-indigo-400">{school?.name ? "" : "Pro"}</span>
          </p>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
            {school?.name ? `Espace ${school.name}` : "Espace de gestion intelligent"}
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative z-10 flex items-center justify-center px-6 py-4">
        <div className="w-full max-w-[1200px] grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-8 lg:gap-12 items-center">
          
          {/* LEFT: Welcome + Features */}
          <div className="hidden lg:flex flex-col gap-6">
            <div className="mb-2">
              <div className="flex items-center gap-2 mb-3">
                <span className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Authentication</span>
                <div className="w-1 h-1 rounded-full bg-slate-600" />
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Utilisateurs & Équipes</span>
              </div>
              <h2 className="text-3xl font-black text-white tracking-tight leading-tight">
                Espace de Gestion
              </h2>
              <p className="text-slate-400 text-sm font-medium mt-2 leading-relaxed">
                Connectez-vous pour gérer vos utilisateurs, rôles et paramètres de campus en toute sécurité.
              </p>
            </div>

            <div className="space-y-3">
              {[
                { icon: Shield,   label: "Sécurisé",        desc: "Vos données sont protégées par les meilleurs standards de sécurité." },
                { icon: Zap,      label: "Performant",       desc: "Une plateforme rapide et fiable pour une gestion fluide." },
                { icon: Users,    label: "Collaboratif",     desc: "Travaillez efficacement avec votre équipe en temps réel." },
                { icon: Settings, label: "Personnalisable",  desc: "Adaptez votre espace à vos besoins et préférences." },
              ].map((feat, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.05] backdrop-blur-sm">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                    <feat.icon size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-bold">{feat.label}</p>
                    <p className="text-slate-500 text-[11px] font-medium leading-relaxed">{feat.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Access Notice */}
            <div className="mt-2 p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
                  <KeyRound size={16} />
                </div>
                <div>
                  <p className="text-indigo-300 text-xs font-bold">Accès réservé</p>
                  <p className="text-slate-500 text-[11px] font-medium mt-0.5">Seuls les utilisateurs autorisés peuvent accéder à cette plateforme.</p>
                </div>
              </div>
            </div>
          </div>

          {/* CENTER: Login Form */}
          <div className="w-full max-w-[420px] mx-auto">
            <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] rounded-[2rem] p-8 md:p-10 shadow-2xl shadow-black/20 relative overflow-hidden">
              {/* Top glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-indigo-500/10 rounded-full blur-[60px] -mt-20" />
              
              {/* Logo */}
              <div className="flex flex-col items-center mb-8 relative">
                <div className="w-16 h-16 rounded-full bg-indigo-600/10 border-2 border-indigo-500/30 flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/10">
                  <div className="w-11 h-11 rounded-full bg-indigo-600 flex items-center justify-center shadow-inner overflow-hidden">
                    {school?.logoPath ? (
                      <img src={school.logoPath} alt={school.name} className="w-full h-full object-cover" />
                    ) : (
                      <GraduationCap size={22} className="text-white" />
                    )}
                  </div>
                </div>
                <h1 className="text-2xl font-black text-white tracking-tight">
                  {school?.name || "Edut"} <span className="text-indigo-400">{school?.name ? "" : "Pro"}</span>
                </h1>
                <p className="text-slate-500 text-xs font-medium mt-1">
                  {school?.name ? `Portail de connexion ${school.name}` : "Connectez-vous à votre espace gestion"}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5 relative">
                {error && (
                  <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm font-bold text-center">
                    {error}
                  </div>
                )}

                {/* Username */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Utilisateur</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-indigo-400 transition-colors" size={18} />
                    <input 
                      name="username"
                      type="text"
                      required
                      placeholder="nom@ecole.com"
                      className="w-full h-[52px] pl-12 pr-4 bg-white/[0.04] border border-white/[0.08] rounded-xl outline-none text-white text-sm font-medium focus:border-indigo-500/50 focus:bg-white/[0.06] transition-all placeholder:text-slate-600"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Mot de Passe</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-indigo-400 transition-colors" size={18} />
                    <input 
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      className="w-full h-[52px] pl-12 pr-12 bg-white/[0.04] border border-white/[0.08] rounded-xl outline-none text-white text-sm font-medium focus:border-indigo-500/50 focus:bg-white/[0.06] transition-all placeholder:text-slate-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Remember + Forgot */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <div 
                      onClick={() => setRememberMe(!rememberMe)}
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer ${
                        rememberMe ? 'bg-indigo-600 border-indigo-600' : 'border-slate-600 bg-transparent'
                      }`}
                    >
                      {rememberMe && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <span className="text-slate-400 text-xs font-medium">Se souvenir de moi</span>
                  </label>
                  <span className="text-indigo-400 text-xs font-medium cursor-pointer hover:text-indigo-300 transition-colors">
                    Mot de passe oublié ?
                  </span>
                </div>

                {/* Submit */}
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full h-[52px] rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-black text-sm uppercase tracking-wider transition-all shadow-xl shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center gap-3 group"
                >
                  {isLoading ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <>
                      Se Connecter
                      <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-px bg-white/[0.06]" />
                <span className="text-slate-600 text-xs font-medium">ou</span>
                <div className="flex-1 h-px bg-white/[0.06]" />
              </div>

              {/* Contact Admin */}
              <button className="w-full h-[48px] rounded-xl border border-white/[0.08] bg-white/[0.02] text-slate-400 hover:text-white hover:bg-white/[0.05] hover:border-white/[0.15] font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2">
                <Headphones size={16} />
                Contacter l&apos;administrateur
              </button>
            </div>
          </div>

          {/* RIGHT: Illustration + Quote */}
          <div className="hidden lg:flex flex-col items-center justify-center gap-8">
            {/* Security Visual */}
            <div className="relative w-52 h-52 flex items-center justify-center">
              {/* Outer glow ring */}
              <div className="absolute inset-0 rounded-full bg-indigo-500/5 border border-indigo-500/10 animate-pulse" />
              <div className="absolute inset-4 rounded-full bg-indigo-500/5 border border-indigo-500/10" />
              {/* Center shield */}
              <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-indigo-500/20 flex items-center justify-center shadow-2xl shadow-indigo-500/10 backdrop-blur-sm">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg">
                  <Lock size={28} className="text-white" />
                </div>
              </div>
              {/* Floating dots */}
              <div className="absolute top-6 right-6 w-2 h-2 rounded-full bg-indigo-400/60 animate-ping" />
              <div className="absolute bottom-8 left-4 w-1.5 h-1.5 rounded-full bg-purple-400/60 animate-ping" style={{ animationDelay: '1s' }} />
              <div className="absolute top-1/2 right-2 w-1 h-1 rounded-full bg-indigo-300/40 animate-ping" style={{ animationDelay: '0.5s' }} />
            </div>

            {/* Quote */}
            <div className="text-center px-4">
              <div className="text-indigo-500/30 text-5xl font-serif leading-none mb-2">&ldquo;</div>
              <p className="text-slate-400 text-sm font-medium leading-relaxed">
                La sécurité de vos données,
              </p>
              <p className="text-indigo-400 text-sm font-bold">
                notre priorité absolue.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.05] bg-white/[0.02] backdrop-blur-sm">
        <div className="max-w-[1200px] mx-auto px-6 py-5">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sécurisé par RBAC</p>
                  <p className="text-[11px] text-slate-600 font-medium">Gestion des accès basée sur les rôles</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                  <Headphones size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Besoin d&apos;aide ?</p>
                  <p className="text-[11px] text-slate-600 font-medium">Notre équipe est disponible 24/7</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                  <Mail size={16} />
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 font-bold">support@edutpro.com</p>
                  <p className="text-[11px] text-slate-600 font-medium">+227 20 72 35 35</p>
                </div>
              </div>
            </div>
          </div>
          <p className="text-center text-slate-600 text-[10px] font-bold uppercase tracking-widest mt-4">
            © 2026 Edut Enterprise. Tous droits réservés.
          </p>
        </div>
      </footer>
    </div>
  );
}
