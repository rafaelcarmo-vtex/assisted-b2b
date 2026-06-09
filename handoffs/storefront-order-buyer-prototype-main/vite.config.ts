import path from 'path';
import { defineConfig, loadEnv, type PluginOption } from 'vite';
import react from '@vitejs/plugin-react';

const apiDevMiddleware = (): PluginOption => ({
  name: 'order-entry-api-dev-middleware',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (!req.url?.startsWith('/api/chat')) {
        return next();
      }

      try {
        const mod = await server.ssrLoadModule('/api/chat.ts');
        const handler = mod.default as (request: Request) => Promise<Response>;
        if (typeof handler !== 'function') {
          throw new Error('api/chat.ts has no default export');
        }

        const protocol = (req.headers['x-forwarded-proto'] as string) || 'http';
        const host = req.headers.host || 'localhost';
        const url = `${protocol}://${host}${req.url}`;

        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
        }
        const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;

        const headers = new Headers();
        for (const [key, value] of Object.entries(req.headers)) {
          if (value === undefined) continue;
          if (Array.isArray(value)) {
            value.forEach((v) => headers.append(key, v));
          } else {
            headers.set(key, value);
          }
        }

        const request = new Request(url, {
          method: req.method,
          headers,
          body: body && req.method && !['GET', 'HEAD'].includes(req.method) ? body : undefined,
        });

        const response = await handler(request);

        res.statusCode = response.status;
        response.headers.forEach((value, key) => {
          res.setHeader(key, value);
        });

        if (!response.body) {
          res.end();
          return;
        }

        const reader = response.body.getReader();
        const pump = async () => {
          try {
            while (true) {
              const { value, done } = await reader.read();
              if (done) break;
              res.write(value);
            }
            res.end();
          } catch (error) {
            res.end();
            throw error;
          }
        };
        await pump();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('[api/chat dev middleware]', error);
        if (!res.headersSent) {
          res.statusCode = 500;
          res.setHeader('content-type', 'application/json');
        }
        res.end(JSON.stringify({ error: message }));
      }
    });
  },
});

export default defineConfig(({ command, mode }) => {
  if (command === 'serve') {
    const env = loadEnv(mode, process.cwd(), '');
    for (const [key, value] of Object.entries(env)) {
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }

  return {
    base: '/assisted-b2b/handoffs/storefront-order-buyer-prototype-main/',
    server: {
      port: 3002,
      host: '0.0.0.0',
    },
    plugins: [react(), ...(command === 'serve' ? [apiDevMiddleware()] : [])],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
