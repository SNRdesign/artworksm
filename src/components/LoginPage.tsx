import React, { useState } from "react";
import { UserAccount, Role } from "../types";
import { 
  Building2, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ShieldCheck, 
  ShieldAlert,
  LockKeyhole
} from "lucide-react";

interface LoginPageProps {
  users: UserAccount[];
  onLogin: (user: UserAccount) => void;
  onAcceptInvite?: (data: { email: string; fullName: string; password?: string }) => void;
}

export default function LoginPage({ users, onLogin, onAcceptInvite }: LoginPageProps) {
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Register / Invite Activation Modal state
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [regEmail, setRegEmail] = useState("");
  const [regFullName, setRegFullName] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regError, setRegError] = useState("");
  const [invitedUserAccount, setInvitedUserAccount] = useState<UserAccount | null>(null);

  // Check URL parameters on mount for email invitation links
  React.useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlEmail = params.get("inviteEmail") || params.get("email");
      if (urlEmail) {
        const clean = urlEmail.trim().toLowerCase();
        setRegEmail(clean);
        setIsRegisterOpen(true);
        handleEmailInputChange(clean);
      }
    } catch (e) {
      console.warn("Error reading URL search params:", e);
    }
  }, [users]);

  const handleEmailInputChange = (inputEmail: string) => {
    setRegEmail(inputEmail);
    const clean = inputEmail.trim().toLowerCase();
    if (clean && clean.includes("@")) {
      const existingInvite = users.find(u => u.email.toLowerCase() === clean);
      if (existingInvite) {
        setInvitedUserAccount(existingInvite);
        if (existingInvite.fullName) {
          setRegFullName(existingInvite.fullName);
        }
      } else {
        setInvitedUserAccount(null);
      }
    } else {
      setInvitedUserAccount(null);
    }
  };

  const handleAcceptInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");
    setSuccessMsg("");

    const emailClean = regEmail.trim().toLowerCase();
    if (!emailClean || !emailClean.includes("@")) {
      setRegError("Silakan masukkan alamat email yang valid.");
      return;
    }

    if (!invitedUserAccount) {
      setRegError("Alamat email ini belum didaftarkan oleh Administrator. Hanya Administrator yang dapat mendaftarkan akun baru.");
      return;
    }

    if (!regFullName.trim()) {
      setRegError("Silakan masukkan Nama Lengkap Anda.");
      return;
    }

    if (!regPassword.trim() || regPassword.trim().length < 3) {
      setRegError("Silakan buat kata sandi minimal 3 karakter.");
      return;
    }

    const newCustomPassword = regPassword.trim();
    const activatedUser: UserAccount = {
      ...invitedUserAccount,
      fullName: regFullName.trim(),
      password: newCustomPassword,
      isActive: true,
      invitationStatus: "ACTIVE",
    };

    if (onAcceptInvite) {
      onAcceptInvite({
        email: emailClean,
        fullName: regFullName.trim(),
        password: newCustomPassword,
      });
    }

    setIsRegisterOpen(false);
    setRegEmail("");
    setRegFullName("");
    setRegPassword("");
    setInvitedUserAccount(null);

    // Automatically log in the user immediately to their portal
    onLogin(activatedUser);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const term = emailOrUsername.trim().toLowerCase();
    if (!term) {
      setErrorMsg("Silakan masukkan Email atau Username Anda.");
      return;
    }

    if (!password) {
      setErrorMsg("Silakan masukkan Kata Sandi Anda.");
      return;
    }

    // Find account matching email or username
    const termClean = term.trim().toLowerCase();
    const termUser = termClean.split("@")[0];

    let found = users.find(u => {
      const email = (u.email || "").toLowerCase();
      const username = (u.username || "").toLowerCase();
      const emailUser = email.split("@")[0];
      return (
        email === termClean ||
        username === termClean ||
        username === termUser ||
        emailUser === termUser
      );
    });

    // Fallback search for admin terms
    if (!found && (termClean.includes("iksan") || termClean.includes("admin"))) {
      found = users.find(u => u.role === Role.ADMINISTRATOR || (u.email && u.email.includes("iksan")));
    }

    if (!found) {
      setErrorMsg(`❌ Akses Ditolak: Email/Username "${term}" tidak terdaftar. Hanya Administrator yang berhak mendaftarkan akun pengguna baru.`);
      return;
    }

    // Verify Password
    const expectedPassword = found.password || "sansico123";
    if (password !== expectedPassword) {
      setErrorMsg("Kata Sandi tidak sesuai. Silakan periksa kembali kata sandi akun Anda.");
      return;
    }

    if (found.invitationStatus === "PENDING") {
      setErrorMsg(`⚠️ Akun "${found.fullName}" (${found.email}) belum mengaktifkan undangan email. Silakan klik "Aktivasi & Setujui Undangan Email" di bawah untuk ACC undangan dari Administrator.`);
      return;
    }

    if (!found.isActive) {
      setErrorMsg(`⚠️ Akun "${found.fullName}" belum aktif atau telah dinonaktifkan oleh Administrator.`);
      return;
    }

    onLogin(found);
  };

  return (
    <div className="min-h-screen relative flex flex-col justify-between overflow-x-hidden font-sans selection:bg-red-600 selection:text-white bg-white">
      
      {/* Top Header Bar */}
      <header className="relative z-20 px-6 py-5 max-w-7xl mx-auto w-full flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="bg-red-600 text-white font-black px-3.5 py-2 rounded-2xl text-xs tracking-wider uppercase shadow-sm flex items-center gap-2">
            <Building2 className="w-4 h-4 text-white" />
            <span>SANSICO</span>
          </div>
          <div>
            <h1 className="font-bold text-sm text-slate-900 tracking-tight leading-none">
              PT SANSICO NATURA RESOURCES
            </h1>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
              Sistem Alur Verifikasi & Release Dokumen Kemasan Alat Kesehatan
            </p>
          </div>
        </div>
      </header>

      {/* Main Center Form Workspace */}
      <main className="relative z-20 flex-1 flex items-center justify-center p-4 sm:p-6 my-4">
        <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200/80 relative transition-all duration-300">
          
          {/* Top Red Lock Icon Box */}
          <div className="w-12 h-12 rounded-2xl bg-red-600 text-white shadow-md shadow-red-200 flex items-center justify-center mx-auto mb-4">
            <LockKeyhole className="w-5 h-5 text-white" />
          </div>

          {/* Heading */}
          <div className="text-center space-y-1 mb-6">
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Portal Login Resmi
            </h2>
            <p className="text-xs text-slate-500 font-medium max-w-xs mx-auto leading-relaxed">
              Masuk dengan akun divisi terdaftar Anda untuk verifikasi & approval dokumen kemasan.
            </p>
          </div>

          {/* Success Message */}
          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl leading-relaxed font-medium flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl leading-relaxed font-medium flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Manual Login Form */}
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Email / Username
              </label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                <input
                  type="text"
                  required
                  placeholder="Masukkan Email / Username"
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 font-medium focus:outline-none focus:bg-white focus:border-red-600 focus:ring-2 focus:ring-red-600/20 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Kata Sandi
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 font-medium focus:outline-none focus:bg-white focus:border-red-600 focus:ring-2 focus:ring-red-600/20 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setErrorMsg("Lupa password? Silakan hubungi Administrator untuk mereset kata sandi Anda.")}
                className="text-[11px] font-medium text-slate-500 hover:text-red-600 cursor-pointer transition"
              >
                Lupa kata sandi?
              </button>
            </div>

            <button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-3.5 px-4 rounded-xl shadow-lg shadow-red-600/20 transition duration-200 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
            >
              <span>Masuk Portal</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </button>
          </form>

          {/* Register New Account Trigger */}
          <div className="mt-5 text-center pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-500 mb-2">Menerima link undangan email dari Administrator?</p>
            <button
              type="button"
              onClick={() => {
                setRegError("");
                setIsRegisterOpen(true);
              }}
              className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Mail className="w-3.5 h-3.5 text-red-600" />
              <span>Aktivasi & Setujui Undangan Email (ACC)</span>
            </button>
          </div>

          {/* System Security Note Footer */}
          <div className="mt-4 text-[10px] text-slate-400 text-center font-mono leading-relaxed">
            Sistem terintegrasi PT Sansico Natura Resources. Hanya akun yang didaftarkan Administrator yang dapat mengakses portal.
          </div>

        </div>
      </main>

      {/* Registration / Invitation Activation Modal Overlay */}
      {isRegisterOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-bold">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">Konfirmasi Undangan Email</h3>
                  <p className="text-[10px] text-slate-500">Setujui undangan & buat kata sandi akun Anda</p>
                </div>
              </div>
              <button
                onClick={() => setIsRegisterOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {regError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl font-medium leading-relaxed">
                {regError}
              </div>
            )}

            <form onSubmit={handleAcceptInviteSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Masukkan Alamat Email Terdaftar *</label>
                <input
                  type="email"
                  required
                  placeholder="contoh: budi.produk@sansico.co.id"
                  value={regEmail}
                  onChange={(e) => handleEmailInputChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-red-600 font-medium font-mono"
                />
              </div>

              {invitedUserAccount ? (
                <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-emerald-800 font-bold">✓ Undangan Admin Ditemukan</span>
                    <span className="bg-emerald-600 text-white font-bold px-2 py-0.5 rounded text-[10px] uppercase">
                      {invitedUserAccount.role}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-900 font-medium">
                    Didaftarkan oleh <strong>{invitedUserAccount.invitedBy || "Administrator"}</strong>.
                  </p>
                </div>
              ) : regEmail.trim().includes("@") ? (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-[11px] rounded-xl leading-relaxed">
                  ⚠️ Email ini belum terdaftar dalam daftar undangan Administrator. Silakan minta Administrator untuk mendaftarkan email Anda terlebih dahulu.
                </div>
              ) : null}

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Nama Lengkap Anda *</label>
                <input
                  type="text"
                  required
                  placeholder="contoh: Budi Santoso, S.Farm"
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-red-600 font-medium"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Buat Kata Sandi Akun Anda *</label>
                <div className="relative flex items-center">
                  <input
                    type={showRegPassword ? "text" : "password"}
                    required
                    minLength={3}
                    placeholder="Masukkan kata sandi baru Anda"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-red-600 font-medium font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-3 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                    title={showRegPassword ? "Sembunyikan Kata Sandi" : "Tampilkan Kata Sandi"}
                  >
                    {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Kata sandi ini yang akan Anda gunakan untuk masuk ke portal.</p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRegisterOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold cursor-pointer transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!invitedUserAccount}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md shadow-red-600/20 cursor-pointer transition"
                >
                  Setujui Undangan & Aktifkan Akun (ACC)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="relative z-20 py-4 px-6 text-center text-[11px] text-slate-400 font-mono font-medium">
        &copy; 2026 PT SANSICO NATURA RESOURCES — All Rights Reserved
      </footer>
    </div>
  );
}



