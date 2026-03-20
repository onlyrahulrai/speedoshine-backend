import { Queue } from 'bullmq';

const connection = {
  connection: {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
  },
};

export const emailQueue = new Queue('SS-EmailTask', connection);
