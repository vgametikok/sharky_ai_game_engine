// Публичная конфигурация (anon key — публичный по дизайну Supabase; секретов тут нет).
export const SUPABASE_URL = 'https://safjqsofdrxdmvnfgvjf.supabase.co';
export const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhZmpxc29mZHJ4ZG12bmZndmpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4Nzk2NDgsImV4cCI6MjA5NjQ1NTY0OH0.gcZ452loXUS0fmApZLr7PqvIYYZ8TqxIX2plgLNnoDo';
export const FN = (name) => `${SUPABASE_URL}/functions/v1/${name}`;
export const PROVIDERS = [
  { id: 'claude', name: 'Claude (Anthropic)', model: 'claude-sonnet-5' },
  { id: 'grok',   name: 'Grok (xAI)',         model: 'grok-4' },
  { id: 'gemini', name: 'Gemini (Google)',    model: 'gemini-2.5-pro' },
];
