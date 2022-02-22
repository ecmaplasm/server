import { Socket } from 'net';
import http from 'node:http';
import https from 'node:https';
import type tls from 'node:tls';

import { type TlsContextOptions, createTlsContext } from './tls';

interface ServerOptions extends http.ServerOptions {
  port?: number;
  hostname?: string;
  backlog?: number;
  tls?:
    | boolean
    | ((Omit<tls.SecureContextOptions, 'cert' | 'key' | 'pfx' | 'passphrase'> & tls.TlsOptions) &
        (
          | { generate?: TlsContextOptions }
          | Required<Pick<tls.SecureContextOptions, 'cert' | 'key'>>
          | (Required<Pick<tls.SecureContextOptions, 'pfx'>> & Pick<tls.SecureContextOptions, 'passphrase'>)
        ));
}

type ServerType<TOptions extends ServerOptions> = TOptions extends { tls?: false } ? http.Server : https.Server;

async function createServer<TOptions extends ServerOptions>(
  { port = 0, hostname = '0.0.0.0', backlog, tls, ...options }: TOptions,
  listener: http.RequestListener,
): Promise<ServerType<TOptions>> {
  const type = tls ? https : http;
  const generateOptions = tls === true ? {} : typeof tls === 'object' && 'generate' in tls ? tls.generate : undefined;
  const tlsContext = generateOptions ? await createTlsContext(generateOptions) : {};
  const server = type.createServer({ ...options, ...tlsContext }, listener) as ServerType<TOptions>;

  server.requestTimeout = 60_000;
  server.headersTimeout = 5_000;
  server.maxHeadersCount = 100;
  server.timeout = 5_000;
  server.keepAliveTimeout = 5_000;
  server.maxRequestsPerSocket = 500;
  server.on('connection', (socket) => {
    if (socket instanceof Socket) {
      socket.setKeepAlive(true, 1_000);
    }
  });

  return new Promise<typeof server>((resolve, reject) => {
    server.on('listening', () => resolve(server));
    server.on('error', reject);
    server.listen(port, hostname, backlog);
  });
}

export type { ServerOptions, ServerType };
export { createServer };
