export function Mark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      aria-hidden="true"
      fill="none"
    >
      <rect width="48" height="48" rx="14" fill="#C45C26" />
      <path
        d="M14 34V16c0-1.2.8-2.2 2-2.5l7-1.7c.3-.1.6 0 .8.2.2.2.3.5.3.8v21.2"
        stroke="#FFFDF8"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M24.9 34V12.8c0-.3.1-.6.3-.8.2-.2.5-.3.8-.2l7 1.7c1.2.3 2 1.3 2 2.5v17.9"
        stroke="#FFFDF8"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path d="M12 34h24" stroke="#FFFDF8" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
