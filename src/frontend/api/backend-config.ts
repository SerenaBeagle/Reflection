const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const BACKEND_TARGET = process.env.NEXT_PUBLIC_BACKEND_TARGET || 'next';

export function useEdgeFunctions() {
  return BACKEND_TARGET === 'edge';
}

export function getEdgeFunctionUrl(name: 'chat' | 'profile-portrait') {
  return `${SUPABASE_URL}/functions/v1/${name}`;
}

export function getEdgeFunctionHeaders() {
  return {
    'Content-Type': 'application/json',
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  };
}
