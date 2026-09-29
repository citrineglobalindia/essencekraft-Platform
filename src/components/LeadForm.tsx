'use client';
import { useState } from 'react';
import { hasSupabase, browserClient } from '@/lib/supabase';
import { getAttribution, track } from '@/lib/attribution';

// LEAD-001/002: every lead stores source, landing page, first/last touch and explicit consent.
export async function submitLead(lead: { source: string; name?: string; email?: string; phone?: string; interest?: string; variant_id?: string; consent: boolean }) {
  const payload = { ...lead, landing_page: typeof window !== 'undefined' ? window.location.pathname : null, ...getAttribution() };
  track('generate_lead', { lead_source: lead.source });
  if (!hasSupabase) { console.info('[demo] lead', payload); return; }
  const { error } = await browserClient().from('leads').insert(payload);
  if (error) throw error;
}

export function LeadForm() {
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const [consent, setConsent] = useState(false);
  return (
    <section className="lead" aria-labelledby="lead-h">
      <div><h2 id="lead-h">Get 10% off your first order</h2><p style={{ marginTop: 8 }}>Monthly guides on safe dilution and blending, plus early access to new oils. No spam.</p></div>
      {state === 'done' ? <p className="notice ok">You’re in. Use code <b>WELCOME10</b> at checkout.</p> : (
        <form onSubmit={async e => {
          e.preventDefault(); const f = new FormData(e.currentTarget);
          setState('busy');
          try { await submitLead({ source: 'newsletter', email: String(f.get('email')), consent }); setState('done'); } catch { setState('error'); }
        }}>
          <label className="sr" htmlFor="lead-email">Email</label>
          <input id="lead-email" name="email" type="email" required className="input" placeholder="Your email address" autoComplete="email" />
          <button className="btn btn-primary" disabled={state === 'busy' || !consent}>{state === 'busy' ? 'Subscribing…' : 'Subscribe'}</button>
          <label className="check"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /> I agree to receive marketing emails from EssenceKraft. Unsubscribe anytime.</label>
          {state === 'error' && <p className="err">Couldn’t subscribe right now. Check your email and try again.</p>}
        </form>)}
    </section>
  );
}
