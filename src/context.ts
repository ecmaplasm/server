import type { IncomingMessage, ServerResponse } from 'node:http';
import { type Logger, pino } from 'pino';
import { v4 as getUuid } from 'uuid';

type States = Record<symbol, any>;

const $states = Symbol('$states');
const states: States = Object.create(null);

interface ContextOptions {
  log?: Logger;
  getRequestId?: (req: IncomingMessage) => string;
}

interface Context {
  readonly [$states]: States;
  readonly log: Logger;
  readonly req: IncomingMessage;
  readonly res: ServerResponse;
  readonly isRoute: boolean;
  readonly params: Readonly<Record<string, string | undefined>>;
}

interface ContextFactory {
  createRouteContext: (
    req: IncomingMessage,
    res: ServerResponse,
    params: Record<string, string | undefined>,
  ) => Context;
  createDefaultContext: (req: IncomingMessage, res: ServerResponse) => Context;
}

type ContextGetState<TValue> = (ctx: Context) => TValue | undefined;
type ContextSetState<TValue> = (ctx: Context, value: TValue) => TValue;

/**
 * Create a state getter and setter for a value which is maintained
 * independently per-context.
 */
function createState<TValue>(): [get: ContextGetState<TValue>, set: ContextSetState<TValue>] {
  const $state = Symbol('$state');
  const set: ContextSetState<TValue> = (ctx, newValue) => (ctx[$states][$state] = newValue);
  const get: ContextGetState<TValue> = (ctx) => ctx[$states][$state];

  states[$state] = undefined;

  return [get, set];
}

function createContextFactory({ log: rootLog = pino(), getRequestId }: ContextOptions = {}): ContextFactory {
  return {
    createRouteContext: (req, res, params) => {
      return Object.freeze({
        [$states]: Object.create(states),
        log: rootLog.child({ reqId: getRequestId?.(req) ?? req.headers['x-request-id'] ?? getUuid() }),
        req,
        res,
        isRoute: true,
        params: Object.freeze({ ...params }),
      });
    },
    createDefaultContext: (req, res) => {
      return Object.freeze({
        [$states]: Object.create(states),
        log: rootLog.child({ reqId: getRequestId?.(req) ?? req.headers['x-request-id'] ?? getUuid() }),
        req,
        res,
        isRoute: false,
        params: Object.freeze({}),
      });
    },
  };
}

export type { Context, ContextFactory, ContextGetState, ContextOptions, ContextSetState };
export { createContextFactory, createState };
