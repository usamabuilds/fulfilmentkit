import 'dotenv/config';
import { Queue, Worker } from 'bullmq';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

async function main() {
  // Queue name MUST be simple (no colons)
  const queueName = 'system';

  const queue = new Queue(queueName, {
    connection: { url: REDIS_URL },
  });

  const worker = new Worker(
    queueName,
    async (job) => {
      console.log('Worker processing job:', job.name, job.id, job.data);
      return { ok: true, received: job.data };
    },
    {
      connection: { url: REDIS_URL },
    },
  );

  worker.on('completed', (job, result) => {
    console.log('Job completed:', job.id, result);
  });

  worker.on('failed', (job, err) => {
    console.log('Job failed:', job?.id, err?.message);
  });

  await queue.waitUntilReady();
  await worker.waitUntilReady();

  // Job names CAN be namespaced
  const job = await queue.add('system:ping', {
    ts: new Date().toISOString(),
  });

  console.log('Job added:', job.id);

  setTimeout(async () => {
    await worker.close();
    await queue.close();
    process.exit(0);
  }, 1500);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
