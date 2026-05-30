import { buildDetachedManifestClone } from "./_manifest-detach.js";
import { deletePackageVersion } from "./_package-version-delete.js";
import { loadRegistryManifestByTag } from "./_registry-manifest-load.js";
import { putRegistryManifestForTag } from "./_registry-manifest-put.js";
import { loadRegistryPushToken } from "./_registry-token.js";
import { assertTagRemoved, assertVersionRemoved, resolveDetachedTagVersion } from "./_untag-polling.js";
import type { LoadedRegistryManifest, UntagOperation, UntagOptions, UntagRootSelection } from "./_types.js";

export async function runUntag(
  owner: string,
  packageName: string,
  requestedTags: string[],
  options: UntagOptions
): Promise<UntagOperation[]> {
  const uniqueRequestedTags = [...new Set(requestedTags)];
  if (uniqueRequestedTags.length === 0) {
    throw new Error("at least one tag is required");
  }

  const registryToken = await loadRegistryPushToken(owner, packageName, options);
  const roots = await resolveSourceTagRoots(owner, packageName, uniqueRequestedTags, registryToken, options);
  options.logger.debug(`Resolved ${roots.length} source root(s) for ${uniqueRequestedTags.length} requested tag(s)`);
  const operations: UntagOperation[] = [];
  const runtime = options.fetchImpl ? { fetchImpl: options.fetchImpl } : undefined;

  for (const root of roots) {
    for (const tag of root.tags) {
      options.logger.info(`Detaching tag ${owner}/${packageName}:${tag} from ${root.digest}`);
      const detachedManifestJson = buildDetachedManifestClone(root.manifest.rawJson, root.manifest.mediaType, {
        detachedTag: tag,
        sourceDigest: root.digest
      });
      const detachedDigest = await putRegistryManifestForTag(
        owner,
        packageName,
        tag,
        root.manifest.mediaType,
        detachedManifestJson,
        registryToken,
        options.logger,
        runtime
      );
      const detachedVersion = await resolveDetachedTagVersion(owner, packageName, tag, root, detachedDigest, options);

      await deletePackageVersion(owner, packageName, detachedVersion.sourceVersionId, options);
      await assertTagRemoved(owner, packageName, tag, options);
      await assertVersionRemoved(owner, packageName, detachedVersion.sourceVersionId, options);
      options.logger.debug(
        `Completed untag for ${owner}/${packageName}:${tag}; detached version ${detachedVersion.sourceVersionId} (${detachedDigest}) removed`
      );

      operations.push({
        tag,
        sourceDigest: root.digest,
        detachedVersionId: detachedVersion.sourceVersionId,
        detachedDigest
      });
    }
  }

  return operations;
}

export async function resolveSourceTagRoots(
  owner: string,
  packageName: string,
  tags: string[],
  registryToken: string,
  options: UntagOptions
): Promise<Array<UntagRootSelection & { manifest: LoadedRegistryManifest }>> {
  const runtime = options.fetchImpl ? { fetchImpl: options.fetchImpl } : undefined;
  const groups = new Map<string, UntagRootSelection & { manifest: LoadedRegistryManifest }>();
  const missingTags: string[] = [];

  for (const tag of tags) {
    let manifest: LoadedRegistryManifest;
    try {
      manifest = await loadRegistryManifestByTag(owner, packageName, tag, registryToken, options.logger, runtime);
    } catch (error) {
      if (_isMissingTagError(error)) {
        missingTags.push(tag);
        continue;
      }
      throw error;
    }

    const existing = groups.get(manifest.digest);
    if (existing) {
      existing.tags.push(tag);
      options.logger.debug(
        `Grouped tag ${owner}/${packageName}:${tag} under existing source digest ${manifest.digest}`
      );
      continue;
    }

    groups.set(manifest.digest, {
      digest: manifest.digest,
      tags: [tag],
      manifest
    });
    options.logger.debug(`Resolved tag ${owner}/${packageName}:${tag} to source digest ${manifest.digest}`);
  }

  if (missingTags.length > 0) {
    throw new Error(`could not resolve tag(s): ${missingTags.join(", ")}`);
  }

  return [...groups.values()];
}

function _isMissingTagError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return /status 404/.test(error.message);
}
