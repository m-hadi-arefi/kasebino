/**
 * External entity mapping aggregate + repository port (ADR-126).
 */

export type ExternalEntityMapping = {
  id: string;
  merchantId: string;
  storeId: string | null;
  entityType: string;
  entityId: string;
  provider: string;
  externalId: string;
  externalSecondaryId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ExternalEntityMappingRepository = {
  upsert(mapping: ExternalEntityMapping): Promise<void>;
  findByInternal(input: {
    merchantId: string;
    provider: string;
    entityType: string;
    entityId: string;
  }): Promise<ExternalEntityMapping | null>;
  findByExternal(input: {
    merchantId: string;
    provider: string;
    entityType: string;
    externalId: string;
  }): Promise<ExternalEntityMapping | null>;
};
