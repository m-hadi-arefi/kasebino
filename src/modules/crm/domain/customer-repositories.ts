/**
 * CRM Repository Interfaces for Kasbino.
 */

import type { Customer, CustomerStatus, CustomerType } from "./customer.js";
import type { CustomerNote } from "./notes.ts";
import type { CrmTag, CustomerTagRelation } from "./tags.js";
import type {
  CustomerFollowUp,
  CustomerInteraction,
  FollowUpStatus,
} from "./interactions.js";

export type ListCustomersFilter = {
  merchantId: string;
  storeId?: string;
  search?: string;
  status?: CustomerStatus;
  customerType?: CustomerType;
  tagId?: string;
  hasDebt?: boolean;
  limit?: number;
  offset?: number;
};

export type CustomerRepository = {
  save(customer: Customer): Promise<void>;
  update(customer: Customer): Promise<void>;
  findById(id: string, merchantId: string): Promise<Customer | null>;
  findByPhone(
    merchantId: string,
    phoneNational: string,
  ): Promise<Customer | null>;
  list(filter: ListCustomersFilter): Promise<{
    items: Customer[];
    total: number;
  }>;
};

export type CrmTagRepository = {
  save(tag: CrmTag): Promise<void>;
  update(tag: CrmTag): Promise<void>;
  findById(id: string, merchantId: string): Promise<CrmTag | null>;
  listByMerchant(merchantId: string): Promise<CrmTag[]>;
  assignTag(relation: CustomerTagRelation): Promise<void>;
  removeTag(customerId: string, tagId: string): Promise<void>;
  getTagsForCustomer(customerId: string): Promise<CrmTag[]>;
  getCustomerIdsByTag(merchantId: string, tagId: string): Promise<string[]>;
};

export type CustomerNoteRepository = {
  save(note: CustomerNote): Promise<void>;
  findById(id: string, merchantId: string): Promise<CustomerNote | null>;
  listByCustomer(customerId: string, merchantId: string): Promise<CustomerNote[]>;
  delete(id: string, merchantId: string): Promise<void>;
};

export type CustomerInteractionRepository = {
  save(interaction: CustomerInteraction): Promise<void>;
  listByCustomer(
    customerId: string,
    merchantId: string,
  ): Promise<CustomerInteraction[]>;
};

export type CustomerFollowUpRepository = {
  save(followUp: CustomerFollowUp): Promise<void>;
  updateStatus(
    id: string,
    merchantId: string,
    status: FollowUpStatus,
  ): Promise<void>;
  findById(id: string, merchantId: string): Promise<CustomerFollowUp | null>;
  listByMerchant(
    merchantId: string,
    status?: FollowUpStatus,
  ): Promise<CustomerFollowUp[]>;
  listByCustomer(
    customerId: string,
    merchantId: string,
  ): Promise<CustomerFollowUp[]>;
};
