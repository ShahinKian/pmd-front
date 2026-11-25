const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

function load(file, dependencies = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const evaluate = vm.runInThisContext(`(function(exports, require) {
${code}
})`);
  evaluate(exports, name => dependencies[name] ?? require(name));
  return exports;
}

const { readPlanPeriod } = load("lib/base-info/plan-period.ts", {
  "@/lib/number-input": load("lib/number-input.ts"),
});
const { readEstimateHeader } = load("lib/base-info/estimate.ts", { "./types": load("lib/base-info/types.ts") });

test("normalizes the returned estimate ID, organization code and episode total", () => {
  const header = readEstimateHeader([{ id: "19", planId: "31", estimateOrganizationCode: "0081", partNumber: "24" }], 31);
  assert.equal(header.id, 19);
  assert.equal(header.organizationCode, "0081");
  assert.equal(header.partNumber, 24);
  assert.throws(() => readEstimateHeader({ Id: 19, PlanId: 31 }, 32));
  assert.throws(() => readEstimateHeader([{ Id: 19, PlanId: 31 }, { Id: 20, PlanId: 31 }], 31));
});

test("interprets ISO and Jalali broadcast periods as calendar dates", () => {
  const iso = readPlanPeriod({ PlanId: "31", StartDate: "2026-03-21T00:00:00", EndDate: "2026-03-28" }, 31);
  const jalali = readPlanPeriod({ PlanId: 31, BroadcastStartDate: "۱۴۰۵/۰۱/۰۱", BroadcastEndDate: "۱۴۰۵/۰۱/۰۸" }, 31);
  assert.equal(iso.startDate, "2026-03-21");
  assert.equal(iso.endDate, "2026-03-28");
  assert.equal(jalali.startDate, iso.startDate);
  assert.equal(jalali.endDate, iso.endDate);
  assert.equal(readPlanPeriod({ StartDate: "2026-02-29", EndDate: "2026-03-05" }, 31), null);
  assert.equal(readPlanPeriod({ StartDate: "2026-05-01", EndDate: "2026-04-30" }, 31), null);
});
