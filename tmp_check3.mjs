import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const env = fs.readFileSync('.env.local','utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1]?.trim();
const anon = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/)?.[1]?.trim();
// Simulate what getAdminAnalytics does with anon client but no auth
const anonSb = createClient(url, anon);
let r = await anonSb.from('bips').select('id',{count:'exact', head:true}).eq('is_seed', false);
console.log('anon count', r.count, 'err', r.error?.message);
let r2 = await anonSb.auth.getClaims().catch(e=>e);
console.log('anon getClaims', JSON.stringify(r2).slice(0,500));
// With password login as admin
let login = await anonSb.auth.signInWithPassword({email:'e2e-admin@biphub.test', password:'Admin!Test1'});
console.log('login err', login.error?.message, 'role', login.data?.user?.app_metadata?.role);
if (!login.error) {
  let r3 = await anonSb.from('bips').select('id',{count:'exact', head:true}).eq('is_seed', false);
  console.log('admin-auth count', r3.count, r3.error?.message);
  let r4 = await anonSb.from('bip_status_history').select('id',{count:'exact', head:true}).eq('action_kind','submit');
  console.log('admin bsh count', r4.count, r4.error?.message);
}
