const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

function load(file) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(source, { exports, require, process, Buffer });
  return exports;
}

const { renderCaptchaPng } = load("lib/auth/captcha-image.ts");
const { createCaptchaChallenge, verifyCaptcha, CAPTCHA_COOKIE } = load("lib/auth/captcha.ts");

test("captcha PNG contains every operand and symbol without a native renderer", () => {
  const { PNG } = require("pngjs");
  for (let digit = 0; digit <= 9; digit++) {
    for (const operator of ["+", "-"]) {
      const png = renderCaptchaPng(`${digit} ${operator} 9 = ?`);
      const image = PNG.sync.read(png);
      assert.equal(image.width, 240);
      assert.equal(image.height, 66);
      for (let glyph = 0; glyph < 5; glyph++) {
        let ink = 0;
        for (let y = 8; y < 58; y++) {
          for (let x = 40 + glyph * 30; x < 70 + glyph * 30; x++) {
            const offset = (y * image.width + x) * 4;
            if (image.data[offset] < 160 && image.data[offset + 1] < 100) ink++;
          }
        }
        assert.ok(ink > 15, `Glyph ${glyph + 1} must be visible`);
      }
    }
  }
});

test("rendered arithmetic challenges keep their signed answer validation", () => {
  for (let attempt = 0; attempt < 50; attempt++) {
    const challenge = createCaptchaChallenge();
    const [, left, operator, right] = /^(\d) ([+-]) (\d) = \?$/.exec(challenge.expression);
    const answer = operator === "+" ? Number(left) + Number(right) : Number(left) - Number(right);
    const request = { cookies: { get: name => name === CAPTCHA_COOKIE ? { value: challenge.cookieValue } : undefined } };
    assert.equal(verifyCaptcha(request, String(answer)), true);
    assert.equal(verifyCaptcha(request, String(answer + 1)), false);
    assert.equal(renderCaptchaPng(challenge.expression).subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  }
});
