// Run after npm run build, or with PMD_TEST_DEV=1 to exercise Webpack development.
const assert = require("node:assert/strict");
const http = require("node:http");
const { spawn } = require("node:child_process");

async function main() {
  let refreshes = 0;
  const backend = http.createServer(async (request, response) => {
    response.setHeader("Content-Type", "application/json");
    if (request.url === "/baseinfo/networkgroups/496") {
      response.end(JSON.stringify({ IsSuccess: true, Message: null, Data: [] }));
      return;
    }
    if (request.url === "/api/auth/refresh") {
      let body = "";
      for await (const chunk of request) body += chunk;
      const tokens = JSON.parse(body);
      assert.equal(tokens.accessToken, "expired");
      assert.equal(tokens.refreshToken, "valid-refresh");
      refreshes++;
      response.end(JSON.stringify({
        accessToken: "renewed", refreshToken: "rotated-refresh",
        roles: ["NetworkManager"], networkIds: [496],
      }));
      return;
    }
    if (!["Bearer renewed", "Bearer admin"].includes(request.headers.authorization)) {
      response.writeHead(401).end('{"message":"expired"}');
      return;
    }
    if (request.url === "/api/auth/profile") {
      response.end(JSON.stringify({
        id: "test-user",
        roles: request.headers.authorization === "Bearer admin" ? ["Admin"] : ["NetworkManager"],
        networkIds: request.headers.authorization === "Bearer admin" ? [] : [496],
      }));
      return;
    }
    if (request.url.startsWith("/api/program-profiles?")) {
      assert.equal(new URL(request.url, "http://mock").searchParams.get("networkId"), "496");
      response.setHeader("Pagination", '{"totalCount":0}');
      response.end("[]");
      return;
    }
    response.end("{}");
  });
  await new Promise(resolve => backend.listen(0, "127.0.0.1", resolve));
  const reservation = http.createServer();
  await new Promise(resolve => reservation.listen(0, "127.0.0.1", resolve));
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  const origin = `http://127.0.0.1:${port}`;
  const command = process.env.PMD_TEST_DEV === "1" ? ["dev", "--webpack"] : ["start"];
  const server = spawn(process.execPath, [
    "node_modules/next/dist/bin/next", ...command, "--hostname", "127.0.0.1", "--port", String(port),
  ], {
    env: {
      ...process.env,
      API_BASE_URL: `http://127.0.0.1:${backend.address().port}`,
      BASEINFO_BASE_URL: `http://127.0.0.1:${backend.address().port}/baseinfo`,
      BASEINFO_API_KEY: "mock-base-info-key",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(Error("Next start timed out")), 20000);
      server.once("exit", code => {
        clearTimeout(timeout);
        reject(Error("Next exited " + code));
      });
      server.stdout.on("data", chunk => {
        if (chunk.toString().includes("Ready")) {
          clearTimeout(timeout);
          resolve();
        }
      });
    });
    const expiredCookie = "pmd_access_token=expired; pmd_refresh_token=valid-refresh";
    for (const path of [
      "/api/auth/session",
      "/api/auth/me",
      "/api/program-profiles?networkId=496&pageNumber=1&pageSize=20",
      "/api/base-info/network-groups/496",
    ]) {
      const response = await fetch(origin + path, { headers: { Cookie: expiredCookie } });
      assert.equal(response.status, 401, path);
      assert.equal(response.headers.get("set-cookie"), null, path + " must allow refresh");
    }
    const refreshed = await fetch(origin + "/api/auth/refresh", {
      method: "POST", headers: { Cookie: expiredCookie, Origin: origin },
    });
    assert.equal(refreshed.status, 200);
    assert.equal(refreshes, 1);
    const cookies = refreshed.headers.getSetCookie().map(cookie => cookie.split(";")[0]).join("; ");
    assert.match(cookies, /pmd_access_token=renewed/);
    assert.match(cookies, /pmd_refresh_token=rotated-refresh/);
    const session = await fetch(origin + "/api/auth/session", { headers: { Cookie: cookies } });
    assert.equal(session.status, 200);
    const payload = await session.json();
    assert.equal(payload.isSystemAdmin, false);
    assert.deepEqual(payload.user.networkIds, [496]);
    const profiles = await fetch(origin + "/api/program-profiles?networkId=496", { headers: { Cookie: cookies } });
    assert.equal(profiles.status, 200);
    assert.equal(profiles.headers.get("pagination"), '{"totalCount":0}');
    for (const [cookie, isAdmin] of [[cookies, false], ["pmd_access_token=admin", true]]) {
      const responses = await Promise.all([
        "/api/auth/session",
        "/api/base-info/network-groups/496",
        "/api/program-profiles?networkId=496&pageNumber=1&pageSize=20",
      ].map(path => fetch(origin + path, { headers: { Cookie: cookie } })));
      for (const response of responses) assert.equal(response.status, 200);
      assert.equal((await responses[0].json()).isSystemAdmin, isAdmin);
    }
    const missing = await fetch(origin + "/api/auth/refresh", {
      method: "POST", headers: { Origin: origin },
    });
    assert.equal(missing.status, 401);
    assert.match(missing.headers.get("set-cookie"), /Expires=Thu, 01 Jan 1970/);
    console.log("PASS: refresh cookies, token rotation, and concurrent network 496/admin requests");
  } finally {
    server.kill();
    backend.close();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
