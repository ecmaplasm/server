import type { pki } from 'node-forge';
import selfsigned, { type TlsIdentity } from 'selfsigned';

interface TlsContextOptions extends selfsigned.TlsIdentityOptions {
  attributes?: pki.CertificateField[];
}

interface TlsContext {
  cert: string;
  key: string;
}

async function createTlsContext({ attributes, ...options }: TlsContextOptions): Promise<TlsContext> {
  const identity = await new Promise<TlsIdentity>((resolve, reject) =>
    selfsigned.generate(
      attributes ?? [{ name: 'commonName', value: 'localhost' }],
      {
        algorithm: 'sha256',
        days: 365,
        keySize: 2048,
        extensions: [
          {
            name: 'basicConstraints',
            cA: true,
          },
          {
            name: 'keyUsage',
            keyCertSign: true,
            digitalSignature: true,
            nonRepudiation: true,
            keyEncipherment: true,
            dataEncipherment: true,
          },
          {
            name: 'extKeyUsage',
            serverAuth: true,
            clientAuth: true,
            codeSigning: true,
            timeStamping: true,
          },
          {
            name: 'subjectAltName',
            altNames: [
              {
                // type 2 is DNS
                type: 2,
                value: 'localhost',
              },
              {
                type: 2,
                value: 'localhost.localdomain',
              },
              {
                type: 2,
                value: 'lvh.me',
              },
              {
                type: 2,
                value: '*.lvh.me',
              },
              {
                type: 2,
                value: '[::1]',
              },
              {
                // type 7 is IP
                type: 7,
                ip: '127.0.0.1',
              },
              {
                type: 7,
                ip: 'fe80::1',
              },
            ],
          },
        ],
        ...options,
      },
      (error, result) => {
        if (error != null) {
          reject(error);
        } else {
          resolve(result);
        }
      },
    ),
  );

  return { cert: identity.cert, key: identity.private };
}

export type { TlsContext, TlsContextOptions };
export { createTlsContext };
