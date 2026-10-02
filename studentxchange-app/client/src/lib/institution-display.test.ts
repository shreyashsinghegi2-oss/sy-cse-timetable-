import { test } from "node:test";
import assert from "node:assert/strict";
import { displayInstitutionName, redactInstitutionText } from "./institution-display";

test("hides the legacy campus name without changing unrelated institutions", () => {
  assert.equal(displayInstitutionName("Veloces Campus"), "Your Institution");
  assert.equal(displayInstitutionName("VELOCES-CAMPUS", "your institution"), "your institution");
  assert.equal(displayInstitutionName("Other University"), "Other University");
  assert.equal(displayInstitutionName(null, "—"), "—");
  assert.equal(redactInstitutionText("A roadmap for Veloces Campus students"), "A roadmap for your institution students");
});