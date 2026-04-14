"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";

type CartItem = {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  currency: string;
  image: string | null;
  quantity: number;
};

function formatPrice(cents: number, currency = "CAD") {
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem("lexvinum_cart");
    setItems(raw ? JSON.parse(raw) : []);
  }, []);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0),
    [items]
  );

  function updateQuantity(id: string, quantity: number) {
    const next = items
      .map((item) => (item.id === id ? { ...item, quantity } : item))
      .filter((item) => item.quantity > 0);

    setItems(next);
    localStorage.setItem("lexvinum_cart", JSON.stringify(next));
  }

  return (
    <main className="min-h-screen bg-[#140f0c] text-[#f6efe8]">
      <div className="mx-auto max-w-6xl px-6 py-14 md:px-10">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-4xl font-semibold text-[#fff8f1]">Panier</h1>

          <Link
            href="/boutique"
            className="rounded-full border border-white/10 px-4 py-2 text-sm text-[#d7c2b5] transition hover:border-[#8b6a47]/70 hover:text-[#f0dcc0]"
          >
            Continuer mes achats
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="mt-8 rounded-[24px] border border-dashed border-white/10 bg-white/5 p-10 text-[#d7c2b5]">
            Votre panier est vide.
          </div>
        ) : (
          <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px]">
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 rounded-[24px] border border-white/10 bg-white/5 p-4"
                >
                  <div className="relative h-28 w-28 overflow-hidden rounded-[18px] bg-[#201611]">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className="object-cover"
                      />
                    ) : null}
                  </div>

                  <div className="flex-1">
                    <h2 className="text-lg font-medium text-[#fff8f1]">
                      {item.name}
                    </h2>

                    <p className="mt-2 text-[#d7c2b5]">
                      {formatPrice(item.priceCents, item.currency.toUpperCase())}
                    </p>

                    <div className="mt-4 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="rounded-full border border-white/10 px-3 py-1"
                      >
                        -
                      </button>

                      <span>{item.quantity}</span>

                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="rounded-full border border-white/10 px-3 py-1"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="h-fit rounded-[24px] border border-white/10 bg-white/5 p-6">
              <p className="text-sm uppercase tracking-[0.2em] text-[#c6a77d]">
                Résumé
              </p>

              <div className="mt-6 flex justify-between">
                <span>Sous-total</span>
                <span>{formatPrice(subtotal, "CAD")}</span>
              </div>

              <button
                type="button"
                className="mt-8 block w-full rounded-full border border-[#8b6a47] px-5 py-3 text-center text-sm text-[#f0dcc0] transition hover:bg-[rgba(198,167,125,0.1)]"
              >
                Paiement bientôt disponible
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}