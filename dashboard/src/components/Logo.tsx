export function Logo({ size = 40, withText = true }: { size?: number; withText?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <svg width={size} height={size} viewBox="0 0 64 64" className="shrink-0">
        <rect width="64" height="64" rx="16" fill="#1B3A5B" />
        <ellipse cx="32" cy="32" rx="22" ry="14" fill="none" stroke="#C9A24B" strokeWidth="3" />
        <circle cx="32" cy="32" r="7" fill="#C9A24B" />
        <path d="M14 32 H50 M32 18 V46" stroke="#C9A24B" strokeWidth="1.4" opacity="0.5" />
      </svg>
      {withText && (
        <div className="leading-tight">
          <div className="font-display text-2xl font-extrabold text-indigo-700 dark:text-gold-light">بصير</div>
          <div className="text-[10px] tracking-widest text-gold-dark dark:text-gold">BASEER</div>
        </div>
      )}
    </div>
  );
}
