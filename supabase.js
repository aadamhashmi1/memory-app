import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// 🛑 PASTE YOUR SECRETS HERE:
const supabaseUrl = 'https://ecopftxlcuesayrzoydl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjb3BmdHhsY3Vlc2F5cnpveWRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMjIwMjYsImV4cCI6MjA4Nzc5ODAyNn0.l1PWA0__-gten7E5XGV5KUzia4ryswlLKxEySXSjh70';

// This creates the "bridge" to your database
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});