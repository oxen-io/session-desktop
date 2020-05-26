import { MessageQueueInterface } from './MessageQueueInterface';
import { ContentMessage, OpenGroupMessage } from '../messages/outgoing';
import { JobQueue } from '../utils/JobQueue';
import { PendingMessageCache } from './PendingMessageCache';

export class MessageQueue implements MessageQueueInterface {
  private readonly jobQueues: Map<string, JobQueue> = new Map();
  private readonly cache: PendingMessageCache;

  constructor() {
    this.cache = new PendingMessageCache();
    this.processAllPending();
  }

  public sendUsingMultiDevice(user: string, message: ContentMessage) {
    throw new Error('Method not implemented.');
  }
  // public send(device: string, message: ContentMessage) {
  // Changed message type for testing
  public send(device: string, message: any) {
    // throw new Error('Method not implemented.');

    // Validation; early exists?

    // TESTING
    this.queue(device, message);

    // Add it to the queue!
  }
  public sendToGroup(message: ContentMessage | OpenGroupMessage) {
    throw new Error('Method not implemented.');

    // If you see an open group message just call
    // MessageSender.sendToOpenGroup directly.
  }
  public sendSyncMessage(message: ContentMessagWWe) {
    throw new Error('Method not implemented.');
  }

  public async processPending(device: string) {
    // TODO: implement
  }

  private processAllPending() {
    // TODO: Get all devices which are pending here
  }

  private queue(device: string, message: ContentMessage) {
    // TODO: implement

    // Add the item to the queue
    const pubKey = window.textsecure.storage.user.getNumber();

    const queue = this.getJobQueue(pubKey);

    const job = new Promise(resolve => {
      setTimeout(() => {
        console.log('[vince] FINISHED!!:');
        resolve();
      }, 8000);
    });

    // tslint:disable-next-line: no-floating-promises
    queue.add(async () => job);


    
  }

  private queueOpenGroupMessage(message: OpenGroupMessage) {
    // TODO: Do we need to queue open group messages?
    // If so we can get open group job queue and add the send job here
  }

  private getJobQueue(device: string): JobQueue {
    let queue = this.jobQueues.get(device);
    if (!queue) {
      queue = new JobQueue();
      this.jobQueues.set(device, queue);
    }

    return queue;
  }
}
