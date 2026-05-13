import { createClient } from '@supabase/supabase-js'

// Replace the text inside the quotes with your actual keys from Supabase
const supabaseUrl = 'https://kobdfoodhacewtepypyt.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvYmRmb29kaGFjZXd0ZXB5cHl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1NDU5NzgsImV4cCI6MjA5NDEyMTk3OH0.Na3BpPfTC3bo8GVM7rXeo11_ksHO6OXi2mar1BhGoWA'

const supabase = createClient(supabaseUrl, supabaseAnonKey)
export default supabase
export { supabase }