import assert from "node:assert/strict";
import test from "node:test";
import { AxiosError } from "axios";
import { apiErrorMessage } from "../lib/http/client.ts";

test("displays the descriptions in shared validation and conflict results", () => {
  const validation = new AxiosError("Bad Request", undefined, undefined, undefined, {
    data: { title: "One or more validation errors occurred.", errors: "نرخ برآورد پیدا نشد." },
    status: 400,
  });
  const conflict = new AxiosError("Conflict", undefined, undefined, undefined, {
    data: { code: "Certificate.StaleVersion", description: "نسخه سند تغییر کرده است." },
    status: 409,
  });

  assert.equal(apiErrorMessage(validation), "نرخ برآورد پیدا نشد.");
  assert.equal(apiErrorMessage(conflict), "نسخه سند تغییر کرده است.");
});
