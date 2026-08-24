function secure(response: Response): Response {
  const output = new Response(response.body, response);
  output.headers.set("X-Content-Type-Options", "nosniff");
  output.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  output.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  output.headers.set("X-Frame-Options", "SAMEORIGIN");
  return output;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return secure(await env.ASSETS.fetch(request));
  },
} satisfies ExportedHandler<Env>;
