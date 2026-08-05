/**
 * ADR-109 — long-running outbox worker entrypoint.
 *
 * Polls PostgreSQL transactional outbox, publishes to EMQX (mqtt.js),
 * fans out cache/notifications/warehouse consumers, runs pickup + loyalty jobs.
 *
 * Compose: `docker compose --profile worker up worker`
 * Local: `npm run worker:outbox` with DATABASE_URL + MQTT_URL.
 */

import {
  OUTBOX_POLL,
  OUTBOX_WORKER_UX_FA,
  scrubEnvelopeForLogsHint,
} from "./worker-constants.js";
import { createOutboxWorkerRuntime } from "./create-outbox-runtime.js";

const POLL_MS = Number(process.env.MOS_OUTBOX_POLL_MS ?? OUTBOX_POLL.intervalMs);
const JOB_MS = Number(process.env.MOS_SCHEDULED_JOB_MS ?? 60_000);

function logInfo(message: string, meta?: Record<string, unknown>): void {
  const line = meta ? `${message} ${JSON.stringify(meta)}` : message;
  console.info(`[outbox-worker] ${line}`);
}

async function main(): Promise<void> {
  assertWorkersShareUx();

  const runtime = createOutboxWorkerRuntime();
  logInfo("started", {
    mqttMode: runtime.mqttMode,
    pollMs: POLL_MS,
    jobMs: JOB_MS,
    locale: OUTBOX_WORKER_UX_FA.locale,
    dir: OUTBOX_WORKER_UX_FA.dir,
  });

  let stopping = false;
  const shutdown = async (signal: string) => {
    if (stopping) return;
    stopping = true;
    logInfo("shutting_down", { signal });
    clearInterval(pollTimer);
    clearInterval(jobTimer);
    await runtime.close();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  const tickOutbox = async () => {
    try {
      const result = await runtime.dispatchOnce();
      if (result.polled > 0) {
        logInfo("dispatch", {
          ...result,
          // never log envelope payloads (PII) — ADR-035
          scrub: scrubEnvelopeForLogsHint,
        });
      }
    } catch (err) {
      const text = err instanceof Error ? err.message : String(err);
      console.error(`[outbox-worker] dispatch_error ${text}`);
    }
  };

  const tickJobs = async () => {
    try {
      const results = await runtime.runAllScheduledJobs();
      for (const r of results) {
        if (r.affectedCount > 0 || r.status === "completed") {
          logInfo("scheduled_job", {
            jobName: r.jobName,
            status: r.status,
            affectedCount: r.affectedCount,
            messageFa: r.messageFa,
          });
        }
      }
    } catch (err) {
      const text = err instanceof Error ? err.message : String(err);
      console.error(`[outbox-worker] job_error ${text}`);
    }
  };

  await tickOutbox();
  await tickJobs();

  const pollTimer = setInterval(() => void tickOutbox(), POLL_MS);
  const jobTimer = setInterval(() => void tickJobs(), JOB_MS);
}

function assertWorkersShareUx(): void {
  if (OUTBOX_WORKER_UX_FA.dir !== "rtl" || OUTBOX_WORKER_UX_FA.locale !== "fa-IR") {
    throw new Error("Outbox worker UX must stay fa-IR + rtl (ADR-109).");
  }
}

main().catch((err) => {
  console.error("[outbox-worker] fatal", err);
  process.exit(1);
});
