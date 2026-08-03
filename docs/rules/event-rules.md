# Event Rules

1. Persist via transactional outbox.
2. Canonical envelope required.
3. Consumers idempotent on eventId.
4. Keep payloads versioned.
5. Checkout must not fail after commit due to MQTT errors.
6. Update `event-catalog.md` when adding events.
