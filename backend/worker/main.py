import os, time, json, tempfile, subprocess
from pathlib import Path
from supabase import create_client, Client
import sys

# Add the project's src directory to the Python path so we can import generator.py
src_dir = Path(__file__).resolve().parents[2] / "src"
sys.path.insert(0, str(src_dir))
import generator

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
    params = job.get("params") or {}

    # Accept new "paths" (list) param, fall back to legacy "path"
    raw_paths = params.get("paths")
    if not raw_paths:
        legacy_path = params.get("path")
        if not legacy_path:
            supabase.table("job_queue").update({"status": "error"}).eq("id", job_id).execute()
            return
        raw_paths = [legacy_path]

    # update status processing
    supabase.table("job_queue").update({"status": "processing", "progress": 0}).eq("id", job_id).execute()

    with tempfile.TemporaryDirectory() as tmpdir:
        tmpdir = Path(tmpdir)

        # Download all raw clips referenced in the job params
        local_inputs = []
        for p in raw_paths:
            local_path = tmpdir / Path(p).name
            download_file(RAW_BUCKET, p, local_path)
            local_inputs.append(str(local_path))

        output_dir = tmpdir / "out"
        output_dir.mkdir()

        try:
            generator.generate_batch(
                local_inputs,
                num_videos=int(params.get("num_videos", 1)),
                output_dir=str(output_dir),
                progress_callback=lambda pct, _msg: supabase.table("job_queue")
                .update({"progress": pct})
                .eq("id", job_id)
                .execute(),
            )
        except Exception:
            supabase.table("job_queue").update({"status": "error"}).eq("id", job_id).execute()
            return

        # upload all generated videos and collect their storage paths
        output_paths = []
        for out_file in output_dir.glob("*.mp4"):
            storage_path = f"{job_id}/{out_file.name}"
            upload_file(OUTPUT_BUCKET, storage_path, out_file)
            output_paths.append(storage_path)

        supabase.table("job_queue").update(
            {
                "status": "finished",
                "output_urls": json.dumps(output_paths),
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