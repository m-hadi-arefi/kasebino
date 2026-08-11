/**
 * In-memory CRM repository implementations for CI / unit testing.
 */

import type {
  CrmTag,
  Customer,
  CustomerFollowUp,
  CustomerInteraction,
  CustomerNote,
  CustomerTagRelation,
  CrmTagRepository,
  CustomerFollowUpRepository,
  CustomerInteractionRepository,
  CustomerNoteRepository,
  CustomerRepository,
  FollowUpStatus,
  ListCustomersFilter,
} from "../../domain/index.js";

export class InMemoryCustomerRepository implements CustomerRepository {
  private readonly items = new Map<string, Customer>();

  async save(customer: Customer): Promise<void> {
    this.items.set(customer.id, { ...customer });
  }

  async update(customer: Customer): Promise<void> {
    this.items.set(customer.id, { ...customer });
  }

  async findById(id: string, merchantId: string): Promise<Customer | null> {
    const item = this.items.get(id);
    if (!item || item.merchantId !== merchantId) return null;
    return { ...item };
  }

  async findByPhone(
    merchantId: string,
    phoneNational: string,
  ): Promise<Customer | null> {
    for (const item of this.items.values()) {
      if (
        item.merchantId === merchantId &&
        item.phoneNational === phoneNational &&
        item.deletedAt === null
      ) {
        return { ...item };
      }
    }
    return null;
  }

  async list(filter: ListCustomersFilter): Promise<{
    items: Customer[];
    total: number;
  }> {
    let result = Array.from(this.items.values()).filter(
      (c) => c.merchantId === filter.merchantId && c.deletedAt === null,
    );

    if (filter.storeId) {
      result = result.filter(
        (c) => c.storeId === filter.storeId || c.storeId === null,
      );
    }

    if (filter.status) {
      result = result.filter((c) => c.status === filter.status);
    }

    if (filter.customerType) {
      result = result.filter((c) => c.customerType === filter.customerType);
    }

    if (filter.search) {
      const query = filter.search.trim().toLowerCase();
      result = result.filter(
        (c) =>
          c.displayName.toLowerCase().includes(query) ||
          c.phoneNational.includes(query) ||
          (c.email && c.email.toLowerCase().includes(query)),
      );
    }

    const total = result.length;
    const offset = filter.offset ?? 0;
    const limit = filter.limit ?? 50;
    const items = result.slice(offset, offset + limit).map((c) => ({ ...c }));

    return { items, total };
  }
}

export class InMemoryCrmTagRepository implements CrmTagRepository {
  private readonly tags = new Map<string, CrmTag>();
  private readonly relations = new Map<string, CustomerTagRelation>();

  async save(tag: CrmTag): Promise<void> {
    this.tags.set(tag.id, { ...tag });
  }

  async update(tag: CrmTag): Promise<void> {
    this.tags.set(tag.id, { ...tag });
  }

  async findById(id: string, merchantId: string): Promise<CrmTag | null> {
    const item = this.tags.get(id);
    if (!item || item.merchantId !== merchantId) return null;
    return { ...item };
  }

  async listByMerchant(merchantId: string): Promise<CrmTag[]> {
    return Array.from(this.tags.values()).filter(
      (t) => t.merchantId === merchantId && !t.isArchived,
    );
  }

  async assignTag(relation: CustomerTagRelation): Promise<void> {
    this.relations.set(`${relation.customerId}:${relation.tagId}`, {
      ...relation,
    });
  }

  async removeTag(customerId: string, tagId: string): Promise<void> {
    this.relations.delete(`${customerId}:${tagId}`);
  }

  async getTagsForCustomer(customerId: string): Promise<CrmTag[]> {
    const tagIds = Array.from(this.relations.values())
      .filter((r) => r.customerId === customerId)
      .map((r) => r.tagId);
    return tagIds
      .map((id) => this.tags.get(id))
      .filter((t): t is CrmTag => t !== undefined && !t.isArchived);
  }

  async getCustomerIdsByTag(merchantId: string, tagId: string): Promise<string[]> {
    return Array.from(this.relations.values())
      .filter((r) => r.merchantId === merchantId && r.tagId === tagId)
      .map((r) => r.customerId);
  }
}

export class InMemoryCustomerNoteRepository implements CustomerNoteRepository {
  private readonly notes = new Map<string, CustomerNote>();

  async save(note: CustomerNote): Promise<void> {
    this.notes.set(note.id, { ...note });
  }

  async findById(id: string, merchantId: string): Promise<CustomerNote | null> {
    const item = this.notes.get(id);
    if (!item || item.merchantId !== merchantId || item.deletedAt !== null) {
      return null;
    }
    return { ...item };
  }

  async listByCustomer(
    customerId: string,
    merchantId: string,
  ): Promise<CustomerNote[]> {
    return Array.from(this.notes.values())
      .filter(
        (n) =>
          n.customerId === customerId &&
          n.merchantId === merchantId &&
          n.deletedAt === null,
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async delete(id: string, merchantId: string): Promise<void> {
    const item = this.notes.get(id);
    if (item && item.merchantId === merchantId) {
      item.deletedAt = new Date();
      this.notes.set(id, item);
    }
  }
}

export class InMemoryCustomerInteractionRepository
  implements CustomerInteractionRepository
{
  private readonly interactions = new Map<string, CustomerInteraction>();

  async save(interaction: CustomerInteraction): Promise<void> {
    this.interactions.set(interaction.id, { ...interaction });
  }

  async listByCustomer(
    customerId: string,
    merchantId: string,
  ): Promise<CustomerInteraction[]> {
    return Array.from(this.interactions.values())
      .filter((i) => i.customerId === customerId && i.merchantId === merchantId)
      .sort((a, b) => b.interactionDate.getTime() - a.interactionDate.getTime());
  }
}

export class InMemoryCustomerFollowUpRepository
  implements CustomerFollowUpRepository
{
  private readonly followUps = new Map<string, CustomerFollowUp>();

  async save(followUp: CustomerFollowUp): Promise<void> {
    this.followUps.set(followUp.id, { ...followUp });
  }

  async updateStatus(
    id: string,
    merchantId: string,
    status: FollowUpStatus,
  ): Promise<void> {
    const item = this.followUps.get(id);
    if (item && item.merchantId === merchantId) {
      item.status = status;
      item.updatedAt = new Date();
      this.followUps.set(id, item);
    }
  }

  async findById(id: string, merchantId: string): Promise<CustomerFollowUp | null> {
    const item = this.followUps.get(id);
    if (!item || item.merchantId !== merchantId) return null;
    return { ...item };
  }

  async listByMerchant(
    merchantId: string,
    status?: FollowUpStatus,
  ): Promise<CustomerFollowUp[]> {
    return Array.from(this.followUps.values())
      .filter((f) => {
        if (f.merchantId !== merchantId) return false;
        if (status && f.status !== status) return false;
        return true;
      })
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }

  async listByCustomer(
    customerId: string,
    merchantId: string,
  ): Promise<CustomerFollowUp[]> {
    return Array.from(this.followUps.values())
      .filter((f) => f.customerId === customerId && f.merchantId === merchantId)
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }
}
