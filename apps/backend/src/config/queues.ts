import { createQueue, QUEUE_NAMES } from "@humanish/shared/queues";

export const workerQueue = createQueue("worker-queue");
