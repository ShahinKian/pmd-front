// Run after npm run build. Checks the actual route's PNG pixels and challenge cookies.
const assert = require("node:assert/strict");
const http = require("node:http");
const { spawn } = require("node:child_process");
const sharp = require("sharp");

async function main() {
  const reservation = http.createServer();
  await new Promise(resolve => reservation.listen(0, "127.0.0.1", resolve));
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  const server = spawn(process.execPath, [
    "node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port),
  ], {
    env: { ...process.env, CAPTCHA_SECRET: "captcha-http-test-secret" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(Error("Next start timed out")), 15000);
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
    const cookies = new Set();
    for (let attempt = 0; attempt < 10; attempt++) {
      const response = await fetch(`http://127.0.0.1:${port}/api/auth/captcha?render=png-v1&v=${attempt}`, {
        cache: "no-store",
      });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("content-type"), "image/png");
      assert.match(response.headers.get("cache-control"), /no-store/);
      const cookie = response.headers.get("set-cookie");
      assert.match(cookie, /pmd_login_captcha=/);
      cookies.add(cookie);
      const png = Buffer.from(await response.arrayBuffer());
      assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
      const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      assert.equal(info.width, 240);
      assert.equal(info.height, 66);
      for (let glyph = 0; glyph < 5; glyph++) {
        let ink = 0;
        for (let y = 8; y < 58; y++) {
          for (let x = 40 + glyph * 30; x < 70 + glyph * 30; x++) {
            const offset = (y * info.width + x) * info.channels;
            if (data[offset] < 160 && data[offset + 1] < 100 && data[offset + 2] > 150) ink++;
          }
        }
        assert.ok(ink > 15, `Glyph ${glyph + 1} must be present in the PNG`);
      }
    }
    assert.equal(cookies.size, 10);
    console.log("PASS: ten uncached PNG captchas with all five visible glyphs and distinct challenge cookies");
  } finally {
    server.kill();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
