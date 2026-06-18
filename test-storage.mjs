import { createClient } from '@supabase/supabase-js';
const url = "https://wypifrsooooeejfckomg.supabase.co";
const key = "sb_publishable_jIwo-BIWgvOKbADDiKalbQ_bR2OqH_K"; // this is a dummy-looking key, let's look at the .env file I read earlier
const supabase = createClient(url, key);
async function test() {
  const { data, error } = await supabase.storage.listBuckets();
  console.log('Buckets:', data);
  console.log('Error:', error);
}
test();