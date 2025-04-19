"use client";

import { SessionContextProvider } from "@supabase/auth-helpers-react";
import { ReactNode, useEffect, useState } from "react";

interface Props {
  children: ReactNode;
}

export default function SupabaseProvider({ children }: Props) {
  // Will hold Supabase client when running in the browser
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [supabaseClient, setSupabaseClient] = useState<any>(null);

  useEffect(() => {
    // Dynamically import to ensure the code runs only in the browser
    import("../lib/supabaseClient").then((mod) => {
      const client = mod.supabaseBrowser();
      setSupabaseClient(client);
    });
  }, []);

  if (!supabaseClient) {
    return null; // could render a spinner here
  }

  return (
    <SessionContextProvider supabaseClient={supabaseClient}>
      {children}
    </SessionContextProvider>
  );
} 