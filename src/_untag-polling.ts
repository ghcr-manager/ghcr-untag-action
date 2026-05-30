import { listPackageVersionTagSources, listPresentPackageVersionIds } from "./_package-version-tag-source.js";
import type { TagSource, UntagOptions, UntagRootSelection } from "./_types.js";

export async function resolveDetachedTagVersion(
  owner: string,
  packageName: string,
  tag: string,
  sourceRoot: UntagRootSelection,
  detachedDigest: string,
  options: UntagOptions
): Promise<TagSource> {
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const matches = await listPackageVersionTagSources(owner, packageName, [tag], options);
    const match = matches[0];
    if (match && match.sourceDigest !== sourceRoot.digest && match.sourceDigest === detachedDigest) {
      return match;
    }

    if (attempt < 5) {
      options.logger.warn(
        `Temporary package version for ${owner}/${packageName}:${tag} not visible yet; retrying lookup ${attempt}/5`
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  throw new Error(`could not find temporary package version for ${owner}/${packageName}:${tag} (${detachedDigest})`);
}

export async function assertTagRemoved(
  owner: string,
  packageName: string,
  tag: string,
  options: UntagOptions
): Promise<void> {
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const remaining = await listPackageVersionTagSources(owner, packageName, [tag], options);
    if (remaining.length === 0) {
      return;
    }

    if (attempt < 5) {
      options.logger.warn(
        `Tag ${owner}/${packageName}:${tag} is still visible after untag; retrying check ${attempt}/5`
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  throw new Error(`tag ${owner}/${packageName}:${tag} is still visible after untag`);
}

export async function assertVersionRemoved(
  owner: string,
  packageName: string,
  versionId: number,
  options: UntagOptions
): Promise<void> {
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const presentVersionIds = await listPresentPackageVersionIds(owner, packageName, [versionId], options);
    if (presentVersionIds.length === 0) {
      return;
    }

    if (attempt < 5) {
      options.logger.warn(
        `Temporary package version ${owner}/${packageName}#${versionId} is still visible after untag; retrying check ${attempt}/5`
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  throw new Error(`temporary package version ${owner}/${packageName}#${versionId} is still visible after untag`);
}
