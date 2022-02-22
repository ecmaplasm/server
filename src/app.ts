import type { IncomingMessage, RequestListener } from 'node:http';
import type { Logger } from 'pino';

import { createContextFactory } from './context';
import type { FilterFactory, FilterOptions } from './filter';
import { type Handler, type HttpMethod, type RouterOptions, createRouter } from './router';
import { type ServerOptions, type ServerType, createServer } from './server';

interface AppConfig {
  filter: <TOptions extends {}>(createFilter: FilterFactory<TOptions>, options?: FilterOptions<TOptions>) => this;
  route: (method: HttpMethod | HttpMethod[], path: string | string[], handler: Handler) => this;
  listen: <TOptions extends ServerOptions>(options: TOptions) => Promise<ServerType<TOptions>>;
}

interface AppOptions {
  log?: Logger;
  router?: RouterOptions;
  getRequestId?: (req: IncomingMessage) => string;
}

type App = RequestListener & AppConfig;

function createApp({ router: routerOptions, ...options }: AppOptions): App {
  const contextFactory = createContextFactory(options);
  const router = createRouter(contextFactory, routerOptions);

  const app: App = Object.assign<RequestListener, AppConfig>((req, res) => router.handle(req, res), {
    filter: (createFilter, filterOptions = {}) => {
      router.addFilter(createFilter, filterOptions);
      return app;
    },
    route: (method, path, handler) => {
      router.addRoute(method, path, handler);
      return app;
    },
    listen: (serverOptions) => createServer(serverOptions, app),
  });

  return app;
}

export type { App, AppOptions };
export { createApp };
