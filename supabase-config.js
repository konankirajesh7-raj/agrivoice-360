// Supabase Configuration
// Replace these with your actual Supabase project URL and anon key
// Get them from: https://supabase.com/dashboard → your project → Settings → API

const SUPABASE_URL = 'https://gwetaesjkkrtmhnxuekc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3ZXRhZXNqa2tydG1obnh1ZWtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMDgyMDUsImV4cCI6MjA4OTY4NDIwNX0.hFNMO_V_E3Ua2nf33ZijgFx_1J6jrO-GANm5XjqBhmY';

// Admin credentials (change these!)
const ADMIN_EMAIL = 'admin@agri360.in';
const ADMIN_PASSWORD = 'Admin@12345';

// Initialize Supabase client
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
