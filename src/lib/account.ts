'use client';
import { useEffect, useState } from 'react';
import { hasSupabase, browserClient } from './supabase';
import { demoClient } from './adminDemo';

type Client = ReturnType<typeof browserClient>;
// Customer-side data client: real Supabase in production, in-browser sample data in demo builds.
export const acct = (): Client => (hasSupabase ? browserClient() : (demoClient as unknown as Client));
export type User = { id: string; email: string };

export function useUser() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  useEffect(() => {
    const c = acct();
    c.auth.getUser().then(({ data }) => setUser(data.user ? { id: data.user.id, email: data.user.email ?? '' } : null));
    if (!hasSupabase) return;
    const { data } = c.auth.onAuthStateChange((_e, s) => setUser(s?.user ? { id: s.user.id, email: s.user.email ?? '' } : null));
    return () => data.subscription.unsubscribe();
  }, []);
  return user;
}

export const INDIAN_STATES = ['Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'];
