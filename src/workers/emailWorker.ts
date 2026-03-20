import { Worker } from "bullmq";
import { sendMail } from "../helper/utils/mailer";

const worker = new Worker(
  "SS-EmailTask",
  async (job: { name: string; data: any }) => {
    console.log("----- Job Executed -----")

    if (job.name === "send-email") {
      const { to, subject, html } = job.data;

      await sendMail({ to, subject, html });
    }
  },
  {
    connection: {
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT),
    },
  }
);

worker.on("completed", (job: { data: any }) => {
  console.log(`✅ Email sent to ${job.data.to}`);
});

worker.on("failed", (job: { data: any }, err: any) => {
  console.error(`❌ Failed to send email to ${job?.data?.to}:`, err);
});
