const fail = (message) => { const error = new Error(message); error.status = 400; throw error; };
const required = (value, label, min, max) => {
  const text = String(value || "").trim();
  if (text.length < min || text.length > max) fail(`${label} must be ${min}-${max} characters.`);
  return text;
};

export function validateOpportunity(input) {
  const deadline = String(input.deadline || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline) || Number.isNaN(Date.parse(`${deadline}T00:00:00Z`)) || deadline < new Date().toISOString().slice(0, 10)) fail("Choose a valid future deadline.");
  const minRating = Number(input.minRating || 0);
  if (!Number.isInteger(minRating) || minRating < 0 || minRating > 3000) fail("Minimum rating must be 0-3000.");
  return {
    title: required(input.title, "Title", 8, 120), sport: required(input.sport, "Sport", 2, 40),
    type: required(input.type, "Opportunity type", 3, 60), location: required(input.location, "Location", 3, 160),
    description: required(input.description, "Description", 80, 10000),
    article: input.article ? required(input.article, "Organisation article", 80, 12000) : "",
    stipend: String(input.stipend || "").trim().slice(0, 120), min_rating: minRating, deadline,
  };
}

export function validateArticle(input) {
  return { article: required(input.article, "Career article", 80, 12000) };
}

export function validateApplication(input) {
  const cv = input.cv || {};
  const name = required(cv.name, "CV filename", 1, 180);
  const mime = String(cv.type || "").toLowerCase();
  const supported = (mime === "application/pdf" && name.toLowerCase().endsWith(".pdf")) ||
    (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" && name.toLowerCase().endsWith(".docx"));
  if (!supported) fail("CV must be a PDF or DOCX file.");
  const base64 = String(cv.base64 || "");
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64) || base64.length % 4 !== 0) fail("CV content is invalid.");
  const bytes = Buffer.from(base64, "base64");
  if (bytes.length < 100 || bytes.length > 750 * 1024) fail("CV must be between 100 bytes and 750 KB.");
  if (mime === "application/pdf" && bytes.subarray(0, 5).toString() !== "%PDF-") fail("This file is not a PDF.");
  if (mime.includes("wordprocessingml") && bytes.subarray(0, 2).toString() !== "PK") fail("This file is not a DOCX.");
  return { cv_name: name, cv_type: mime, cv_base64: base64, statement: required(input.statement, "Application statement", 40, 3000) };
}
