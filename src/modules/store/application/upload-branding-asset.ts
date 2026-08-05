/**
 * Upload store branding assets to MinIO media bucket (ADR-111).
 */

import {
  MINIO_BUCKETS,
  ObjectValidationError,
  buildObjectKey,
  encodeFilenameMetadata,
  putValidatedObject,
  type ObjectStoragePort,
} from "../../../minio-storage/index.js";
import type { StoreRepository } from "../domain/repositories.js";
import { applyStoreBranding } from "../domain/store.js";
import type { Store } from "../domain/store.js";

export const BRANDING_ASSET_KINDS = ["logo", "icon"] as const;
export type BrandingAssetKind = (typeof BRANDING_ASSET_KINDS)[number];

export type UploadStoreBrandingAssetInput = {
  merchantId: string;
  storeId: string;
  kind: BrandingAssetKind;
  body: Uint8Array;
  contentType: string;
  filename?: string;
};

export type UploadStoreBrandingAssetResult = {
  store: Store;
  objectKey: string;
  kind: BrandingAssetKind;
};

export function createStoreAssetUseCases(deps: {
  stores: StoreRepository;
  objectStorage: ObjectStoragePort;
}) {
  async function uploadBrandingAsset(
    input: UploadStoreBrandingAssetInput,
  ): Promise<UploadStoreBrandingAssetResult> {
    const store = await deps.stores.findById(input.storeId);
    if (!store || store.merchantId !== input.merchantId) {
      throw new Error("store_not_found");
    }

    const ext =
      input.contentType === "image/png"
        ? "png"
        : input.contentType === "image/jpeg"
          ? "jpg"
          : input.contentType === "image/webp"
            ? "webp"
            : input.contentType === "image/gif"
              ? "gif"
              : "bin";
    const filename =
      input.filename?.trim() || `${input.kind}.${ext}`;
    const objectKey = buildObjectKey({
      merchantId: input.merchantId,
      storeId: input.storeId,
      kind: MINIO_BUCKETS.media,
      filename: `branding-${input.kind}-${filename.replace(/[/\\]/g, "_")}`,
    });

    try {
      await putValidatedObject(deps.objectStorage, {
        bucket: MINIO_BUCKETS.media,
        objectKey,
        body: input.body,
        contentType: input.contentType,
        metadata: encodeFilenameMetadata(filename),
      });
    } catch (err) {
      if (err instanceof ObjectValidationError) {
        throw err;
      }
      throw err;
    }

    if (input.kind === "logo" || input.kind === "icon") {
      applyStoreBranding(store, { logoObjectKey: objectKey });
      await deps.stores.update(store);
    }

    return { store, objectKey, kind: input.kind };
  }

  return { uploadBrandingAsset };
}

export type StoreAssetUseCases = ReturnType<typeof createStoreAssetUseCases>;
