import { Worker } from "bullmq";
import unirest from "unirest";

const sendOtp = async ({ contacts, otp }: { contacts: Array<number>, otp: number }) => {
    try {
        const req = unirest("GET", process.env.SMS_API_URL);

        req.query({
            "key": process.env.SMS_API_KEY,
            "campaign": process.env.SMS_API_CAMPAIGN,
            "routeid": process.env.SMS_API_ROUTEID,
            "type": process.env.SMS_API_TYPE,
            "senderid": process.env.SMS_API_SENDERID,
            "template_id": process.env.SMS_API_TEMPLATE_ID,
            "pe_id": process.env.SMS_API_PE_ID,
            "contacts": contacts,
            "msg": `OTP for login your account ${otp} and valid till 2 minutes. Do not share this OTP to anyone for security reasons. Via DigiDonar`
        });

        req.end(function (res) {

            if (res.error) throw new Error(res.error);

            console.log(res.body);
        });
    } catch (error) {
        console.log("Error: ", error)
    }
}

const worker = new Worker(
    "SS-CommonTask",
    async (job: { name: string; data: any }) => {
        console.log("----- Job Executed -----")

        if (job.name === 'send-verification-otp') {
            await sendOtp(job.data);
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
    console.log(`✅ Common task completed`);
});

worker.on("failed", (job: { data: any }, err: any) => {
    console.error(`❌ Failed to send email to ${job?.data?.to}:`, err);
});
