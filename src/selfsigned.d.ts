declare module 'selfsigned' {
  import type forge from 'node-forge';

  interface TlsIdentityOptions {
    days?: number;
    keySize?: number;
    extensions?: any[];
    algorithm?: 'sha1' | 'sha256';
    pkcs7?: boolean;
    clientCertificate?: boolean;
    clientCertificateCN?: string;
  }

  interface TlsIdentity {
    cert: string;
    private: string;
    public: string;
    fingerprint: string;
  }

  export const generate: <TReturn = TlsIdentity>(
    attrs: forge.pki.CertificateField[],
    options: TlsIdentityOptions,
    done?: (error: unknown, identity: TlsIdentity) => TReturn,
  ) => TReturn;
}
