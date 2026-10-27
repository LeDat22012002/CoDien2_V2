/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Credential Management API (Chrome/Edge, chỉ chạy trên HTTPS hoặc localhost); lib.dom của TypeScript chưa khai báo. */
interface PasswordCredentialData {
  id: string;
  password: string;
  name?: string;
}

declare class PasswordCredential extends Credential {
  constructor(data: PasswordCredentialData);
  readonly password: string;
}

interface Window {
  PasswordCredential?: typeof PasswordCredential;
}
