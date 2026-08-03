import { describe, expect, it } from "vitest";

import {
  DATABASE_MODELING_REQUIREMENTS,
  SOFT_DELETE,
  TENANT_COLUMN,
} from "../database-modeling/index.js";

import {
  COVERING_INDEXES,
  FOREIGN_KEY_INDEXES,
  INDEX_AUTHORSHIP,
  INDEX_REVIEW_GATE,
  INDEXING_REQUIREMENTS,
  INDEXING_STANDARDS,
  PARTIAL_INDEXES,
  PERSIAN_TEXT_INDEXING,
  REDUNDANT_INDEXES,
  TENANT_COMPOSITE_INDEXES,
  UNIQUE_BUSINESS_KEYS,
  assertBarcodeSearchDeferred,
  assertCoveringJustified,
  assertForeignKeyIndexed,
  assertIndexPurposeDocumented,
  assertMerchantIdLeftmost,
  assertNoRedundantLeftPrefix,
  assertPersianTextIndexConsiderations,
  assertUniqueBusinessKeyTenantScoped,
} from "./index.js";

describe("ADR-044 Indexing Standards", () => {
  it("requires explicit indexes; ORM defaults are insufficient", () => {
    expect(INDEX_AUTHORSHIP.ormDefaultsInsufficient).toBe(true);
    expect(INDEX_AUTHORSHIP.explicitInDrizzleSchemaAndMigrations).toBe(true);
    expect(INDEX_AUTHORSHIP.purposeDocumentedPerIndex).toBe(true);
    expect(INDEX_AUTHORSHIP.strategyDoc).toBe(
      "docs/architecture/indexing-strategy.md",
    );
    expect(INDEXING_REQUIREMENTS.explicitIndexesNotOrmDefaultsAlone).toBe(true);
    expect(INDEXING_REQUIREMENTS.documentWhyPerIndex).toBe(true);

    expect(() =>
      assertIndexPurposeDocumented("POS barcode resolve ≤1s"),
    ).not.toThrow();
    expect(() => assertIndexPurposeDocumented("   ")).toThrow(/purpose/i);
  });

  it("requires merchant_id leftmost on tenant composites", () => {
    expect(TENANT_COMPOSITE_INDEXES.leftmostColumnSql).toBe("merchant_id");
    expect(TENANT_COMPOSITE_INDEXES.leftmostColumnSql).toBe(TENANT_COLUMN.sql);
    expect(TENANT_COMPOSITE_INDEXES.requiredOnTenantTables).toBe(true);
    expect(
      INDEXING_REQUIREMENTS.merchantIdLeftmostOnTenantComposites,
    ).toBe(true);

    expect(() =>
      assertMerchantIdLeftmost(["merchant_id", "barcode"]),
    ).not.toThrow();
    expect(() => assertMerchantIdLeftmost(["barcode", "merchant_id"])).toThrow(
      /merchant_id/i,
    );
    expect(() => assertMerchantIdLeftmost([])).toThrow(/include columns/i);
  });

  it("requires FK columns indexed when used in joins/cascades", () => {
    expect(FOREIGN_KEY_INDEXES.indexEveryFkUsedInJoinsOrCascades).toBe(true);
    expect(INDEXING_REQUIREMENTS.foreignKeysIndexedWhenJoined).toBe(true);

    expect(() => assertForeignKeyIndexed(true, true)).not.toThrow();
    expect(() => assertForeignKeyIndexed(false, false)).not.toThrow();
    expect(() => assertForeignKeyIndexed(true, false)).toThrow(/FK columns/i);
  });

  it("requires tenant-scoped unique business keys with soft-delete partials", () => {
    expect(UNIQUE_BUSINESS_KEYS.mustIncludeMerchantId).toBe(true);
    expect(UNIQUE_BUSINESS_KEYS.softDeletePartialPredicate).toBe(
      "deleted_at IS NULL",
    );
    expect(UNIQUE_BUSINESS_KEYS.softDeletePartialRequiredWhenSoftDelete).toBe(
      true,
    );
    expect(UNIQUE_BUSINESS_KEYS.forbidGlobalUniqueOnPhone).toBe(true);
    expect(SOFT_DELETE.partialUniquesWhenSoftDelete).toBe(true);
    expect(INDEXING_REQUIREMENTS.uniqueBusinessKeysTenantScoped).toBe(true);
    expect(INDEXING_REQUIREMENTS.softDeleteAwarePartialUniques).toBe(true);
    expect(PARTIAL_INDEXES.softDeleteAware).toBe(true);
    expect(PARTIAL_INDEXES.defaultActivePredicate).toBe("deleted_at IS NULL");

    expect(() =>
      assertUniqueBusinessKeyTenantScoped(
        ["merchant_id", "phone"],
        true,
        "deleted_at IS NULL",
      ),
    ).not.toThrow();
    expect(() =>
      assertUniqueBusinessKeyTenantScoped(
        ["merchant_id", "barcode"],
        true,
        "barcode IS NOT NULL AND deleted_at IS NULL",
      ),
    ).not.toThrow();
    expect(() =>
      assertUniqueBusinessKeyTenantScoped(["phone"], false, null),
    ).toThrow(/merchant_id/i);
    expect(() =>
      assertUniqueBusinessKeyTenantScoped(
        ["merchant_id", "phone"],
        true,
        null,
      ),
    ).toThrow(/deleted_at IS NULL/i);
  });

  it("forbids redundant left-prefix indexes", () => {
    expect(REDUNDANT_INDEXES.forbidLeftPrefixDuplicates).toBe(true);
    expect(INDEXING_REQUIREMENTS.noRedundantLeftPrefixIndexes).toBe(true);

    expect(() =>
      assertNoRedundantLeftPrefix(
        ["merchant_id", "store_id", "created_at"],
        ["merchant_id", "store_id", "created_at"],
      ),
    ).not.toThrow();
    expect(() =>
      assertNoRedundantLeftPrefix(
        ["merchant_id", "created_at"],
        ["merchant_id", "store_id", "created_at"],
      ),
    ).not.toThrow();
    expect(() =>
      assertNoRedundantLeftPrefix(
        ["merchant_id"],
        ["merchant_id", "created_at"],
      ),
    ).toThrow(/Redundant left-prefix/i);
  });

  it("allows covering INCLUDE only when justified and documented", () => {
    expect(COVERING_INDEXES.allowedWhenJustified).toBe(true);
    expect(COVERING_INDEXES.requireJustification).toBe(true);
    expect(INDEXING_REQUIREMENTS.coveringOnlyWhenJustified).toBe(true);

    expect(() => assertCoveringJustified(false, false, false)).not.toThrow();
    expect(() => assertCoveringJustified(true, true, true)).not.toThrow();
    expect(() => assertCoveringJustified(true, false, true)).toThrow(
      /justification/i,
    );
    expect(() => assertCoveringJustified(true, true, false)).toThrow(
      /document why/i,
    );
  });

  it("notes Persian UTF-8 index considerations and defers barcode/search to ADR-050", () => {
    expect(PERSIAN_TEXT_INDEXING.encoding).toBe("UTF8");
    expect(PERSIAN_TEXT_INDEXING.supportsPersianText).toBe(true);
    expect(PERSIAN_TEXT_INDEXING.asciiOnlyCollationsForbidden).toBe(true);
    expect(PERSIAN_TEXT_INDEXING.avoidCaseFoldingThatBreaksPersian).toBe(true);
    expect(PERSIAN_TEXT_INDEXING.searchPlansConsiderPersian).toBe(true);
    expect(PERSIAN_TEXT_INDEXING.barcodeAndFuzzySearchDeferredAdr).toBe(
      "ADR-050",
    );
    expect(INDEXING_REQUIREMENTS.persianUtf8TextIndexConsiderations).toBe(true);
    expect(INDEXING_REQUIREMENTS.barcodeSearchDeferredAdr).toBe("ADR-050");
    expect(INDEXING_REQUIREMENTS.queryDesignDeferredAdr).toBe("ADR-045");

    expect(() =>
      assertPersianTextIndexConsiderations("UTF8", false),
    ).not.toThrow();
    expect(() =>
      assertPersianTextIndexConsiderations("LATIN1", false),
    ).toThrow(/UTF-8/i);
    expect(() =>
      assertPersianTextIndexConsiderations("UTF8", true),
    ).toThrow(/ASCII-only/i);
    expect(() => assertBarcodeSearchDeferred("ADR-050")).not.toThrow();
    expect(() => assertBarcodeSearchDeferred("ADR-044")).toThrow(/ADR-050/i);
  });

  it("keeps this ADR contract-only and aligns with ADR-043 indexing deferral", () => {
    expect(INDEXING_REQUIREMENTS.noConcreteIndexDdlInThisAdr).toBe(true);
    expect(INDEXING_REQUIREMENTS.alignsWithModelingIndexingDeferral).toBe(true);
    expect(DATABASE_MODELING_REQUIREMENTS.indexingDeferredAdr).toBe("ADR-044");
    expect(INDEX_REVIEW_GATE.explainHotPathsInStaging).toBe(true);
    expect(INDEX_REVIEW_GATE.ardMustListPurposeQuerySelectivity).toBe(true);
    expect(INDEXING_STANDARDS.alignsWith.tenantColumnSql).toBe("merchant_id");
    expect(INDEXING_STANDARDS.alignsWith.softDeleteColumn).toBe("deleted_at");
    expect(INDEXING_STANDARDS.alignsWith.modelingIndexingDeferral).toBe(
      "ADR-044",
    );
  });
});
