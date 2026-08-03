/**
 * Light React Hook Form + Zod bridge (ADR-027).
 * Product forms import this instead of wiring resolvers ad hoc.
 */

import { zodResolver } from "@hookform/resolvers/zod";
import type { FieldValues, Resolver } from "react-hook-form";
import type { z } from "zod";

export { zodResolver };

/**
 * Create an RHF resolver from a Zod schema (shared UI ↔ API schemas).
 * Input may be strings from uncontrolled inputs; output is schema-parsed.
 */
export function createZodFormResolver<TSchema extends z.ZodType>(
  schema: TSchema,
): Resolver<FieldValues, unknown, z.output<TSchema> & FieldValues> {
  return zodResolver(
    schema as z.ZodType<z.output<TSchema>, FieldValues>,
  ) as Resolver<FieldValues, unknown, z.output<TSchema> & FieldValues>;
}
