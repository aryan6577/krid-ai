const SERPAPI_PROVIDER = "serpapi";
const SERPAPI_ENDPOINT = "https://serpapi.com/search.json";

const SEARCH_TEMPLATES = {
  tutorial_education: {
    key: "tutorial_education",
    provider: SERPAPI_PROVIDER,
    engine: "google",
    maxResults: 3,
    allowedDomains: ["olympics.com", "icc-cricket.com", "thefa.com", "englandfootball.com"],
    buildQuery: ({ sport, drillName }) =>
      `${sport} ${drillName} coaching basics (${["site:olympics.com", "site:icc-cricket.com", "site:thefa.com", "site:englandfootball.com"].join(" OR ")})`,
  },
  sports_opportunities: {
    key: "sports_opportunities",
    provider: SERPAPI_PROVIDER,
    engine: "google",
    maxResults: 4,
    allowedDomains: [],
    buildQuery: ({ sport, location }) => `${sport} clubs academies events ${location || ""}`.trim(),
  },
};

export function createSearchEnrichmentService({ apiKey = process.env.SERPAPI_API_KEY, fetchImpl = fetch, now = () => new Date() } = {}) {
  async function runTemplate(templateKey, params = {}) {
    const template = SEARCH_TEMPLATES[templateKey];
    if (!template) {
      const error = new Error("Unsupported search enrichment template.");
      error.status = 400;
      throw error;
    }

    const query = template.buildQuery(params);
    const base = {
      provider: template.provider,
      template: template.key,
      query,
      retrievedAt: now().toISOString(),
      sources: [],
      status: "unavailable",
      reason: "",
    };

    if (!apiKey) {
      return { ...base, reason: "SERPAPI_API_KEY is not configured." };
    }

    try {
      const url = new URL(SERPAPI_ENDPOINT);
      url.searchParams.set("engine", template.engine);
      url.searchParams.set("q", query);
      url.searchParams.set("api_key", apiKey);
      url.searchParams.set("output", "json");
      url.searchParams.set("num", String(template.maxResults));
      if (params.location) url.searchParams.set("location", params.location);

      const response = await fetchImpl(url);
      const data = await parseResponse(response);
      if (!response.ok) {
        return {
          ...base,
          status: response.status === 429 ? "quota_exhausted" : "unavailable",
          reason: data?.error || data?.message || `SerpAPI returned HTTP ${response.status}.`,
        };
      }

      const organic = Array.isArray(data?.organic_results) ? data.organic_results : [];
      const sources = organic
        .map((item) => sourceFromOrganicResult(item, base))
        .filter((source) => source.url && passesDomainFilter(source.url, template.allowedDomains))
        .slice(0, template.maxResults);

      return {
        ...base,
        sources,
        status: sources.length ? "usable" : "no_relevant_sources",
        reason: sources.length ? "" : "No search results passed the configured filters.",
      };
    } catch (err) {
      return { ...base, reason: err.message || "SerpAPI request failed." };
    }
  }

  return {
    enrichTutorialContent: ({ sport, drillName }) => runTemplate("tutorial_education", { sport, drillName }),
    enrichSportsOpportunities: ({ sport, location }) => runTemplate("sports_opportunities", { sport, location }),
  };
}

export const searchEnrichmentService = createSearchEnrichmentService();

export async function enrichTutorialDrills(drills, service = searchEnrichmentService) {
  return Promise.all(
    drills.map(async (drill) => ({
      ...drill,
      educationalContent: await service.enrichTutorialContent({
        sport: drill.sport,
        drillName: drill.drillName,
      }),
    }))
  );
}

export async function enrichAlternativeSportOpportunities(result, service = searchEnrichmentService) {
  const recommendations = await Promise.all(
    (result.recommendations || []).map(async (recommendation) => {
      const enrichment = await service.enrichSportsOpportunities({
        sport: recommendation.sport,
        location: result.profileContext?.location,
      });
      return {
        ...recommendation,
        opportunitySignals: enrichment.sources,
        opportunityEnrichment: {
          provider: enrichment.provider,
          template: enrichment.template,
          query: enrichment.query,
          status: enrichment.status,
          reason: enrichment.reason,
          retrievedAt: enrichment.retrievedAt,
        },
      };
    })
  );

  return {
    ...result,
    recommendations,
    opportunitySignals: recommendations.flatMap((recommendation) => recommendation.opportunitySignals || []),
  };
}

async function parseResponse(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function sourceFromOrganicResult(item, base) {
  const url = item.link || item.url || "";
  return {
    provider: base.provider,
    template: base.template,
    query: base.query,
    url,
    title: item.title || url,
    snippet: item.snippet || "",
    retrievedAt: base.retrievedAt,
    relevanceQualityStatus: "unreviewed_search_result",
  };
}

function passesDomainFilter(url, allowedDomains) {
  if (!allowedDomains?.length) return true;
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    return allowedDomains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}
