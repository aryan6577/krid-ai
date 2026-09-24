import test from "node:test";
import assert from "node:assert/strict";
import { validateOpportunity, validateArticle, validateApplication } from "../services/careerValidationService.js";

const opportunity = { title: "Football assistant coach", sport: "Football", type: "Part time", location: "Bengaluru", description: "Support junior football training every weekday, track attendance, and help coaches prepare structured drills.", deadline: "2099-12-31", minRating: 0 };

test("organisation post requires substantive description and future deadline", () => {
  assert.equal(validateOpportunity(opportunity).title, opportunity.title);
  assert.throws(() => validateOpportunity({ ...opportunity, description: "Short" }), /Description/);
  assert.throws(() => validateOpportunity({ ...opportunity, deadline: "2020-01-01" }), /deadline/);
});

test("career article requires useful content", () => {
  assert.throws(() => validateArticle({ article: "I play football." }), /Career article/);
  assert.equal(validateArticle({ article: "a".repeat(80) }).article.length, 80);
});

test("application accepts a small real PDF and rejects spoofed or oversize files", () => {
  const pdf = Buffer.from(`%PDF-${"a".repeat(130)}`).toString("base64");
  const input = { statement: "I have coached a junior group for two seasons and can attend weekday training.", cv: { name: "resume.pdf", type: "application/pdf", base64: pdf } };
  assert.equal(validateApplication(input).cv_name, "resume.pdf");
  assert.throws(() => validateApplication({ ...input, cv: { ...input.cv, base64: Buffer.from("not a pdf".repeat(20)).toString("base64") } }), /not a PDF/);
  assert.throws(() => validateApplication({ ...input, cv: { ...input.cv, base64: Buffer.alloc(750 * 1024 + 1, 1).toString("base64") } }), /750 KB/);
});
