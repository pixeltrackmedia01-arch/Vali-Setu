/** Product wordmark. Deliberately not styled like a government emblem or seal. */
export function Wordmark({ size = "md" }: { size?: "md" | "lg" }) {
  const box = size === "lg" ? "h-11 w-11" : "h-9 w-9";
  return (
    <span className="flex items-center gap-2.5">
      <svg className={box} viewBox="0 0 32 32" aria-hidden>
        <rect width="32" height="32" rx="7" fill="#1B3259" />
        <path d="M6 21c4-7 16-7 20 0" stroke="#5EC4B6" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M9 21v-4M16 21v-6M23 21v-4" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span className="leading-tight">
        <span className={size === "lg" ? "block text-xl font-semibold text-navy-800" : "block text-base font-semibold text-navy-800"}>Vali Setu</span>
        <span className="block text-xs text-ink-muted" lang="gu">
          વાલી સેતુ
        </span>
      </span>
    </span>
  );
}
