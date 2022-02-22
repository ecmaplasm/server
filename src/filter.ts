import type { Context } from './context';
import type { Response } from './response';
import { createSelector } from './selector';

type FilterRequestSpec = (ctx: Context) => Promise<Response | undefined | void>;
type FilterHandler = (ctx: Context) => Promise<void>;
type FilterErrorHandler = (error: unknown, ctx: Context) => Promise<void>;

interface FilterSpec {
  /**
   * Invoked when each request is received, regardless of whether or not the
   * request matches a route.
   *
   * If a response is returned, no additional `onRequest`, `onRoute`, or route
   * handlers will be invoked.
   */
  onRequest?: FilterRequestSpec;
  /**
   * Invoked if an error is thrown by a filter or route handler, regardless of
   * whether or not the request matched a route.
   *
   * This handler _CANNOT_ send a response, because a response is sent before
   * it is invoked. This is meant for logging only. Uncaught errors are
   * always considered unexpected.
   */
  onError?: FilterErrorHandler;
  /**
   * Invoked after any response is sent, regardless of whether or not the
   * request matched a route, even if an error is thrown.
   */
  onFinish?: FilterHandler;
}

interface Filter {
  prefix: string | undefined;
  onRequest: FilterHandler | undefined;
  onError: FilterErrorHandler | undefined;
  onFinish: FilterHandler | undefined;
}

type FilterOptions<TOptions extends {}> = Partial<TOptions> & { prefix?: string };
type FilterSpecFactory<TOptions extends {}> = (options: FilterOptions<TOptions>) => FilterSpec;
type FilterFactory<TOptions extends {}> = (options: FilterOptions<TOptions>) => Filter;

/**
 * Create a filter. If an `onRequest` or `onRoute` handler returns a response,
 * no additional `onRequest`, `onRoute`, or route handlers will be invoked.
 */
function createFilter<TOptions extends {} = {}>(spec: FilterSpecFactory<TOptions>): FilterFactory<TOptions> {
  return (options: FilterOptions<TOptions>) => {
    const { onRequest, onError = undefined, onFinish = undefined } = spec instanceof Function ? spec(options) : spec;

    return {
      prefix: options.prefix,
      onRequest: onRequest && createSelector(onRequest),
      onError,
      onFinish,
    };
  };
}

export type {
  Filter,
  FilterErrorHandler,
  FilterFactory,
  FilterHandler,
  FilterOptions,
  FilterRequestSpec,
  FilterSpec,
  FilterSpecFactory,
};
export { createFilter };
