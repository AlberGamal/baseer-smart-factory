export function Badge({ text, className }: { text: string; className: string }) {
  return <span className={`badge ${className}`}>{text}</span>;
}
