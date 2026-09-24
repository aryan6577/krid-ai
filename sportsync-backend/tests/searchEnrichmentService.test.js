import assert from "node:assert/strict";
import test from "node:test";

import { recommendAlternativeSports } from "../rules/alternativeSportsEngine.js";
import {
  createSearchEnrichmentService,
  enrichAlternativeSportOpportunities,
  enrichTutorialDrills,
} from "../services/searchEnrichmentService.js";

test("SerpAPI outage leaves alternative sports recommendations available", async () => {
  const service = createSearchEnrichmentService({
    apiKey: "test-key",
    fetchImpl: async () => ({
      ok: false,
      status: 429,
      text: async () => JSON.stringify({ error: "quota exhausted" }),
    }),
  });
  const base = recommendAlternativeSports({
    primarySport: "Cricket",
    player: {
      sports: ["Cricket"],
      skill: { Cricket: "Intermediate" },
      preferences: { competitivePreference: "Competitive" },
      location: "Bengaluru",
    },
  });

  const enriched = await enrichAlternativeSportOpportunities(base, service);

  assert.ok(enriched.recommendations.length >= 3);
  assert.deepEqual(enriched.opportunitySignals, []);
  assert.equal(enriched.recommendations[0].opportunityEnrichment.status, "quota_exhausted");
});

test("SerpAPI outage leaves tutorial catalog enrichment optional", async () => {
  const service = createSearchEnrichmentService({
    apiKey: "test-key",
    fetchImpl: async () => {
      throw new Error("network down");
    },
  });

  const drills = await enrichTutorialDrills(
    [
      {
        sport: "Football",
        drillName: "Ready stance + lateral movement drill",
      },
    ],
    service
  );

  assert.equal(drills.length, 1);
  assert.equal(drills[0].educationalContent.status, "unavailable");
  assert.deepEqual(drills[0].educationalContent.sources, []);
});

test("search enrichment templates filter configured tutorial domains", async () => {
  const service = createSearchEnrichmentService({
    apiKey: "test-key",
    now: () => new Date("2026-09-22T00:00:00.000Z"),
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          organic_results: [
            { title: "Official football coaching", link: "https://www.thefa.com/boot-room", snippet: "Training guide" },
            { title: "Random blog", link: "https://example.com/football", snippet: "Blog" },
          ],
        }),
    }),
  });

  const result = await service.enrichTutorialContent({
    sport: "Football",
    drillName: "Ready stance + lateral movement drill",
  });

  assert.equal(result.status, "usable");
  assert.equal(result.sources.length, 1);
  assert.equal(result.sources[0].provider, "serpapi");
  assert.equal(result.sources[0].url, "https://www.thefa.com/boot-room");
  assert.equal(result.sources[0].relevanceQualityStatus, "unreviewed_search_result");
});
