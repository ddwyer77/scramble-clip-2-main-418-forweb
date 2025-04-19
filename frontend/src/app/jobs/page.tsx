"use client";

import { useEffect, useState } from "react";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";
import { Database } from "@/lib/types";

type JobRow = Database["public"]["Tables"]["job_queue"]["Row"];

export default function JobsPage() {
  const supabase = useSupabaseClient<Database>();
  const user = useUser();
  const [jobs, setJobs] = useState<JobRow[]>([]);

  useEffect(() => {
    if (!user) return;

    const fetchJobs = async () => {
      const { data } = await supabase
        .from("job_queue")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });
      if (data) setJobs(data as JobRow[]);
    };

    fetchJobs();

    const channel = supabase
      .channel("job_queue_updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "job_queue",
          filter: `owner_id=eq.${user.id}`,
        },
        (payload) => {
          setJobs((prev) => {
            const incoming = payload.new as JobRow;
            const rest = prev.filter((j) => j.id !== incoming.id);
            return [incoming, ...rest];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, user]);

  if (!user) return <p className="p-6">Please sign in to view jobs.</p>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold mb-4">Your Jobs</h1>
      {jobs.length === 0 ? (
        <p>No jobs yet.</p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b">
              <th className="py-2 text-left">Created</th>
              <th className="py-2 text-left">Status</th>
              <th className="py-2 text-left">Progress</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id} className="border-b">
                <td className="py-2">
                  {new Date(job.created_at).toLocaleString()}
                </td>
                <td className="py-2 capitalize">{job.status}</td>
                <td className="py-2">{job.progress ?? 0}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
} 