"use client";

import { FormEvent, useState } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";

export default function Login() {
  const supabase = useSupabaseClient();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ email });
    setLoading(false);
    if (error) {
      setMsg(error.message);
    } else {
      setMsg("Check your email for the magic link!");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-sm">
        <input
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border border-neutral-300 dark:border-neutral-700 px-3 py-2 rounded"
        />
        <button
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 rounded disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send magic link"}
        </button>
      </form>
      {msg && <p className="text-sm text-neutral-600 dark:text-neutral-400">{msg}</p>}
    </div>
  );
} 