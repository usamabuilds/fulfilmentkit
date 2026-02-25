"use client";

import * as React from "react";

type ToastVariant = "success" | "error";

type ToastItem = {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
};

type ToastPayload = Omit<ToastItem, "id"> & {
  durationMs?: number;
};

const TOAST_EVENT = "fk:toast";

export function fkToast(payload: ToastPayload) {
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: payload }));
}

export function FkToaster() {
  const [items, setItems] = React.useState<ToastItem[]>([]);

  React.useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<ToastPayload>;
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      const item: ToastItem = {
        id,
        title: ce.detail.title,
        description: ce.detail.description,
        variant: ce.detail.variant,
      };

      setItems((prev) => [...prev, item]);

      const duration = ce.detail.durationMs ?? 2600;
      window.setTimeout(() => {
        setItems((prev) => prev.filter((x) => x.id !== id));
      }, duration);
    };

    window.addEventListener(TOAST_EVENT, handler as EventListener);
    return () =>
      window.removeEventListener(TOAST_EVENT, handler as EventListener);
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="fixed right-4 top-4 z-[9999] flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          className={[
            "fk-glass-card rounded-2xl px-4 py-3",
            "border",
            t.variant === "success" ? "border-white/25" : "border-white/25",
          ].join(" ")}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-white/95">
                {t.title}
              </div>
              {t.description ? (
                <div className="mt-1 text-xs text-white/70">{t.description}</div>
              ) : null}
            </div>

            <div
              className={[
                "mt-0.5 h-2.5 w-2.5 rounded-full",
                t.variant === "success" ? "bg-emerald-400" : "bg-rose-400",
              ].join(" ")}
              aria-hidden="true"
            />
          </div>
        </div>
      ))}
    </div>
  );
}