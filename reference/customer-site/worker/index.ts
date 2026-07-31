/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

const MARKETPLACE_JOB_IDS = [1, 2, 3, 4, 5];

async function seedMarketplaceJobs(db: D1Database) {
  await db.batch(
    MARKETPLACE_JOB_IDS.map((id) =>
      db
        .prepare(
          "INSERT INTO jobs (id, status) VALUES (?, 'available') ON CONFLICT(id) DO NOTHING"
        )
        .bind(id)
    )
  );
}

async function handleJobsApi(request: Request, env: Env) {
  try {
    await seedMarketplaceJobs(env.DB);

    if (request.method === "GET") {
      const result = await env.DB
        .prepare("SELECT id FROM jobs WHERE status = 'available' ORDER BY id")
        .all<{ id: number }>();
      return Response.json(
        { availableIds: result.results.map((row) => row.id) },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    if (request.method === "POST") {
      const payload = (await request.json()) as {
        jobId?: number;
        detailerId?: string;
      };
      const jobId = Number(payload.jobId);
      const detailerId = payload.detailerId?.trim();
      if (!Number.isInteger(jobId) || !detailerId) {
        return Response.json(
          { error: "A valid job and detailer are required." },
          { status: 400 }
        );
      }

      const result = await env.DB
        .prepare(
          "UPDATE jobs SET status = 'accepted', accepted_by = ?, accepted_at = ? WHERE id = ? AND status = 'available'"
        )
        .bind(detailerId, Date.now(), jobId)
        .run();

      if (!result.meta.changes) {
        return Response.json(
          { error: "This job has already been accepted by another detailer." },
          { status: 409 }
        );
      }
      return Response.json({ accepted: true, jobId });
    }

    return new Response("Method not allowed", { status: 405 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Marketplace unavailable";
    return Response.json({ error: message }, { status: 500 });
  }
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    if (url.pathname === "/api/jobs") {
      return handleJobsApi(request, env);
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
