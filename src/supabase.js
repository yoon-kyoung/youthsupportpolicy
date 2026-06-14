import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  "https://webehelfxizwigijkmzw.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlYmVoZWxmeGl6d2lnaWprbXp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzODIzNTksImV4cCI6MjA5Njk1ODM1OX0.WrQ1n_s5RAyOjZFD2mh0Ouu-zANBeA3kEG8KGUxWqF4"
);
