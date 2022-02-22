import type { Context } from './context';
import { type Response, isResponse } from './response';

type Select<TArgs extends unknown[] = [], TValue = void> = (ctx: Context, ...args: TArgs) => Promise<Response | TValue>;
type Selector<TArgs extends unknown[] = [], TValue = void> = (
  ctx: Context,
  ...args: TArgs
) => Promise<Exclude<TValue, Response> | undefined>;

function createSelector<TArgs extends unknown[], TValue>(select: Select<TArgs, TValue>): Selector<TArgs, TValue> {
  return async (ctx, ...args) => {
    const selected = await select(ctx, ...args);

    if (isResponse(selected)) {
      await selected.send(ctx);
      return undefined;
    }

    return selected as unknown as Exclude<TValue, Response>;
  };
}

export type { Select, Selector };
export { createSelector };
