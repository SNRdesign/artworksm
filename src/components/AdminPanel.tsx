/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { UserAccount, Role } from "../types";
import { Eye, EyeOff, KeyRound } from "lucide-react";

interface AdminPanelProps {
  currentUser: UserAccount;
  users: UserAccount[];
  onInviteUser: (email: string, fullName: string, role: Role) => void;
  onApproveUser: (userId: string) => void;
  onToggleUserActive: (userId: string) => void;
  onDeleteUser: (userId: string) => void;
  onUpdateUserPassword?: (userId: string, newPassword: string) => void;
}

export default function AdminPanel({
  currentUser,
  users,
  onInviteUser,
  onApproveUser,
  onToggleUserActive,
  onDeleteUser,
  onUpdateUserPassword,
}: AdminPanelProps) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<Role>(Role.DESAIN);
  const [successMsg, setSuccessMsg] = useState("");
  const [lastInviteLink, setLastInviteLink] = useState("");
  const [showPasswords, setShowPasswords] = useState<{ [userId: string]: boolean }>({});

  const toggleShowPassword = (userId: string) => {
    setShowPasswords(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  const handleEditPasswordPrompt = (user: UserAccount) => {
    const currentPass = user.password || "sansico123";
    const newPass = prompt(`Ubah Kata Sandi untuk ${user.fullName} (${user.email}):`, currentPass);
    if (newPass && newPass.trim() && onUpdateUserPassword) {
      onUpdateUserPassword(user.id, newPass.trim());
      alert(`Kata sandi untuk ${user.fullName} berhasil diperbarui!`);
    }
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !fullName.trim()) return;

    onInviteUser(email.trim().toLowerCase(), fullName.trim(), role);

    const generatedLink = `https://sansico-alkes.com/invite/approve?email=${encodeURIComponent(
      email.trim()
    )}&token=${Math.random().toString(36).substring(2, 10)}`;

    setLastInviteLink(generatedLink);
    setSuccessMsg(
      `Undangan Email pendaftaran berhasil dikirimkan ke "${email.trim()}" sebagai ${role}!`
    );

    setEmail("");
    setFullName("");
  };

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    alert("Link Undangan Konfirmasi Email telah disalin!");
  };

  return (
    <div className="space-y-6" id="admin-panel-container">
      {/* Administrator Cross-Division Access Status Banner */}
      <div className="bg-red-50/90 border border-red-200/90 text-red-950 rounded-2xl p-5 flex gap-3.5 items-start">
        <div className="bg-red-600 text-white font-extrabold text-xs px-2.5 py-1 rounded-lg uppercase tracking-wider shrink-0 mt-0.5 shadow-xs">
          ADMIN
        </div>
        <div>
          <h3 className="font-display font-bold text-red-900 text-xs uppercase tracking-wider">
            SISTEM MANAJEMEN UNDANGAN EMAIL & HAK AKSES PENGGUNA (HANYA ADMINISTRATOR)
          </h3>
          <p className="text-[11px] text-red-800/90 leading-relaxed mt-1">
            Sebagai <strong>Administrator</strong>, Anda adalah satu-satunya otoritas yang berhak mendaftarkan pengguna baru di seluruh divisi. Masukkan email dan nama personel, lalu kirimkan undangan. Setelah email disetujui/dikirimkan konfirmasi, pengguna baru dapat masuk ke dalam portal.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Email Invitation Form */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-1 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-display font-bold text-slate-800 text-xs uppercase tracking-wider">
              Kirim Undangan Email Pengguna Baru
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Input email resmi anggota divisi untuk proses konfirmasi pendaftaran
            </p>
          </div>

          {successMsg && (
            <div className="p-3.5 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl text-[11px] leading-relaxed space-y-2">
              <p className="font-bold">{successMsg}</p>
              {lastInviteLink && (
                <div className="bg-white p-2 rounded-lg border border-emerald-200 text-[10px] font-mono break-all text-emerald-700">
                  <span className="text-slate-400 block font-sans font-bold">Simulasi Link Email Undangan:</span>
                  {lastInviteLink}
                  <button
                    type="button"
                    onClick={() => handleCopyLink(lastInviteLink)}
                    className="mt-1 bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-0.5 rounded font-sans font-bold text-[9px] block cursor-pointer"
                  >
                    Salin Link Undangan
                  </button>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleInviteSubmit} className="space-y-4" id="form-invite-user">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wider">
                Email Tujuan Pendaftaran <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                placeholder="contoh: budi.produk@sansico.co.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none placeholder-slate-300 transition duration-150 font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wider">
                Nama Lengkap Pengguna <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="contoh: Budi Santoso, S.Farm"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none placeholder-slate-300 transition duration-150"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wider">
                Divisi / Peran (Role) <span className="text-rose-500">*</span>
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none bg-white text-slate-700 transition duration-150"
              >
                <option value={Role.DESAIN}>Divisi Desain (Inisiasi & Upload Artwork)</option>
                <option value={Role.PRODUK}>Divisi Produk (Verifikasi Konten & ACC)</option>
                <option value={Role.PURCHASING}>Divisi Purchasing (Safety Check & Release Cetak)</option>
                <option value={Role.ADMINISTRATOR}>Administrator (Kelola User & Akses)</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-3 px-4 rounded-xl transition duration-150 shadow-md cursor-pointer"
            >
              Kirim Undangan Email Pendaftaran
            </button>
          </form>
        </div>

        {/* Account Lists & Approvals */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-display font-bold text-slate-800 text-xs uppercase tracking-wider">
                Daftar Pengguna & Status Undangan Email
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Admin dapat menyetujui (approve) konfirmasi email atau mengaktifkan/nonaktifkan akses
              </p>
            </div>
            <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
              Total: {users.length} Akun
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase tracking-widest font-semibold font-display border-b border-slate-100 text-[10px]">
                  <th className="px-4 py-3">User & Email</th>
                  <th className="px-4 py-3">Peran / Divisi</th>
                  <th className="px-4 py-3">Kata Sandi</th>
                  <th className="px-4 py-3 text-center">Status Undangan</th>
                  <th className="px-4 py-3 text-right">Aksi Administrator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => {
                  const isPendingInvite = user.invitationStatus === "PENDING";
                  const isPendingApproval = user.invitationStatus === "PENDING_APPROVAL";
                  const isNeedAcc = isPendingInvite || isPendingApproval || !user.isActive;

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{user.fullName}</div>
                        <div className="text-[11px] font-mono text-slate-400">{user.email || `${user.username}@sansico.co.id`}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                          user.role === Role.ADMINISTRATOR
                            ? "bg-purple-100 text-purple-800 border border-purple-200"
                            : user.role === Role.DESAIN
                            ? "bg-blue-100 text-blue-800 border border-blue-200"
                            : user.role === Role.PRODUK
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 font-mono text-[11px]">
                          <span className="bg-slate-100 text-slate-800 font-bold px-2 py-0.5 rounded border border-slate-200">
                            {showPasswords[user.id] ? (user.password || "sansico123") : "••••••••"}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleShowPassword(user.id)}
                            className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100 transition cursor-pointer"
                            title={showPasswords[user.id] ? "Sembunyikan Kata Sandi" : "Lihat Kata Sandi User"}
                          >
                            {showPasswords[user.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          {onUpdateUserPassword && (
                            <button
                              type="button"
                              onClick={() => handleEditPasswordPrompt(user)}
                              className="text-slate-400 hover:text-indigo-600 p-1 rounded hover:bg-slate-100 transition cursor-pointer"
                              title="Ubah Kata Sandi User"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isPendingInvite ? (
                          <span className="inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Undangan Dikirim (Menunggu Form)
                          </span>
                        ) : isPendingApproval ? (
                          <span className="inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 animate-pulse">
                            ⚡ Formulir Terisi (Menunggu ACC Admin)
                          </span>
                        ) : user.isActive ? (
                          <span className="inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            ✓ Aktif (Disetujui Admin)
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Nonaktif
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end items-center gap-1.5">
                          {isPendingApproval || isPendingInvite ? (
                            <button
                              type="button"
                              onClick={() => onApproveUser(user.id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] py-1.5 px-3 rounded-lg transition shadow-md shadow-emerald-600/20 cursor-pointer flex items-center gap-1"
                            >
                              <span>✓ ACC & Aktifkan</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onToggleUserActive(user.id)}
                              className={`text-[10px] font-bold py-1.5 px-2.5 rounded-lg transition ${
                                user.isActive
                                  ? "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                              }`}
                            >
                              {user.isActive ? "Deaktivasi" : "Aktivasi"}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => onDeleteUser(user.id)}
                            className="bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 font-bold text-[10px] py-1.5 px-2.5 rounded-lg transition cursor-pointer"
                            title="Hapus Akun Pengguna"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
