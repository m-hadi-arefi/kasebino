/**
 * Drizzle ORM implementations of Kasbino CRM repositories.
 * Enforces strict multi-tenant isolation by merchant_id.
 */

import { and, eq, ilike, isNull, or, sql } from "drizzle-orm";
import type { DrizzleDb } from "../../../../infrastructure/database/drizzle/client.js";
import {
  crmTags,
  customerFollowUps,
  customerInteractions,
  customerNotes,
  customers,
  customerTags,
} from "../../../../infrastructure/database/schema/customers.js";
import type {
  CrmTag,
  CrmTagRepository,
  Customer,
  CustomerFollowUp,
  CustomerFollowUpRepository,
  CustomerInteraction,
  CustomerInteractionRepository,
  CustomerNote,
  CustomerNoteRepository,
  CustomerRepository,
  CustomerTagRelation,
  FollowUpStatus,
  ListCustomersFilter,
} from "../../domain/index.js";

export class DrizzleCustomerRepository implements CustomerRepository {
  constructor(private readonly db: DrizzleDb) {}

  async save(customer: Customer): Promise<void> {
    await this.db.insert(customers).values({
      id: customer.id,
      merchantId: customer.merchantId,
      storeId: customer.storeId,
      phoneNational: customer.phoneNational,
      phoneE164: customer.phoneE164,
      email: customer.email,
      displayName: customer.displayName,
      birthday: customer.birthday,
      address: customer.address,
      city: customer.city,
      postalCode: customer.postalCode,
      customerType: customer.customerType,
      status: customer.status,
      preferredContactMethod: customer.preferredContactMethod,
      notes: customer.notes,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
      deletedAt: customer.deletedAt,
    });
  }

  async update(customer: Customer): Promise<void> {
    await this.db
      .update(customers)
      .set({
        storeId: customer.storeId,
        email: customer.email,
        displayName: customer.displayName,
        birthday: customer.birthday,
        address: customer.address,
        city: customer.city,
        postalCode: customer.postalCode,
        customerType: customer.customerType,
        status: customer.status,
        preferredContactMethod: customer.preferredContactMethod,
        notes: customer.notes,
        updatedAt: customer.updatedAt,
        deletedAt: customer.deletedAt,
      })
      .where(
        and(
          eq(customers.id, customer.id),
          eq(customers.merchantId, customer.merchantId),
        ),
      );
  }

  async findById(id: string, merchantId: string): Promise<Customer | null> {
    const rows = await this.db
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.id, id),
          eq(customers.merchantId, merchantId),
          isNull(customers.deletedAt),
        ),
      )
      .limit(1);
    if (rows.length === 0) return null;
    return rows[0] as Customer;
  }

  async findByPhone(
    merchantId: string,
    phoneNational: string,
  ): Promise<Customer | null> {
    const rows = await this.db
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.merchantId, merchantId),
          eq(customers.phoneNational, phoneNational),
          isNull(customers.deletedAt),
        ),
      )
      .limit(1);
    if (rows.length === 0) return null;
    return rows[0] as Customer;
  }

  async list(filter: ListCustomersFilter): Promise<{
    items: Customer[];
    total: number;
  }> {
    const conditions = [
      eq(customers.merchantId, filter.merchantId),
      isNull(customers.deletedAt),
    ];

    if (filter.storeId) {
      conditions.push(
        or(eq(customers.storeId, filter.storeId), isNull(customers.storeId))!,
      );
    }
    if (filter.status) {
      conditions.push(eq(customers.status, filter.status));
    }
    if (filter.customerType) {
      conditions.push(eq(customers.customerType, filter.customerType));
    }
    if (filter.search) {
      const pattern = `%${filter.search.trim()}%`;
      conditions.push(
        or(
          ilike(customers.displayName, pattern),
          ilike(customers.phoneNational, pattern),
          ilike(customers.email, pattern),
        )!,
      );
    }

    const whereClause = and(...conditions);

    const countResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(customers)
      .where(whereClause);

    const total = Number(countResult[0]?.count ?? 0);

    const limit = filter.limit ?? 50;
    const offset = filter.offset ?? 0;

    const rows = await this.db
      .select()
      .from(customers)
      .where(whereClause)
      .limit(limit)
      .offset(offset);

    return { items: rows as Customer[], total };
  }
}

export class DrizzleCrmTagRepository implements CrmTagRepository {
  constructor(private readonly db: DrizzleDb) {}

  async save(tag: CrmTag): Promise<void> {
    await this.db.insert(crmTags).values({
      id: tag.id,
      merchantId: tag.merchantId,
      name: tag.name,
      color: tag.color,
      isArchived: tag.isArchived,
      createdAt: tag.createdAt,
      updatedAt: tag.updatedAt,
    });
  }

  async update(tag: CrmTag): Promise<void> {
    await this.db
      .update(crmTags)
      .set({
        name: tag.name,
        color: tag.color,
        isArchived: tag.isArchived,
        updatedAt: tag.updatedAt,
      })
      .where(
        and(
          eq(crmTags.id, tag.id),
          eq(crmTags.merchantId, tag.merchantId),
        ),
      );
  }

  async findById(id: string, merchantId: string): Promise<CrmTag | null> {
    const rows = await this.db
      .select()
      .from(crmTags)
      .where(and(eq(crmTags.id, id), eq(crmTags.merchantId, merchantId)))
      .limit(1);
    if (rows.length === 0) return null;
    return rows[0] as CrmTag;
  }

  async listByMerchant(merchantId: string): Promise<CrmTag[]> {
    const rows = await this.db
      .select()
      .from(crmTags)
      .where(
        and(eq(crmTags.merchantId, merchantId), eq(crmTags.isArchived, false)),
      );
    return rows as CrmTag[];
  }

  async assignTag(relation: CustomerTagRelation): Promise<void> {
    await this.db
      .insert(customerTags)
      .values({
        id: relation.id,
        merchantId: relation.merchantId,
        customerId: relation.customerId,
        tagId: relation.tagId,
        createdAt: relation.createdAt,
      })
      .onConflictDoNothing();
  }

  async removeTag(customerId: string, tagId: string): Promise<void> {
    await this.db
      .delete(customerTags)
      .where(
        and(
          eq(customerTags.customerId, customerId),
          eq(customerTags.tagId, tagId),
        ),
      );
  }

  async getTagsForCustomer(customerId: string): Promise<CrmTag[]> {
    const rows = await this.db
      .select({
        id: crmTags.id,
        merchantId: crmTags.merchantId,
        name: crmTags.name,
        color: crmTags.color,
        isArchived: crmTags.isArchived,
        createdAt: crmTags.createdAt,
        updatedAt: crmTags.updatedAt,
      })
      .from(customerTags)
      .innerJoin(crmTags, eq(customerTags.tagId, crmTags.id))
      .where(
        and(
          eq(customerTags.customerId, customerId),
          eq(crmTags.isArchived, false),
        ),
      );
    return rows as CrmTag[];
  }

  async getCustomerIdsByTag(merchantId: string, tagId: string): Promise<string[]> {
    const rows = await this.db
      .select({ customerId: customerTags.customerId })
      .from(customerTags)
      .where(
        and(
          eq(customerTags.merchantId, merchantId),
          eq(customerTags.tagId, tagId),
        ),
      );
    return rows.map((r) => r.customerId);
  }
}

export class DrizzleCustomerNoteRepository implements CustomerNoteRepository {
  constructor(private readonly db: DrizzleDb) {}

  async save(note: CustomerNote): Promise<void> {
    await this.db.insert(customerNotes).values({
      id: note.id,
      merchantId: note.merchantId,
      customerId: note.customerId,
      authorId: note.authorId,
      authorName: note.authorName,
      content: note.content,
      isPrivate: note.isPrivate,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      deletedAt: note.deletedAt,
    });
  }

  async findById(id: string, merchantId: string): Promise<CustomerNote | null> {
    const rows = await this.db
      .select()
      .from(customerNotes)
      .where(
        and(
          eq(customerNotes.id, id),
          eq(customerNotes.merchantId, merchantId),
          isNull(customerNotes.deletedAt),
        ),
      )
      .limit(1);
    if (rows.length === 0) return null;
    return rows[0] as CustomerNote;
  }

  async listByCustomer(
    customerId: string,
    merchantId: string,
  ): Promise<CustomerNote[]> {
    const rows = await this.db
      .select()
      .from(customerNotes)
      .where(
        and(
          eq(customerNotes.customerId, customerId),
          eq(customerNotes.merchantId, merchantId),
          isNull(customerNotes.deletedAt),
        ),
      );
    return rows as CustomerNote[];
  }

  async delete(id: string, merchantId: string): Promise<void> {
    await this.db
      .update(customerNotes)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(customerNotes.id, id),
          eq(customerNotes.merchantId, merchantId),
        ),
      );
  }
}

export class DrizzleCustomerInteractionRepository
  implements CustomerInteractionRepository
{
  constructor(private readonly db: DrizzleDb) {}

  async save(interaction: CustomerInteraction): Promise<void> {
    await this.db.insert(customerInteractions).values({
      id: interaction.id,
      merchantId: interaction.merchantId,
      customerId: interaction.customerId,
      storeId: interaction.storeId,
      staffId: interaction.staffId,
      staffName: interaction.staffName,
      type: interaction.type,
      description: interaction.description,
      interactionDate: interaction.interactionDate,
      followUpDate: interaction.followUpDate,
      createdAt: interaction.createdAt,
      updatedAt: interaction.updatedAt,
    });
  }

  async listByCustomer(
    customerId: string,
    merchantId: string,
  ): Promise<CustomerInteraction[]> {
    const rows = await this.db
      .select()
      .from(customerInteractions)
      .where(
        and(
          eq(customerInteractions.customerId, customerId),
          eq(customerInteractions.merchantId, merchantId),
        ),
      );
    return rows as CustomerInteraction[];
  }
}

export class DrizzleCustomerFollowUpRepository
  implements CustomerFollowUpRepository
{
  constructor(private readonly db: DrizzleDb) {}

  async save(followUp: CustomerFollowUp): Promise<void> {
    await this.db.insert(customerFollowUps).values({
      id: followUp.id,
      merchantId: followUp.merchantId,
      customerId: followUp.customerId,
      storeId: followUp.storeId,
      assigneeId: followUp.assigneeId,
      assigneeName: followUp.assigneeName,
      description: followUp.description,
      dueDate: followUp.dueDate,
      status: followUp.status,
      createdAt: followUp.createdAt,
      updatedAt: followUp.updatedAt,
    });
  }

  async updateStatus(
    id: string,
    merchantId: string,
    status: FollowUpStatus,
  ): Promise<void> {
    await this.db
      .update(customerFollowUps)
      .set({ status, updatedAt: new Date() })
      .where(
        and(
          eq(customerFollowUps.id, id),
          eq(customerFollowUps.merchantId, merchantId),
        ),
      );
  }

  async findById(id: string, merchantId: string): Promise<CustomerFollowUp | null> {
    const rows = await this.db
      .select()
      .from(customerFollowUps)
      .where(
        and(
          eq(customerFollowUps.id, id),
          eq(customerFollowUps.merchantId, merchantId),
        ),
      )
      .limit(1);
    if (rows.length === 0) return null;
    return rows[0] as CustomerFollowUp;
  }

  async listByMerchant(
    merchantId: string,
    status?: FollowUpStatus,
  ): Promise<CustomerFollowUp[]> {
    const conditions = [eq(customerFollowUps.merchantId, merchantId)];
    if (status) {
      conditions.push(eq(customerFollowUps.status, status));
    }
    const rows = await this.db
      .select()
      .from(customerFollowUps)
      .where(and(...conditions));
    return rows as CustomerFollowUp[];
  }

  async listByCustomer(
    customerId: string,
    merchantId: string,
  ): Promise<CustomerFollowUp[]> {
    const rows = await this.db
      .select()
      .from(customerFollowUps)
      .where(
        and(
          eq(customerFollowUps.customerId, customerId),
          eq(customerFollowUps.merchantId, merchantId),
        ),
      );
    return rows as CustomerFollowUp[];
  }
}
