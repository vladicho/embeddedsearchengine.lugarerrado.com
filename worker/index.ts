function secure(response: Response): Response {
  const output = new Response(response.body, response);
  output.headers.set("X-Content-Type-Options", "nosniff");
  output.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  output.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  output.headers.set("X-Frame-Options", "SAMEORIGIN");
  return output;
}

const MAX_RESPONSE_BYTES = 1_048_576;

type SearxResult = {
  title?: unknown;
  url?: unknown;
  content?: unknown;
  engine?: unknown;
  engines?: unknown;
  publishedDate?: unknown;
};

type SearxPayload = {
  results?: unknown;
  suggestions?: unknown;
  number_of_results?: unknown;
};

function json(data: unknown, status = 200): Response {
  return secure(Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  }));
}

function cleanText(value: unknown, maximum: number): string {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function cleanUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

async function readLimitedJson(response: Response): Promise<SearxPayload> {
  if (!response.body) throw new Error("empty_backend_response");

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new Error("backend_response_too_large");
    }
    chunks.push(value);
  }

  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(body)) as SearxPayload;
}

async function search(request: Request, env: Env): Promise<Response> {
  if (request.method !== "GET") return json({ error: "method_not_allowed" }, 405);

  const requestUrl = new URL(request.url);
  const query = (requestUrl.searchParams.get("q") ?? "").trim();
  const page = Number.parseInt(requestUrl.searchParams.get("pageno") ?? "1", 10);

  if (query.length < 2 || query.length > 200) {
    return json({ error: "A pesquisa precisa ter entre 2 e 200 caracteres." }, 400);
  }
  if (!Number.isInteger(page) || page < 1 || page > 10) {
    return json({ error: "Página inválida." }, 400);
  }

  const backend = new URL("/search", env.SEARCH_BACKEND);
  backend.searchParams.set("q", query);
  backend.searchParams.set("format", "json");
  backend.searchParams.set("language", "pt-BR");
  backend.searchParams.set("safesearch", "1");
  backend.searchParams.set("pageno", String(page));

  try {
    const response = await fetch(backend, {
      headers: {
        Accept: "application/json",
        "User-Agent": "LugarErradoSearch/1.0",
      },
      signal: AbortSignal.timeout(80_000),
    });

    if (!response.ok) {
      console.error("search_backend_error", { status: response.status });
      return json({ error: "O buscador está iniciando. Tente novamente em alguns segundos." }, 503);
    }

    const payload = await readLimitedJson(response);
    const rawResults = Array.isArray(payload.results) ? payload.results : [];
    const results = rawResults.slice(0, 20).flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const result = item as SearxResult;
      const url = cleanUrl(result.url);
      if (!url) return [];
      const engines = Array.isArray(result.engines)
        ? result.engines.map((engine) => cleanText(engine, 30)).filter(Boolean).slice(0, 4)
        : [];
      const engine = cleanText(result.engine, 30);
      return [{
        title: cleanText(result.title, 300) || url,
        url,
        content: cleanText(result.content, 1_000),
        engines: engines.length ? engines : engine ? [engine] : [],
        publishedDate: cleanText(result.publishedDate, 60),
      }];
    });
    const suggestions = Array.isArray(payload.suggestions)
      ? payload.suggestions.map((item) => cleanText(item, 100)).filter(Boolean).slice(0, 8)
      : [];

    return json({
      query,
      page,
      results,
      suggestions,
      numberOfResults: typeof payload.number_of_results === "number" ? payload.number_of_results : null,
    });
  } catch (error) {
    console.error("search_request_failed", {
      message: error instanceof Error ? error.message : "unknown_error",
    });
    return json({ error: "O buscador gratuito demorou para acordar. Tente novamente." }, 504);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (new URL(request.url).pathname === "/api/search") {
      return search(request, env);
    }
    return secure(await env.ASSETS.fetch(request));
  },
} satisfies ExportedHandler<Env>;
