export type {
  MembershipConsent,
  MembershipConsentInput,
} from "./consent.js";
export { createMembershipConsent } from "./consent.js";
export type {
  CreateStoreMembershipAggregateInput,
  StoreMembership,
} from "./store-membership.js";
export {
  applyMembershipConsent,
  createStoreMembershipAggregate,
  isMembershipActive,
  softDeleteMembership,
} from "./store-membership.js";
export {
  membershipCreatedEvent,
  membershipUpdatedEvent,
} from "./events.js";
export type { StoreMembershipRepository } from "./repositories.js";
export type {
  CompletedSaleRef,
  CrmSegment,
  MembershipEngagementStats,
  SegmentCondition,
  SegmentRule,
} from "./segments.js";
export {
  CRM_SEGMENTS,
  CRM_SEGMENT_POLICY,
  computeEngagementStats,
  computeMembershipSegment,
  daysSince,
  evaluateSegmentRule,
  isCrmSegment,
} from "./segments.js";
export type {
  Customer,
  CustomerStatus,
  CustomerType,
  PreferredContactMethod,
} from "./customer.js";
export { createCustomerAggregate, updateCustomerStatus } from "./customer.js";
export type { CustomerNote } from "./notes.js";
export { createCustomerNoteAggregate } from "./notes.js";
export type { CrmTag, CustomerTagRelation } from "./tags.js";
export { createCrmTagAggregate } from "./tags.js";
export type {
  CustomerFollowUp,
  CustomerInteraction,
  FollowUpStatus,
  InteractionType,
} from "./interactions.js";
export {
  createCustomerFollowUpAggregate,
  createCustomerInteractionAggregate,
} from "./interactions.js";
export type {
  TimelineEvent,
  TimelineEventCategory,
  TimelineEventType,
} from "./timeline.js";
export { mergeTimelineEvents } from "./timeline.js";
export type {
  CrmTagRepository,
  CustomerFollowUpRepository,
  CustomerInteractionRepository,
  CustomerNoteRepository,
  CustomerRepository,
  ListCustomersFilter,
} from "./customer-repositories.js";
