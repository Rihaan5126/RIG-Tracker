export {};
const target = new URL(
  '/api/internal/tick',
  process.env.WORKER_TARGET ?? process.env.APP_URL ?? 'http://127.0.0.1:3000',
);
const secret = process.env.WORKER_SECRET;
if (!secret || secret.length < 32)
  throw new Error(
    'Set WORKER_SECRET to at least 32 random characters in .env.local or the environment.',
  );
let stopping = false;
process.on('SIGTERM', () => {
  stopping = true;
});
process.on('SIGINT', () => {
  stopping = true;
});
async function run() {
  try {
    const response = await fetch(target, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(240000),
      redirect: 'error',
    });
    console.info(
      JSON.stringify({
        service: 'worker',
        status: response.status,
        checked_at: new Date().toISOString(),
      }),
    );
  } catch {
    console.error(
      JSON.stringify({
        service: 'worker',
        status: 'unreachable',
        checked_at: new Date().toISOString(),
      }),
    );
  }
}
console.info('RIGtracker scheduler started. Checking every 60 seconds.');
while (!stopping) {
  await run();
  if (!stopping)
    await new Promise((resolve) => {
      const timer = setTimeout(resolve, 60000);
      const stop = () => {
        clearTimeout(timer);
        resolve(undefined);
      };
      process.once('SIGTERM', stop);
      process.once('SIGINT', stop);
      setTimeout(() => {
        process.removeListener('SIGTERM', stop);
        process.removeListener('SIGINT', stop);
      }, 60100).unref();
    });
}
