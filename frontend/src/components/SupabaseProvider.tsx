"use client";

import { SessionContextProvider } from "@supabase/auth-helpers-react";
import { ReactNode, useEffect, useState } from "react";

interface Props {
  children: ReactNode;
}

export default function SupabaseProvider({ children }: Props) {
  // Using 'unknown' initially; will set to Supabase client at runtime
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [supabaseClient, setSupabaseClient] = useState<any>(null);

  useEffect(() => {
    // Dynamically import on the client to avoid SSR evaluation
    import("@/lib/supabaseClient").then((mod) => {
      const client = mod.supabaseBrowser();
      setSupabaseClient(client);
    });
  }, []);

  if (!supabaseClient) {
    return null; // could render a loading spinner here
  }

  return (
    <SessionContextProvider supabaseClient={supabaseClient}>
      {children}
    </SessionContextProvider>
  );
} 