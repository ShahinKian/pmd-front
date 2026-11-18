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

const { renderCaptchaSvg } = load("lib/auth/captcha-image.ts");
const { createCaptchaChallenge, verifyCaptcha, CAPTCHA_COOKIE } = load("lib/auth/captcha.ts");

test("captcha renders every operand and symbol as separate visible vector paths", () => {
  for (let digit = 1; digit <= 9; digit++) {
    for (const operator of ["+", "-"]) {
      const svg = renderCaptchaSvg(`${digit} ${operator} 9 = ?`);
      assert.equal((svg.match(/<path /g) ?? []).length, 5);
      assert.equal((svg.match(/<g transform=/g) ?? []).length, 5);
      assert.equal(svg.includes("<text"), false);
      const positions = [...svg.matchAll(/translate\((\d+) (\d+)\)/g)].map(match => Number(match[1]));
      assert.deepEqual(positions, [45, 75, 105, 135, 165]);
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
    assert.equal((renderCaptchaSvg(challenge.expression).match(/<path /g) ?? []).length, 5);
  }
});
