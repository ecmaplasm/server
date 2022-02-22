import findMyWay, { HTTPVersion } from 'find-my-way';
import type { IncomingMessage, ServerResponse } from 'http';

import type { Context, ContextFactory } from './context';
import type { Filter, FilterErrorHandler, FilterFactory, FilterHandler, FilterOptions } from './filter';
import { type Response, response } from './response';
import { type Selector, createSelector } from './selector';

type HttpMethod = findMyWay.HTTPMethod;
type Handler = (ctx: Context) => Promise<Response>;
type RouterOptions = findMyWay.Config<HTTPVersion.V1>;

interface Router {
  addFilter: <TOptions extends {}>(createFilter: FilterFactory<TOptions>, options: FilterOptions<TOptions>) => void;
  addRoute: (method: HttpMethod | HttpMethod[], path: string | string[], handler: Handler) => void;
  handle: (req: IncomingMessage, res: ServerResponse) => void;
}

interface RouteEvents {
  onRequest: () => Promise<void>;
  onError: (error: unknown) => Promise<void>;
  onFinish: () => Promise<void>;
}

function isPrefixMatch(url: string, prefix: string | undefined) {
  return (
    !prefix ||
    (url.startsWith(prefix) &&
      (url.length === prefix.length || url[prefix.length] === '/' || url[prefix.length] === '?'))
  );
}

function getRouteEvents(ctx: Context, filters: Filter[]): Required<RouteEvents> {
  const onErrorHandlers: FilterErrorHandler[] = [];
  const onFinishHandlers: FilterHandler[] = [];

  return {
    onRequest: async () => {
      for (const { prefix, onRequest, onError, onFinish } of filters) {
        if (!isPrefixMatch(ctx.req.url as string, prefix)) {
          continue;
        }

        if (onError) {
          onErrorHandlers.push(onError);
        }

        if (onFinish) {
          onFinishHandlers.push(onFinish);
        }

        if (onRequest) {
          await onRequest(ctx);
        }
      }
    },
    onError: async (error) => {
      for (const onError of onErrorHandlers) {
        await onError(error, ctx).catch((unexpectedError) => {
          ctx.log.warn(unexpectedError, 'unexpected error in onError handler');
        });
      }
    },
    onFinish: async () => {
      for (const onFinish of onFinishHandlers) {
        await onFinish(ctx).catch((unexpectedError) => {
          ctx.log.warn(unexpectedError, 'unexpected error in onFinish handler');
        });
      }
    },
  };
}

async function handle(ctx: Context, { onRequest, onError, onFinish }: RouteEvents, selector: Selector): Promise<void> {
  onRequest()
    .then(() => selector(ctx))
    .catch(onError);

  ctx.res.on('finish', onFinish);
}

function createRouter(
  { createDefaultContext, createRouteContext }: ContextFactory,
  options: RouterOptions = {},
): Router {
  const filters: Filter[] = [];
  const router = findMyWay({
    ...options,
    defaultRoute:
      options.defaultRoute ??
      ((req, res) => {
        const ctx = createDefaultContext(req, res);
        const events = getRouteEvents(ctx, filters);
        void handle(ctx, events, () => response().notFound().send(ctx));
      }),
  });

  return {
    addFilter: (createFilter, filterOptions) => {
      filters.push(createFilter(filterOptions));
    },
    addRoute: (method, paths, handler) => {
      const selector = createSelector(handler);
      const routeFilters = [...filters];

      (paths instanceof Array ? paths : [paths]).forEach((path) => {
        router.on(method, path, (req, res, params) => {
          const ctx = createRouteContext(req, res, params);
          const events = getRouteEvents(ctx, routeFilters);
          void handle(ctx, events, () => selector(ctx).then(() => response().noContent().send(ctx)));
        });
      });
    },
    handle: (req, res) => {
      router.lookup(req, res);
    },
  };
}

export type { Handler, HttpMethod, Router, RouterOptions };
export { createRouter };
