// ================================================================
// FACEBOOK -> PAULOSPOETRY.COM POEM IMPORTER
// ================================================================
// Reads posts from Paulos' Facebook profile, decides which ones are
// poems, detects Greek vs English, extracts a title, and adds them to
// the site (where admins can edit/delete them like any other poem).
//
// SAFE BY DEFAULT: without --apply it only prints what it WOULD do.
//
// Usage:
//   node import-poems.cjs                          # dry run, Graph API
//   node import-poems.cjs --apply                  # actually import
//   node import-poems.cjs --source export --file your_posts_1.json
//                                                  # use a "Download Your
//                                                  #  Information" export
//
// Config: copy .env.example to .env in this folder. See README.md for
// the Meta app / access token setup.
// ================================================================

const fs = require("fs");
const path = require("path");
const {
  classifyPoem,
  detectLanguage,
  extractTitle,
  textToHtml,
  htmlToComparable,
  textToComparable,
} = require("./classify.cjs");

const PLACEHOLDER = "This work has no translation yet...";
const GRAPH_VERSION = "v21.0";

// ---------------- env & args ----------------

function loadEnv() {
  const envPath = path.join(__dirname, ".env");
  const env = {};
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m && m[2]) env[m[1]] = m[2];
    }
  }
  return env;
}

const env = loadEnv();
const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const sourceIdx = args.indexOf("--source");
const SOURCE = sourceIdx >= 0 ? args[sourceIdx + 1] : "graph";
const fileIdx = args.indexOf("--file");
const EXPORT_FILE = fileIdx >= 0 ? args[fileIdx + 1] : null;

const SUPABASE_URL = env.SUPABASE_URL || "https://ckswdngjzspleinmgwth.supabase.co";
const SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY || "";
const FB_ACCESS_TOKEN = env.FB_ACCESS_TOKEN || "";
const ADMIN_EMAIL = env.ADMIN_EMAIL || "";
const ADMIN_PASSWORD = env.ADMIN_PASSWORD || "";

// ---------------- fetch helpers ----------------

async function getJson(url, options) {
  const res = await fetch(url, options);
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = body && body.error ? JSON.stringify(body.error) : `HTTP ${res.status}`;
    throw new Error(`${msg} — ${url.split("?")[0]}`);
  }
  return body;
}

// ---------------- post sources ----------------

async function fetchFromGraph() {
  if (!FB_ACCESS_TOKEN) {
    throw new Error("FB_ACCESS_TOKEN missing in facebook-import/.env — see README.md");
  }
  const posts = [];
  let url =
    `https://graph.facebook.com/${GRAPH_VERSION}/me/posts` +
    `?fields=message,created_time,permalink_url&limit=100&access_token=${encodeURIComponent(FB_ACCESS_TOKEN)}`;
  let pages = 0;
  while (url && pages < 50) {
    const body = await getJson(url);
    for (const p of body.data || []) {
      if (p.message) posts.push({ message: p.message, createdTime: p.created_time, link: p.permalink_url });
    }
    url = body.paging && body.paging.next;
    pages++;
  }
  return posts;
}

function readFromExport(filePath) {
  // Facebook "Download Your Information" JSON: usually an array of
  // { timestamp, data: [{ post: "text" }], title } items (your_posts_1.json).
  const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const items = Array.isArray(raw)
    ? raw
    : raw.status_updates || raw.posts || Object.values(raw).find(Array.isArray) || [];
  const posts = [];
  for (const item of items) {
    const text = (item.data || []).map((d) => d.post).filter(Boolean).join("\n");
    if (text) {
      posts.push({
        message: decodeFbExportText(text),
        createdTime: item.timestamp ? new Date(item.timestamp * 1000).toISOString() : null,
        link: null,
      });
    }
  }
  return posts;
}

// Facebook exports encode UTF-8 as latin-1 escape sequences; fix Greek text.
function decodeFbExportText(s) {
  try {
    return Buffer.from(s, "latin1").toString("utf8");
  } catch {
    return s;
  }
}

// ---------------- supabase ----------------

async function fetchExistingPoems() {
  const headers = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` };
  return getJson(
    `${SUPABASE_URL}/rest/v1/poems?select=title,content_english,content_greek`,
    { headers }
  );
}

async function adminLogin() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error("--apply needs ADMIN_EMAIL and ADMIN_PASSWORD in facebook-import/.env (an admin account on the site)");
  }
  const body = await getJson(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  return body.access_token;
}

async function insertPoem(accessToken, poem) {
  return getJson(`${SUPABASE_URL}/rest/v1/poems`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(poem),
  });
}

// ---------------- main ----------------

(async () => {
  if (!SUPABASE_ANON_KEY) {
    console.error("SUPABASE_ANON_KEY missing in facebook-import/.env");
    process.exit(1);
  }

  console.log(`Source: ${SOURCE}${EXPORT_FILE ? ` (${EXPORT_FILE})` : ""}   Mode: ${APPLY ? "APPLY (will import)" : "DRY RUN (no changes)"}\n`);

  const posts =
    SOURCE === "export"
      ? readFromExport(EXPORT_FILE || (() => { throw new Error("--source export needs --file <your_posts_1.json>"); })())
      : await fetchFromGraph();
  console.log(`Fetched ${posts.length} posts with text.\n`);

  // Existing site content for dedupe
  const existing = await fetchExistingPoems();
  const existingHashes = new Set();
  const existingTitles = new Set();
  for (const p of existing) {
    existingHashes.add(htmlToComparable(p.content_english));
    existingHashes.add(htmlToComparable(p.content_greek));
    existingTitles.add(String(p.title || "").trim().toLowerCase());
  }

  const accepted = [];
  const skipped = [];

  for (const post of posts) {
    const verdict = classifyPoem(post.message);
    if (!verdict.isPoem) {
      skipped.push({ preview: post.message.slice(0, 60).replace(/\n/g, " "), reason: verdict.reason });
      continue;
    }
    const language = detectLanguage(post.message);
    const { title, body } = extractTitle(post.message);

    if (existingTitles.has(title.trim().toLowerCase())) {
      skipped.push({ preview: title, reason: "a poem with this title already exists on the site" });
      continue;
    }
    if (existingHashes.has(textToComparable(body)) || existingHashes.has(textToComparable(post.message))) {
      skipped.push({ preview: title, reason: "identical content already on the site" });
      continue;
    }

    accepted.push({
      title,
      language,
      createdTime: post.createdTime,
      link: post.link,
      row: {
        title,
        content_english: language === "english" ? textToHtml(body) : PLACEHOLDER,
        content_greek: language === "greek" ? textToHtml(body) : PLACEHOLDER,
        likes: 0,
        ...(post.createdTime ? { created_at: post.createdTime } : {}),
      },
    });
    // Prevent duplicates within this same run
    existingTitles.add(title.trim().toLowerCase());
    existingHashes.add(textToComparable(body));
  }

  console.log(`=== WILL IMPORT (${accepted.length}) ===`);
  for (const a of accepted) {
    console.log(`  [${a.language === "greek" ? "GR" : "EN"}] "${a.title}"  (${(a.createdTime || "no date").slice(0, 10)})`);
  }
  console.log(`\n=== SKIPPED (${skipped.length}) ===`);
  for (const s of skipped) {
    console.log(`  - "${s.preview}" — ${s.reason}`);
  }

  // Full report for review
  const report = { generatedAt: new Date().toISOString(), accepted, skipped };
  fs.writeFileSync(path.join(__dirname, "import-report.json"), JSON.stringify(report, null, 2), "utf8");
  console.log(`\nDetailed report written to facebook-import/import-report.json`);

  if (!APPLY) {
    console.log("\nDry run only. Review the list above, then re-run with --apply to import.");
    return;
  }

  if (accepted.length === 0) {
    console.log("\nNothing to import.");
    return;
  }

  console.log("\nLogging in as admin...");
  const token = await adminLogin();
  let ok = 0;
  for (const a of accepted) {
    try {
      await insertPoem(token, a.row);
      ok++;
      console.log(`  + imported "${a.title}"`);
    } catch (e) {
      console.error(`  ! failed "${a.title}": ${e.message}`);
    }
  }
  console.log(`\nDone: ${ok}/${accepted.length} poems imported. They are live on the site and editable in Poem Management.`);
})().catch((e) => {
  console.error("\nImport failed:", e.message || e);
  process.exit(1);
});
