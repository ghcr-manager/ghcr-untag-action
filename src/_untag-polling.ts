import { listPackageVersionTagSources } from "./_package-version-tag-source.js";
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
    options.logger.debug(
      `Resolving detached package version for ${owner}/${packageName}:${tag} on attempt ${attempt}/5; expecting ${detachedDigest}`
    );
    const matches = await listPackageVersionTagSources(owner, packageName, [tag], options);
    const match = matches[0];
    if (match && match.sourceDigest !== sourceRoot.digest && match.sourceDigest === detachedDigest) {
      options.logger.debug(
        `Resolved detached package version for ${owner}/${packageName}:${tag} as version ${match.sourceVersionId} (${match.sourceDigest})`
      );
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
