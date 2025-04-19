"use client";

import { ChangeEvent, useState } from "react";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";
import { v4 as uuidv4 } from "uuid";

export default function UploadPage() {
  const supabase = useSupabaseClient();
  const user = useUser();
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  if (!user) {
    return <p className="p-6">Please sign in to upload videos.</p>;
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setStatus("Uploading...");
    const ext = file.name.split(".").pop();
    const filePath = `${uuidv4()}.${ext}`;
    const { error } = await supabase.storage
      .from("raw-videos")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });
    if (error) {
      setStatus(error.message);
    } else {
      setStatus("Uploaded! Enqueuing job...");
      const { error: insertError } = await supabase.from("job_queue").insert([
        {
          owner_id: user.id,
          params: { path: filePath },
          status: "queued",
        },
      ]);
      if (insertError) {
        setStatus(insertError.message);
      } else {
        setStatus("Job queued!");
      }
      setFile(null);
    }
  };

  return (
    <div className="p-6 flex flex-col gap-4 max-w-md mx-auto">
      <h1 className="text-xl font-semibold">Upload a video</h1>
      <input type="file" accept="video/*" onChange={handleFileChange} />
      <button
        disabled={!file}
        onClick={handleUpload}
        className="bg-green-600 hover:bg-green-700 text-white py-2 rounded disabled:opacity-50"
      >
        Upload & enqueue
      </button>
      {status && <p className="text-sm text-neutral-600 dark:text-neutral-400">{status}</p>}
    </div>
  );
} 