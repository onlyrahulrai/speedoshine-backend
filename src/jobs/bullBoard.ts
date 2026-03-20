import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { emailQueue } from './emailQueue';
import { commonQueue } from './commonQueue';

const serverAdapter = new ExpressAdapter();

serverAdapter.setBasePath('/admin/queues');

createBullBoard({
    queues: [
        new BullMQAdapter(emailQueue),
        new BullMQAdapter(commonQueue),
    ],
    serverAdapter: serverAdapter,
});

export { serverAdapter };
