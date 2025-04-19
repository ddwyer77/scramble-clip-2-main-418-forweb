"use client";

import { SessionContextProvider } from "@supabase/auth-helpers-react";
import { ReactNode, useState, useEffect } from "react";

let supabaseBrowser: typeof import("@/lib/supabaseClient").supabaseBrowser;
if (typeof window !== "undefined") {
  // Dynamically import to ensure it's only evaluated in browser
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  import("@/lib/supabaseClient").then((mod) => {
    supabaseBrowser = mod.supabaseBrowser;
  });
}

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