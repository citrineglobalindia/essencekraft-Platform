// Amber dropper bottle with botanical colour band — stands in for product photography until real images are uploaded.
export function Bottle({ color = '#7a5a9e', label, className = 'bottle', title }: { color?: string; label?: string; className?: string; title?: string }) {
  const short = label ? label.replace(/ (Essential|Carrier) Oil$/, '').replace(/\s*\(.*\)/, '') : '';
  return (
    <svg className={className} viewBox="0 0 120 220" role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <defs>
        <linearGradient id="amber" x1="0" x2="1"><stop offset="0" stopColor="#3b1f0e" /><stop offset=".35" stopColor="#7a3f14" /><stop offset=".6" stopColor="#5a2c0e" /><stop offset="1" stopColor="#2a1408" /></linearGradient>
        <linearGradient id="cap" x1="0" x2="1"><stop offset="0" stopColor="#111" /><stop offset=".4" stopColor="#3a3a3a" /><stop offset="1" stopColor="#0b0b0b" /></linearGradient>
      </defs>
      <rect x="34" y="6" width="52" height="44" rx="5" fill="url(#cap)" />
      {Array.from({ length: 8 }).map((_, i) => <rect key={i} x={38 + i * 6} y="10" width="2" height="36" fill="#000" opacity=".35" />)}
      <rect x="40" y="48" width="40" height="12" fill="#1a1a1a" />
      <path d="M22 78c0-12 10-18 20-18h36c10 0 20 6 20 18v122c0 8-6 14-14 14H36c-8 0-14-6-14-14z" fill="url(#amber)" />
      <rect x="30" y="96" width="60" height="92" rx="3" fill="#f6f1e6" />
      <rect x="30" y="96" width="60" height="6" fill={color} />
      <rect x="30" y="182" width="60" height="6" fill={color} opacity=".85" />
      <path d="M60 108c-5 3-7 7-6 11 4-1 6-5 6-11zm0 0c5 3 7 7 6 11-4-1-6-5-6-11z" fill="#3e7b4f" />
      <text x="60" y="130" textAnchor="middle" fontFamily="Georgia, serif" fontSize="7.5" fill="#0f3d2e">EssenceKraft</text>
      {short && <text x="60" y="150" textAnchor="middle" fontFamily="Georgia, serif" fontSize={short.length > 10 ? 8 : 10} fontWeight="600" fill="#1d2a24">{short}</text>}
      <text x="60" y="162" textAnchor="middle" fontFamily="system-ui, sans-serif" fontSize="5.5" fill="#5f6b64">Pure &amp; Natural</text>
      <text x="60" y="175" textAnchor="middle" fontFamily="system-ui, sans-serif" fontSize="5.5" fill="#5f6b64">15 ml</text>
      <path d="M30 78c2-8 8-12 14-12" stroke="#fff" strokeOpacity=".25" strokeWidth="4" fill="none" strokeLinecap="round" />
    </svg>
  );
}

// Simple botanical sprig for concern tiles
export function Sprig({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 120 90" width="100%" height="100%" aria-hidden>
      <path d="M20 85 C50 60, 70 40, 100 8" stroke="#3e7b4f" strokeWidth="2.2" fill="none" />
      {[0, 1, 2, 3, 4, 5].map(i => {
        const t = i / 6; const x = 20 + t * 80; const y = 85 - t * 77;
        return <g key={i}><ellipse cx={x - 8} cy={y - 3} rx="9" ry="4.5" transform={`rotate(-35 ${x - 8} ${y - 3})`} fill={color} opacity={.55 + t * .4} />
          <ellipse cx={x + 6} cy={y + 4} rx="9" ry="4.5" transform={`rotate(-55 ${x + 6} ${y + 4})`} fill="#3e7b4f" opacity={.5 + t * .3} /></g>;
      })}
      <circle cx="100" cy="8" r="6" fill={color} />
    </svg>
  );
}
