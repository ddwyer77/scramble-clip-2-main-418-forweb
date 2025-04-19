"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSessionContext, useSupabaseClient } from "@supabase/auth-helpers-react";

export default function Header() {
  const router = useRouter();
  const { session } = useSessionContext();
  const supabase = useSupabaseClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.refresh();
  };

  return (
    <header className="w-full border-b border-neutral-200 dark:border-neutral-800 py-4 px-6 flex items-center justify-between">
      <Link href="/" className="font-semibold text-lg">
        ScrambleClip
      </Link>
      {session ? (
        <button
          className="text-sm bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
          onClick={handleSignOut}
        >
          Sign out
        </button>
      ) : (
        <Link
          href="/login"
          className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
        >
          Sign in
        </Link>
      )}
    </header>
  );
} 