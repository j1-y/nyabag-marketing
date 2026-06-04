import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const envPath = path.join(process.cwd(), ".env.local");

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const raw = trimmed.slice(separator + 1).trim();
    const value = raw.replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

function mask(value) {
  if (!value) return "missing";
  if (value.length <= 10) return "configured";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

async function checkGitHub() {
  const token = process.env.GITHUB_PROCESSOR_TOKEN;
  const owner = process.env.GITHUB_REPO_OWNER;
  const repo = process.env.GITHUB_REPO_NAME;
  const workflowFile = process.env.GITHUB_PROCESSOR_WORKFLOW_FILE || "process-bookmarks.yml";
  const ref = process.env.GITHUB_PROCESSOR_REF || "main";
  const missing = [
    ["GITHUB_PROCESSOR_TOKEN", token],
    ["GITHUB_REPO_OWNER", owner],
    ["GITHUB_REPO_NAME", repo],
  ].filter(([, value]) => !value);

  console.log("\nGitHub dispatch config");
  console.log(`- owner/repo: ${owner || "missing"}/${repo || "missing"}`);
  console.log(`- workflow file: ${workflowFile}`);
  console.log(`- ref: ${ref}`);
  console.log(`- token: ${mask(token)}`);

  if (missing.length > 0) {
    console.log(`- status: missing ${missing.map(([name]) => name).join(", ")}`);
    return;
  }

  const endpoint = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions/workflows/${encodeURIComponent(workflowFile)}`;
  const response = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.log(`- status: GitHub workflow lookup failed (${response.status}) ${body.slice(0, 180)}`);
    return;
  }

  const workflow = await response.json();
  console.log(`- status: workflow found (${workflow.state || "unknown state"})`);
}

async function checkSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log("\nSupabase processor state");
  console.log(`- url: ${supabaseUrl || "missing"}`);
  console.log(`- service role key: ${mask(serviceRoleKey)}`);

  if (!supabaseUrl || !serviceRoleKey) {
    console.log("- status: missing Supabase URL or service role key");
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: jobs, error: jobsError } = await supabase
    .from("bookmark_processing_jobs")
    .select("id,status,attempts,max_attempts,error_message,run_after,created_at,url")
    .order("created_at", { ascending: false })
    .limit(5);

  if (jobsError) {
    console.log(`- jobs: failed to read (${jobsError.message})`);
  } else {
    const queued = (jobs ?? []).filter((job) => job.status === "queued").length;
    console.log(`- recent jobs: ${(jobs ?? []).length}, queued in recent jobs: ${queued}`);
    for (const job of jobs ?? []) {
      console.log(`  - ${job.status} attempts=${job.attempts}/${job.max_attempts} run_after=${job.run_after} url=${job.url}`);
      if (job.error_message) console.log(`    error=${job.error_message}`);
    }
  }

  const { data: bucket, error: bucketError } = await supabase.storage.getBucket("bookmark-screenshots");
  if (bucketError) {
    console.log(`- storage bucket: failed to read (${bucketError.message})`);
  } else {
    console.log(`- storage bucket: found public=${bucket.public}`);
  }
}

loadDotEnv(envPath);
await checkGitHub();
await checkSupabase();
