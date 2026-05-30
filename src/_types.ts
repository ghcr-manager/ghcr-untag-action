export interface Logger {
  debug(message: string): void;
  info(message: string): void;
  warn(message: string): void;
}

export interface FetchResponseLike {
  ok: boolean;
  status: number;
  headers: Headers;
  json(): Promise<unknown>;
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<FetchResponseLike>;

export interface PackageVersionPageItem {
  id: number;
  name?: string;
  metadata?: {
    container?: {
      tags?: string[];
    };
  };
}

export interface LoadedRegistryManifest {
  digest: string;
  mediaType: string;
  rawJson: string;
}

export interface TagSource {
  tag: string;
  sourceVersionId: number;
  sourceDigest: string;
}

export interface UntagOperation {
  tag: string;
  sourceDigest: string;
  detachedVersionId: number;
  detachedDigest: string;
}

export interface UntagRootSelection {
  digest: string;
  tags: string[];
}

export interface UntagOptions {
  token: string;
  logger: Logger;
  fetchImpl?: FetchLike;
}
