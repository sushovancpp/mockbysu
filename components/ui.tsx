"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export function Screen({
  children,
  pad = true,
  /** Two-column pages open up on a laptop; reading pages stay a single column. */
  wide = false,
}: {
  children: ReactNode;
  pad?: boolean;
  wide?: boolean;
}) {
  return (
    <main
      className={`mx-auto min-h-dvh w-full max-w-[34rem] ${
        wide ? "lg:max-w-[62rem]" : "lg:max-w-[40rem]"
      } ${pad ? "px-5 pb-40 lg:px-8 lg:pb-20" : ""}`}
      style={{ paddingTop: "max(1.25rem, env(safe-area-inset-top))" }}
    >
      {children}
    </main>
  );
}

export function TopBar({
  title,
  step,
  back,
  right,
}: {
  title: string;
  step?: string;
  back?: string;
  right?: ReactNode;
}) {
  const router = useRouter();
  return (
    <header className="flex items-center justify-between gap-3 py-3">
      <div className="flex min-w-0 items-center gap-3">
        {back !== undefined && (
          <button
            type="button"
            aria-label="Go back"
            onClick={() => (back ? router.push(back) : router.back())}
            className="-ml-2 flex size-10 shrink-0 items-center justify-center rounded-full text-ink/70 transition-colors hover:bg-line/60 active:bg-line/60"
          >
            <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
              <path
                d="M15 5l-7 7 7 7"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-[0.95rem] font-medium tracking-tight">
            {title}
          </h1>
          {step && <p className="text-xs text-muted">{step}</p>}
        </div>
      </div>
      {right}
    </header>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  full?: boolean;
};

export function Button({
  variant = "primary",
  full,
  className = "",
  ...props
}: ButtonProps) {
  const base =
    "inline-flex min-h-[3.25rem] items-center justify-center gap-2 rounded-2xl px-5 text-[0.95rem] font-medium tracking-tight transition-[transform,opacity] hover:opacity-90 active:scale-[0.985] disabled:pointer-events-none disabled:opacity-35";
  const styles = {
    primary: "bg-ink text-paper",
    secondary: "border border-line bg-raised text-ink",
    ghost: "text-muted",
    danger: "border border-bad/40 text-bad",
  }[variant];
  return (
    <button
      {...props}
      className={`${base} ${styles} ${full ? "w-full" : ""} ${className}`}
    />
  );
}

export function LinkButton({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
}) {
  const styles =
    variant === "primary"
      ? "bg-ink text-paper"
      : "border border-line bg-raised text-ink";
  return (
    <Link
      href={href}
      className={`inline-flex min-h-[3.25rem] w-full items-center justify-center rounded-2xl px-5 text-[0.95rem] font-medium tracking-tight transition-opacity hover:opacity-90 active:scale-[0.985] ${styles}`}
    >
      {children}
    </Link>
  );
}

/**
 * On a phone the primary action is pinned under the thumb. On a laptop that
 * floating bar reads as a mobile app in a browser window, so it drops back
 * into the flow at the end of the page.
 */
export function ActionBar({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-paper/90 backdrop-blur-xl lg:static lg:mt-12 lg:border-0 lg:bg-transparent lg:backdrop-blur-none">
      <div
        className="mx-auto w-full max-w-[34rem] px-5 pt-3 lg:mx-0 lg:max-w-[22rem] lg:px-0"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        {children}
      </div>
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-3xl border border-line bg-raised p-5 ${className}`}
    >
      {children}
    </div>
  );
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between border-b border-line py-3 last:border-0">
      <span className="text-[0.9rem] text-muted">{label}</span>
      <span className="tnum text-[0.95rem] font-medium">{value}</span>
    </div>
  );
}
