import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mvtodtakdvgepztiyjzz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12dG9kdGFrZHZnZXB6dGl5anp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNjQwNjMsImV4cCI6MjA5NDg0MDA2M30.aVeNQ95WxstJzUKbdSsc7jP-ElhxaPSmD_mw6jvlR1w';

export const supabase = createClient(supabaseUrl, supabaseKey);
