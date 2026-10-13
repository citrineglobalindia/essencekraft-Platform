import 'server-only';
import { sendEmail } from './email';
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
export function setPasswordLink(origin: string, tokenHash: string, type: 'invite' | 'recovery' | 'magiclink') {
  return `${origin}/admin/set-password?token_hash=${encodeURIComponent(tokenHash)}&type=${type}`;
}
export function teamEmail(to: string, name: string, heading: string, body: string, cta: string, href: string) {
  const html = `<!doctype html><html><body style="margin:0;background:#f6f3ee;font-family:Arial,Helvetica,sans-serif;color:#222">
<div style="max-width:520px;margin:0 auto;padding:24px 16px">
 <div style="background:#2f4a3a;color:#fff;border-radius:12px 12px 0 0;padding:18px 22px"><b style="font-size:18px">EssenceKraft</b> <span style="opacity:.75;font-size:12px">ADMIN</span></div>
 <div style="background:#fff;border-radius:0 0 12px 12px;padding:24px">
  <h1 style="font-size:19px;margin:0 0 10px">${esc(heading)}</h1>
  <p style="margin:0 0 18px;color:#444;line-height:1.5">Hi ${esc(name || 'there')},<br>${body}</p>
  <a href="${href}" style="display:inline-block;background:#2f4a3a;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700">${esc(cta)}</a>
  <p style="font-size:12px;color:#888;margin-top:20px">This link works once and expires in 24 hours. If you weren't expecting this email, you can ignore it.</p>
 </div></div></body></html>`;
  return sendEmail([{ email: to, name: name || undefined }], heading, html);
}
