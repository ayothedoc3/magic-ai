import { writeFileSync } from "fs";

const BASE = "http://2.59.156.125:8000";
const PROJECT_UUID = "gwcccgckk0k80ks4g048gogc";
const APP_UUID = "towwkgwkwc08gg800cokgck0";
const CREDS = { email: "ayothedoc3@gmail.com", password: "1992@Coolify!" };

let cookies = {};

function pc(h) {
  for (const sc of (h.getSetCookie ? h.getSetCookie() : [])) {
    const [p] = sc.split(";");
    const i = p.indexOf("=");
    if (i > 0) cookies[p.substring(0, i).trim()] = p.substring(i + 1).trim();
  }
}

function ck() {
  return Object.entries(cookies).map(([k, v]) => k + "=" + v).join("; ");
}

function xsrf() {
  return decodeURIComponent(cookies["XSRF-TOKEN"] || "");
}

function htmlDec(s) {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#039;/g, "'");
}

async function login() {
  let r = await fetch(BASE + "/sanctum/csrf-cookie", {
    headers: { Referer: BASE },
    redirect: "manual",
  });
  pc(r.headers);

  r = await fetch(BASE + "/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Cookie: ck(),
      "X-XSRF-TOKEN": xsrf(),
      Referer: BASE,
      Origin: BASE,
    },
    body: JSON.stringify(CREDS),
    redirect: "manual",
  });
  pc(r.headers);
  console.log("Login:", r.status);
}

async function getPage(path) {
  const r = await fetch(BASE + path, {
    headers: {
      Accept: "text/html",
      Cookie: ck(),
      "X-XSRF-TOKEN": xsrf(),
      Referer: BASE,
    },
    redirect: "follow",
  });
  pc(r.headers);
  const html = await r.text();
  const csrfMatch = html.match(/meta name="csrf-token" content="([^"]+)"/);
  const csrf = csrfMatch ? csrfMatch[1] : null;
  const snaps = {};
  const re = /wire:snapshot="([^"]+)"/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    try {
      const p = JSON.parse(htmlDec(m[1]));
      if (p.memo && p.memo.name) {
        snaps[p.memo.name] = { decoded: htmlDec(m[1]), parsed: p };
      }
    } catch (e) {}
  }
  return { html, csrf, snaps };
}

async function lwCall(path, snap, updates, calls, csrf) {
  const r = await fetch(BASE + "/livewire/update", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/html, application/xhtml+xml",
      Cookie: ck(),
      "X-XSRF-TOKEN": xsrf(),
      "X-Livewire": "true",
      Referer: BASE + path,
      Origin: BASE,
    },
    body: JSON.stringify({
      _token: csrf,
      components: [
        { snapshot: snap, updates: updates || {}, calls: calls || [] },
      ],
    }),
    redirect: "manual",
  });
  pc(r.headers);
  const t = await r.text();
  if (r.status !== 200)
    return { err: true, status: r.status, text: t.substring(0, 200) };
  try {
    return { err: false, data: JSON.parse(t) };
  } catch (e) {
    return { err: true, status: r.status, text: t.substring(0, 200) };
  }
}

// Token pattern: number|alphanumeric (Sanctum token format)
const TOKEN_RE = /\d+\|[A-Za-z0-9]{30,}/;

async function createApiToken() {
  console.log("\n--- Creating API Token ---");
  const pg = await getPage("/security/api-tokens");
  const comp = pg.snaps["security.api-tokens"];
  if (!comp) {
    console.log("ERROR: api-tokens component not found");
    return null;
  }
  console.log("isApiEnabled:", comp.parsed.data?.isApiEnabled);

  // Attempt 1: set description + call createToken in one request
  console.log("Attempt 1: combined update + call...");
  let res = await lwCall(
    "/security/api-tokens",
    comp.decoded,
    { description: "setup" },
    [{ path: "", method: "createToken", params: [] }],
    pg.csrf
  );

  if (!res.err) {
    const s = JSON.stringify(res.data);
    const m = s.match(TOKEN_RE);
    if (m) return m[0];
    writeFileSync("/tmp/lw-r1.json", s);
    console.log("No token pattern found (saved /tmp/lw-r1.json)");
  } else {
    console.log("  Failed:", res.status, res.text);
  }

  // Attempt 2: update description first, then call createToken with updated snapshot
  console.log("Attempt 2: two-step...");
  const pg2 = await getPage("/security/api-tokens");
  const c2 = pg2.snaps["security.api-tokens"];

  const upd = await lwCall(
    "/security/api-tokens",
    c2.decoded,
    { description: "setup" },
    [],
    pg2.csrf
  );

  if (
    !upd.err &&
    upd.data?.components?.[0]?.snapshot
  ) {
    const newSnap = upd.data.components[0].snapshot;
    console.log("  Description updated, calling createToken...");

    // Get fresh CSRF
    const pg3 = await getPage("/security/api-tokens");
    const res2 = await lwCall(
      "/security/api-tokens",
      newSnap,
      {},
      [{ path: "", method: "createToken", params: [] }],
      pg3.csrf
    );

    if (!res2.err) {
      const s = JSON.stringify(res2.data);
      const m = s.match(TOKEN_RE);
      if (m) return m[0];
      writeFileSync("/tmp/lw-r2.json", s);
      console.log("No token pattern found (saved /tmp/lw-r2.json)");
    } else {
      console.log("  Call failed:", res2.status, res2.text);
    }
  } else {
    console.log("  Update failed:", upd.err ? upd.status : "no snapshot");
  }

  return null;
}

async function doApiSetup(token) {
  const api = async (method, path, body) => {
    const opts = {
      method,
      headers: {
        Accept: "application/json",
        Authorization: "Bearer " + token,
      },
    };
    if (body) {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }
    const r = await fetch(BASE + "/api/v1" + path, opts);
    const t = await r.text();
    try {
      return { s: r.status, d: JSON.parse(t) };
    } catch {
      return { s: r.status, d: t };
    }
  };

  // Get server
  console.log("\n--- Getting server ---");
  const srv = await api("GET", "/servers");
  if (!Array.isArray(srv.d) || !srv.d.length) {
    console.log("ERROR: No servers:", JSON.stringify(srv.d).substring(0, 200));
    process.exit(1);
  }
  const serverUuid = srv.d[0].uuid;
  console.log("Server:", srv.d[0].name, serverUuid);

  // Check existing databases
  console.log("\n--- Checking databases ---");
  const dbs = await api("GET", "/databases");
  console.log("Existing databases:", Array.isArray(dbs.d) ? dbs.d.length : dbs.d);

  const existingPg = Array.isArray(dbs.d)
    ? dbs.d.find(
        (db) =>
          db.type?.includes("postgresql") || db.type?.includes("postgres")
      )
    : null;

  let dbUuid;
  if (existingPg) {
    console.log("Using existing PostgreSQL:", existingPg.uuid);
    dbUuid = existingPg.uuid;
  } else {
    // Create PostgreSQL
    console.log("\n--- Creating PostgreSQL ---");
    const db = await api("POST", "/databases", {
      type: "postgresql",
      name: "ayomagic-db",
      server_uuid: serverUuid,
      project_uuid: PROJECT_UUID,
      environment_name: "production",
      postgres_user: "ayomagic",
      postgres_password: "AyoMagic2026Secure!",
      postgres_db: "ayomagic",
      instant_deploy: true,
    });
    console.log("DB:", db.s, JSON.stringify(db.d).substring(0, 300));
    dbUuid = db.d?.uuid;

    // Wait for DB to start
    console.log("Waiting 15s for DB startup...");
    await new Promise((r) => setTimeout(r, 15000));
  }

  // Get DB connection details
  let dbUrl =
    "postgresql://ayomagic:AyoMagic2026Secure!@ayomagic-db:5432/ayomagic";
  if (dbUuid) {
    const det = await api("GET", "/databases/" + dbUuid);
    console.log(
      "DB details:",
      JSON.stringify(det.d).substring(0, 400)
    );
    if (det.d?.internal_db_url) dbUrl = det.d.internal_db_url;
  }
  console.log("DATABASE_URL:", dbUrl);

  // Set env vars
  console.log("\n--- Setting environment variables ---");
  const envVars = [
    ["DATABASE_URL", dbUrl],
    ["NEXTAUTH_URL", "https://ayomagic.com"],
    [
      "NEXTAUTH_SECRET",
      "kgk/faSl7CV9KgicDqDZ/liSSEWzIAQqPcmIrMO5YVo=",
    ],
    ["NEXT_PUBLIC_APP_URL", "https://ayomagic.com"],
  ];
  for (const [key, value] of envVars) {
    const r = await api("POST", "/applications/" + APP_UUID + "/envs", {
      key,
      value,
      is_build_time: false,
      is_preview: false,
    });
    console.log("  " + key + ":", r.s);
  }

  // Update port + build pack
  console.log("\n--- Updating port to 3000 + Dockerfile build ---");
  const pt = await api("PATCH", "/applications/" + APP_UUID, {
    ports_exposes: "3000",
    build_pack: "dockerfile",
    dockerfile_location: "/Dockerfile",
  });
  console.log("Update:", pt.s, JSON.stringify(pt.d).substring(0, 200));

  // Deploy
  console.log("\n--- Triggering deploy ---");
  const dep = await api("GET", "/applications/" + APP_UUID + "/restart");
  console.log("Deploy:", dep.s, JSON.stringify(dep.d).substring(0, 200));

  console.log("\n=== DONE ===");
  console.log("App: https://ayomagic.com");
  console.log("Coolify: " + BASE + "/project/" + PROJECT_UUID);
}

async function main() {
  console.log("=== Coolify Full Setup ===\n");
  await login();

  // If a token was passed as CLI arg, use it directly
  if (process.argv[2]) {
    console.log("Using provided API token");
    await doApiSetup(process.argv[2]);
    return;
  }

  const token = await createApiToken();

  if (!token) {
    console.log("\n=== MANUAL TOKEN NEEDED ===");
    console.log("1. Go to: " + BASE + "/security/api-tokens");
    console.log('2. Enter description: "setup"');
    console.log("3. Select root permission");
    console.log("4. Click Create API Token");
    console.log("5. Copy the token and run:");
    console.log("   node scripts/coolify-setup.mjs YOUR_TOKEN_HERE");
    process.exit(1);
  }

  console.log("Token:", token.substring(0, 25) + "...");
  await doApiSetup(token);
}

main().catch((e) => console.error("Fatal:", e));
