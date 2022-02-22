import type { ServerResponse } from 'node:http';
import { Readable } from 'node:stream';

import type { Context } from './context';
import { never } from './never';

const $response = Symbol('$response');

interface Response {
  [$response]: true;
  /**
   * Set a header. The value can be a single value or an array of values.
   * Non-string value(s) will be stringified immediately.
   */
  header: (key: string, value: any) => this;
  /**
   * Set a header, _ONLY_ if the header is not already set. The value can be a
   * single value, or an array of values. Non-string value(s) will be
   * stringified immediately.
   */
  defaultHeader: (key: string, value: any) => this;
  /**
   * Set the response status. If no status is set, then the default is 200 or
   * 204 depending on the response body.
   */
  status: (value: number) => this;
  /**
   * Set the response status to [201 (created)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/201).
   */
  created: () => this;
  /**
   * Set the response status to [204 (no content)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/204).
   */
  noContent: () => this;
  /**
   * Set the response status to [304 (not modified)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/304).
   */
  unmodified: () => this;
  /**
   * Set the response status to [400 (bad request)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/400).
   */
  badRequest: () => this;
  /**
   * Set the response status to [401 (unauthorized)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/401).
   */
  unauthorized: () => this;
  /**
   * Set the response status to [403 (forbidden)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/403).
   */
  forbidden: () => this;
  /**
   * Set the response status to [404 (not found)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/404).
   */
  notFound: () => this;
  /**
   * Set the response status to [409 (conflict)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/409).
   */
  conflict: () => this;
  /**
   * Set the response status to [429 (too many requests)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/429).
   */
  throttled: (retryAfterSeconds?: number) => this;
  /**
   * Set the response status to [500 (internal server error)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/500).
   */
  internalError: () => this;
  /**
   * Set the response status to [503 (service unavailable)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/503).
   */
  unavailable: (retryAfterSeconds?: number) => this;
  /**
   * Send a redirect response. The default status is 302, which is the HTTP 1.0
   * temporary redirect.
   */
  redirect: (location: string, status?: 301 | 302 | 303 | 307 | 308) => this;
  /**
   * Send a `Readable` stream as the response body. No default `content-length`
   * or `content-type` headers is provided.
   */
  stream: (value: Readable, contentType?: string, length?: number) => this;
  /**
   * Send a `Buffer` as the response body. A default `content-length` is
   * provided. A default `content-type` is _NOT_ provided.
   */
  buffer: (value: Buffer, contentType?: string) => this;
  /**
   * Send a `string` as the response body. A default `content-length` is
   * provided. A default `content-type` is _NOT_ provided.
   */
  text: (value: string, contentType?: string) => this;
  /**
   * Send a JSON encoded value as the response body. A default `content-length`
   * is provided, and the default `content-type` is `application/json`.
   */
  json: (value: any) => this;
  /**
   * Send the response. If only headers have been set, then the promise will
   * be resolved. If a body or status has been set, then the returned promise
   * will _NEVER_ resolve.
   */
  send: (ctx: Context) => Promise<void>;
}

/**
 * Create a response builder which can be returned from a filter or route
 * handler.
 *
 * When returned from a filter, filter processing will continue if _ONLY_
 * headers have been set. This allows filters to provide default header values.
 */
function response(): Response {
  const headers: ((res: ServerResponse) => void)[] = [];

  let status: number | undefined;
  let stream: Readable | undefined;

  const instance: Response = {
    [$response]: true,
    header: (key, value) => {
      if (value != null) {
        headers.push((res) => res.setHeader(key, value));
      }
      return instance;
    },
    defaultHeader: (key, value) => {
      if (value != null) {
        headers.push((res) => {
          if (!res.hasHeader(key)) {
            res.setHeader(key, value);
          }
        });
      }
      return instance;
    },
    status: (value) => {
      status = value;
      return instance;
    },
    created: () => instance.status(201),
    noContent: () => instance.status(204),
    unmodified: () => instance.status(304),
    badRequest: () => instance.status(400),
    unauthorized: () => instance.status(401),
    forbidden: () => instance.status(403),
    notFound: () => instance.status(404),
    conflict: () => instance.status(409),
    throttled: (retryAfterSeconds) => instance.header('retry-after', retryAfterSeconds).status(429),
    internalError: () => instance.status(500),
    unavailable: (retryAfterSeconds) => instance.header('retry-after', retryAfterSeconds).status(503),
    redirect: (location, redirectStatus = 302) => instance.header('location', location).status(redirectStatus),
    stream: (value, contentType, length) => {
      instance.header('content-type', contentType).header('content-length', length);
      stream = value;
      return instance;
    },
    buffer: (value, contentType) =>
      instance
        .header('content-type', contentType)
        .defaultHeader('content-length', value.length)
        .stream(Readable.from(value)),
    text: (value, contentType) =>
      instance
        .header('content-type', contentType)
        .defaultHeader('content-length', value.length)
        .stream(Readable.from(value)),
    json: (value) => {
      const json = JSON.stringify(value);
      return instance
        .header('content-type', 'application/json')
        .defaultHeader('content-length', json.length)
        .stream(Readable.from(json));
    },
    send: async (ctx) => {
      if (ctx.res.writableEnded) {
        return never();
      }

      if (ctx.res.headersSent) {
        ctx.res.end();
        return never();
      }

      if (status == null && stream == null) {
        return undefined;
      }

      if (status == null) {
        const contentLength = Number.parseInt(ctx.res.getHeader('content-length') as string, 10);
        status = Number.isNaN(contentLength) || contentLength > 0 ? 200 : 204;
      }

      ctx.res.writeHead(status);

      await new Promise((resolve, reject) => {
        if (ctx.req.method === 'HEAD' || stream == null) {
          ctx.res.end();
        } else {
          stream.on('error', reject);
          stream.on('end', resolve);
          stream.pipe(ctx.res);
        }
      });

      return never();
    },
  };

  return instance;
}

function isResponse(value: unknown): value is Response {
  return value !== null && typeof value === 'object' && $response in value;
}

export type { Response };
export { isResponse, response };
