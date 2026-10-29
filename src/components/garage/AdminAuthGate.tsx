import { useState, useEffect } from "react";
import { Lock, KeyRound, ShieldAlert, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { verifyAdminPassword } from "@/lib/garage/inquiryActions";

interface AdminAuthGateProps {
  children: React.ReactNode;
}

export function AdminAuthGate({ children }: AdminAuthGateProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [error, setError] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("ssf_admin_authed");
      if (stored === "true") {
        setIsAuthenticated(true);
      }
    }
    setIsChecking(false);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await verifyAdminPassword({ data: { password: passwordInput } });
      if (res?.success) {
        sessionStorage.setItem("ssf_admin_authed", "true");
        setIsAuthenticated(true);
        setError(false);
        toast.success("Prihlásenie úspešné! Vitajte v Admin paneli.");
      } else {
        setError(true);
        toast.error("Nesprávne heslo. Skúste to znova.");
      }
    } catch (err) {
      setError(true);
      toast.error("Chyba pri overovaní hesla.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("ssf_admin_authed");
    setIsAuthenticated(false);
    setPasswordInput("");
    toast.info("Boli ste odhlásený.");
  };

  if (isChecking) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#070a0e] font-mono text-sm text-white/50">
        Overujem prístup...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#070a0e] font-mono text-slate-100 p-4">
        <div className="w-full max-w-sm rounded-xl border border-white/10 bg-[#0e1218] p-6 shadow-2xl backdrop-blur-xl">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-emerald-500/10 p-3 text-emerald-400 border border-emerald-500/20">
              <Lock className="h-6 w-6" />
            </div>
          </div>

          <h2 className="text-center text-sm font-bold tracking-widest text-white uppercase mb-1">
            BAUBOX ADMIN VSTUP
          </h2>
          <p className="text-center text-[11px] text-white/50 mb-6">
            Zadajte heslo pre prístup k správe dopytov a kalkulačke.
          </p>

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div>
              <label className="block text-white/60 mb-1.5 font-bold">Admin Heslo</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    setError(false);
                  }}
                  placeholder="Vložte heslo..."
                  className={`w-full rounded-lg border bg-black/50 px-3 py-2 text-white placeholder-white/30 focus:outline-none transition ${
                    error ? "border-red-500 focus:border-red-500" : "border-white/10 focus:border-emerald-400"
                  }`}
                />
                <KeyRound className="absolute right-3 top-2.5 h-4 w-4 text-white/30" />
              </div>
              {error && (
                <div className="flex items-center gap-1 text-[10px] text-red-400 mt-1">
                  <ShieldAlert className="h-3 w-3" />
                  <span>Nesprávne heslo</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-400 py-2.5 text-center text-xs font-bold text-black transition hover:bg-emerald-300 disabled:opacity-50 shadow-lg shadow-emerald-400/20"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Overujem...</span>
                </>
              ) : (
                <span>Prihlásiť sa do Adminu</span>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50 print:hidden">
        <button
          onClick={handleLogout}
          className="rounded-full border border-white/10 bg-black/80 px-3 py-1.5 text-[10px] text-white/60 hover:text-white hover:bg-red-500/20 hover:border-red-500/40 transition backdrop-blur-md shadow-lg"
        >
          🔒 Odhlásiť sa z Adminu
        </button>
      </div>
      {children}
    </>
  );
}
