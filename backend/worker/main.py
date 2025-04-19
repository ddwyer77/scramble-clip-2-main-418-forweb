import os, time, json, tempfile, subprocess
from pathlib import Path
from supabase import create_client, Client

from processor import generator

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

RAW_BUCKET = "raw-videos"
OUTPUT_BUCKET = "output-videos"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

POLL_INTERVAL = int(os.getenv("POLL_INTERVAL", "10"))  # seconds


def download_file(bucket: str, path: str, dest: Path):
    data = supabase.storage.from_(bucket).download(path)
    dest.write_bytes(data)


def upload_file(bucket: str, path: str, local_path: Path):
    supabase.storage.from_(bucket).upload(path, local_path.read_bytes(), upsert=True)


def process_job(job):
    job_id = job["id"]
    params = job["params"] or {}
    raw_path = params.get("path")
    if not raw_path:
        supabase.table("job_queue").update({"status": "error"}).eq("id", job_id).execute()
        return

    # update status processing
    supabase.table("job_queue").update({"status": "processing", "progress": 0}).eq("id", job_id).execute()

    with tempfile.TemporaryDirectory() as tmpdir:
        tmpdir = Path(tmpdir)
        raw_file = tmpdir / "input.mp4"
        download_file(RAW_BUCKET, raw_path, raw_file)
        output_dir = tmpdir / "out"
        output_dir.mkdir()

        try:
            generator.generate_batch(
                [str(raw_file)],
                num_videos=1,
                output_dir=str(output_dir),
                progress_callback=lambda pct, msg: supabase.table("job_queue")
                .update({"progress": pct})
                .eq("id", job_id)
                .execute(),
            )
        except Exception as e:
            supabase.table("job_queue").update({"status": "error"}).eq("id", job_id).execute()
            return

        # upload result
        out_file = next(output_dir.glob("*.mp4"))
        output_path = f"{job_id}/{out_file.name}"
        upload_file(OUTPUT_BUCKET, output_path, out_file)

        supabase.table("job_queue").update(
            {
                "status": "finished",
                "output_urls": json.dumps([output_path]),
                "progress": 100,
            }
        ).eq("id", job_id).execute()


def main():
    while True:
        # fetch queued jobs
        res = supabase.table("job_queue").select("*").eq("status", "queued").limit(1).execute()
        jobs = res.data or []
        if jobs:
            process_job(jobs[0])
        else:
            time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main() 