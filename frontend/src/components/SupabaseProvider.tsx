"use client";

import { SessionContextProvider } from "@supabase/auth-helpers-react";
import { ReactNode, useState, useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";

interface Props {
  children: ReactNode;
}

export default function SupabaseProvider({ children }: Props) {
  const [supabaseClient, setSupabaseClient] = useState<ReturnType<typeof supabaseBrowser> | null>(null);

  // Lazy initialise on client only
  useEffect(() => {
    setSupabaseClient(supabaseBrowser());
  }, []);

  if (!supabaseClient) {
    return null; // or a loading indicator
  }

  return (
    <SessionContextProvider supabaseClient={supabaseClient}>
      {children}
    </SessionContextProvider>
  );
} 