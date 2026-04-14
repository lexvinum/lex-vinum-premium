"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type CartProduct = {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  currency: string;
  image: string | null;
};

type CartItem = CartProduct & {
  quantity: number;
};

export default function AddToCartButton({ product }: { product: CartProduct }) {
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);

  function handleAdd() {
    setIsAdding(true);

    const raw = localStorage.getItem("lexvinum_cart");
    const cart: CartItem[] = raw ? JSON.parse(raw) : [];

    const existing = cart.find((item) => item.id === product.id);

    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({ ...product, quantity: 1 });
    }

    localStorage.setItem("lexvinum_cart", JSON.stringify(cart));

    // petit délai pour feedback visuel premium
    setTimeout(() => {
      router.push("/panier");
    }, 400);
  }

  return (
    <button
      type="button"
      onClick={handleAdd}
      disabled={isAdding}
      className={`
        group relative inline-flex items-center justify-center gap-2
        rounded-full px-7 py-3 text-sm font-medium tracking-[0.04em]
        transition-all duration-300
        
        border border-[#6f8f7a]
        bg-[linear-gradient(135deg,rgba(111,143,122,0.14),rgba(255,255,255,0.05))]
        text-[#1f2d24]

        hover:bg-[linear-gradient(135deg,rgba(111,143,122,0.22),rgba(255,255,255,0.08))]
        hover:border-[#5e7d69]

        disabled:opacity-70 disabled:cursor-not-allowed
      `}
    >
      {/* glow subtil premium */}
      <span className="pointer-events-none absolute inset-0 rounded-full opacity-0 transition duration-500 group-hover:opacity-100 bg-[radial-gradient(circle_at_center,rgba(111,143,122,0.25),transparent_70%)]" />

      {/* texte dynamique */}
      <span className="relative">
        {isAdding ? "Ajout en cours…" : "Ajouter au panier"}
      </span>

      {/* flèche premium */}
      <span
        className={`
          relative transition-transform duration-300
          ${isAdding ? "translate-x-0" : "group-hover:translate-x-1"}
        `}
      >
        →
      </span>
    </button>
  );
}