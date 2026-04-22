"use client";

import { useRouter } from "next/navigation";

export default function AdminLogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/logout", {
      method: "POST",
    });

    router.push("/disponible-bientot");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="rounded-full border border-white/10 bg-[rgba(255,255,255,0.02)] px-4 py-2 text-xs uppercase tracking-[0.24em] text-[var(--text-soft)] transition hover:border-[rgba(191,165,145,0.28)] hover:bg-[rgba(255,255,255,0.05)] hover:text-[var(--text)]"
    >
      Quitter l’accès admin
    </button>
  );
}