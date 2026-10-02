import express, { type Express } from "express";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer, createLogger } from "vite";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";
import { injectRouteSeo } from "./seo-meta";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true,
  } as const;

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  const renderApp = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        __dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, injectRouteSeo(template, url));
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  };

  // A legacy public/student-lancing directory shares its name with the React
  // route. Render the SPA first so Vite cannot redirect it to a trailing slash.
  app.get("/student-lancing", renderApp);
  app.use(vite.middlewares);
  app.use("*", renderApp);
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Vite fingerprints all assets with a content hash (e.g. index-DaB3x9Ym.js),
  // so it's safe to cache them for 1 year. Only the HTML shell is no-cache.
  app.use(express.static(distPath, {
    maxAge: "1y",
    immutable: true,
    // Legacy public directories must not hijack matching SPA routes with a
    // slash redirect (for example, /student-lancing).
    redirect: false,
    setHeaders(res, filePath) {
      if (filePath.endsWith(".html")) {
        res.setHeader("Cache-Control", "no-cache, must-revalidate");
      }
    },
  }));

  // fall through to index.html if the file doesn't exist
  const indexTemplate = fs.readFileSync(path.resolve(distPath, "index.html"), "utf-8");
  app.use("*", (req, res) => {
    res
      .status(200)
      .type("html")
      .set("Cache-Control", "no-cache, must-revalidate")
      .send(injectRouteSeo(indexTemplate, req.originalUrl));
  });
}
