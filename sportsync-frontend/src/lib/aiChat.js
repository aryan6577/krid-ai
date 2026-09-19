// Talks to the local krid-backend server, which proxies to Groq's free LLM API.
// See sportsync-backend/README.md for setup instructions.

// 127.0.0.1 (rather than "localhost") sidesteps a common Windows quirk where
// "localhost" resolves to the IPv6 loopback first and can fail to connect
// even though the server is listening fine on IPv4.
export const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:5001";

async function fetchWithTimeout(url, options = {}, timeoutMs = 20000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

// Quick, cheap check the backend is up — used to show a live connection status
// in the chat widget instead of only discovering a problem after a failed send.
export async function checkHealth() {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/api/health`, {}, 4000);
    return res.ok;
  } catch {
    return false;
  }
}

export async function chatWithAssistant(messages, context, { allowRetry = true } = {}) {
  try {
    const res = await fetchWithTimeout(
      `${API_BASE}/api/chat`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, context }),
      },
      25000
    );

    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error("The Krid.ai backend returned an unexpected response.");
    }

    if (!res.ok) {
      throw new Error(data?.error || "Failed to reach the Krid.ai backend.");
    }

    return data; // { message: { role, content, tool_calls? } }
  } catch (err) {
    // One silent retry for transient blips (cold start, brief network hiccup)
    // before we surface a failure and fall back to offline replies.
    if (allowRetry) {
      await new Promise((r) => setTimeout(r, 700));
      return chatWithAssistant(messages, context, { allowRetry: false });
    }
    throw err;
  }
}
