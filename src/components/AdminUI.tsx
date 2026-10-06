'use client';
import type { ReactNode } from 'react';
export function PageHead({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) {
  return <div className="adm-ph"><div><h2>{title}</h2>{sub && <p>{sub}</p>}</div>{children && <div className="adm-ph-a">{children}</div>}</div>;
}
export function Stats({ items }: { items: [string, string | number, string?][] }) {
  return <div className="adm-stats">{items.map(([l, v, tone]) => <div key={l} className={tone ?? ''}><span>{l}</span><b>{v}</b></div>)}</div>;
}
export function Saved({ msg }: { msg: { t: 'ok' | 'error'; m: string } | null }) { return msg ? <p className={`notice ${msg.t}`} role="status">{msg.m}</p> : null; }
