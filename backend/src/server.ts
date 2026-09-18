import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';

const app = createApp();

async function main() {
  await prisma.$connect();
  app.listen(env.PORT, () => {
    console.log(`General Store SaaS API listening on port ${env.PORT} [${env.NODE_ENV}]`);
  });
}

main().catch(async (err) => {
  console.error('Failed to start server', err);
  await prisma.$disconnect();
  process.exit(1);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
