const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...headers }
  });

function allowedOrigins(env) {
  return (env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin");
  const allowed = allowedOrigins(env);
  // Requests without Origin (for example, an administrator's command-line
  // request) are allowed. Browser requests must match an explicitly allowed origin.
  if (origin && !allowed.includes(origin)) return null;
  return {
    ...(origin ? { "Access-Control-Allow-Origin": origin, "Vary": "Origin" } : {}),
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400"
  };
}

function base64Utf8(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function constantTimeEqual(left, right) {
  const a = new TextEncoder().encode(String(left || ""));
  const b = new TextEncoder().encode(String(right || ""));
  let diff = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i++) {
    diff |= (a[i] || 0) ^ (b[i] || 0);
  }
  return diff === 0;
}

async function githubRequest(env, path, options = {}) {
  const owner = encodeURIComponent(env.GITHUB_OWNER);
  const repo = encodeURIComponent(env.GITHUB_REPO);
  return fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
    ...options,
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "achievement-archive-personal-worker",
      ...(options.headers || {})
    }
  });
}

async function getSha(env, path) {
  const response = await githubRequest(
    env,
    `${path}?ref=${encodeURIComponent(env.GITHUB_BRANCH || "main")}`
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`GitHub 파일 조회 실패: ${response.status}`);
  return (await response.json()).sha;
}

async function putFile(env, path, content, message, isBase64 = false) {
  const sha = await getSha(env, path);
  const body = {
    message,
    content: isBase64 ? content : base64Utf8(content),
    branch: env.GITHUB_BRANCH || "main"
  };
  if (sha) body.sha = sha;

  const response = await githubRequest(env, path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`GitHub 저장 실패 (${response.status}): ${detail.slice(0, 250)}`);
  }
  return response.json();
}

async function readGames(env) {
  const response = await githubRequest(
    env,
    `data/games.json?ref=${encodeURIComponent(env.GITHUB_BRANCH || "main")}`
  );
  if (response.status === 404) return [];
  if (!response.ok) throw new Error(`게임 데이터 조회 실패: ${response.status}`);

  const file = await response.json();
  const binary = atob(file.content.replace(/\n/g, ""));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  const parsed = JSON.parse(new TextDecoder().decode(bytes));
  return Array.isArray(parsed) ? parsed : [];
}

function validateSaveBody(body) {
  if (!body || typeof body !== "object") return "요청 데이터가 올바르지 않습니다.";
  if (typeof body.password !== "string" || body.password.length > 256) {
    return "관리자 비밀번호 형식이 올바르지 않습니다.";
  }
  if (!Array.isArray(body.games) || !Array.isArray(body.images || [])) {
    return "게임 데이터 형식이 올바르지 않습니다.";
  }
  if (JSON.stringify(body.games).length > 3_000_000) {
    return "게임 데이터가 너무 큽니다.";
  }
  if ((body.images || []).length > 10) {
    return "한 번에 업로드할 수 있는 이미지는 최대 10개입니다.";
  }
  for (const image of body.images || []) {
    if (
      !image ||
      !/^images\/[a-zA-Z0-9가-힣._-]+\.webp$/.test(image.path || "") ||
      image.mimeType !== "image/webp" ||
      typeof image.base64 !== "string" ||
      !/^[A-Za-z0-9+/]*={0,2}$/.test(image.base64)
    ) {
      return "이미지 업로드 데이터가 올바르지 않습니다.";
    }
    if (image.base64.length > 1_300_000) return "이미지 파일이 너무 큽니다.";
  }
  return null;
}

export default {
  async fetch(request, env) {
    const headers = corsHeaders(request, env);
    if (!headers) return json({ error: "허용되지 않은 출처입니다." }, 403);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    const url = new URL(request.url);
    try {
      if (request.method === "GET" && url.pathname === "/api/games") {
        const games = await readGames(env);
        return json({ games }, 200, headers);
      }

      if (request.method === "POST" && url.pathname === "/api/save") {
        // Reject oversized requests before parsing their JSON body.
        const contentLength = Number(request.headers.get("Content-Length") || 0);
        if (contentLength > 12_000_000) {
          return json({ error: "요청 크기가 너무 큽니다." }, 413, headers);
        }

        const body = await request.json();
        const validationError = validateSaveBody(body);
        if (validationError) return json({ error: validationError }, 400, headers);

        if (!env.ADMIN_PASSWORD || !constantTimeEqual(body.password, env.ADMIN_PASSWORD)) {
          return json({ error: "관리자 인증에 실패했습니다." }, 401, headers);
        }
        if (!env.GITHUB_OWNER || !env.GITHUB_REPO || !env.GITHUB_TOKEN) {
          return json({ error: "Worker의 GitHub 환경변수가 설정되지 않았습니다." }, 500, headers);
        }

        for (const image of body.images || []) {
          await putFile(env, image.path, image.base64, `Add game image: ${image.path}`, true);
        }
        await putFile(
          env,
          "data/games.json",
          JSON.stringify(body.games, null, 2),
          "Update personal achievement archive"
        );

        return json({
          ok: true,
          savedGames: body.games.length,
          savedImages: (body.images || []).length
        }, 200, headers);
      }

      return json({ error: "Not found" }, 404, headers);
    } catch (error) {
      return json({ error: error.message || "서버 오류" }, 500, headers);
    }
  }
};
