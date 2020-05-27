import { MessageQueueInterface } from './MessageQueueInterface';
import { ContentMessage, OpenGroupMessage } from '../messages/outgoing';
import { JobQueue } from '../utils/JobQueue';
import { PendingMessageCache } from './PendingMessageCache';


// Used for ExampleMessage
import { v4 as uuid } from 'uuid';
import { SignalService } from '../../protobuf';

const timestamp = Date.now();
const identifier = uuid();

export class ExampleMessage extends ContentMessage {
  constructor() {
    super({timestamp, identifier});
  }

  public ttl(): number {
    // throw new Error("Method not implemented.");
    return 5;
  }

  protected contentProto(): SignalService.Content {
    // throw new Error("Method not implemented.");
    console.log(`[vince] contentProto: `);

    const content = SignalService.Content.create();

    return content;
  }
}

export class MessageQueue implements MessageQueueInterface {
  private readonly jobQueues: Map<string, JobQueue> = new Map();
  private readonly cache: PendingMessageCache;

  constructor() {
    this.cache = new PendingMessageCache();
    this.processAllPending();
  }

  public sendUsingMultiDevice(user: string, message: ContentMessage) {
    // throw new Error('Method not implemented.');

    // Update from TS Globals
    const pairedDevices = window.Signal.Data.getPairedDevicesFor(user);
    const userDevices = [...pairedDevices, user];

    console.log('[vince] userDevices:', userDevices);

    // sendMessageToDevices(userDevices, message);1


  }
  public send(device: string, message: ContentMessage) {
    // throw new Error('Method not implemented.');

    // Validation; early exists?

    // TESTING
    console.log(`[vince] send: Queueing message`, message);
    this.queue(device, message);

    // call message sender

    // Want to be able to distinguish between retryable and fatal errors in the API.
    // This is what the MessageSender Add it to the queue!

    // if (shouldSendToMultiDevice) {
    //   this.sendUsingmUltiDevice(user, message)
    //   return
    // }
    //
    // sendMessageToDevices([device], message)
  }
  public sendToGroup(message: ContentMessage | OpenGroupMessage) {
    throw new Error('Method not implemented.');

    // If you see an open group message just call
    // MessageSender.sendToOpenGroup directly.
  }
  public sendSyncMessage(message: ContentMessage) {
    // PSEDUOCODE
    // if message is undefined
    //   return

    // for each of our device excluding current device:
    //     queue(device, syncMessage)
    
    // throw new Error('Method not implemented.');
  }

  public async processPending(device: string) {
    // TODO: implement

    // PSEDUDOCODE
    // messages = PendingMessageCache.getPendingMessages(device)
    // isMediumGroup = device is medium group
    // hasSession = SessionManager.hasSession(device)

    // if !isMediumGroup && !hasSession
    //     SessionManager.sendSessionRequestIfNeeded()
    //     return // Don't process any more messages

    // jobQueue = getJobQueue(device)
    // for each message:
    //     if !jobQueue.has(message.uuid)
    //         promise = jobQueue.queue(message.uuid, MessageSender.send(message))
    //         promise.then().catch() // Add or remove from pending message cache on success and failure


    // Promise shouldn't be returned; we're firing an event when processed.
    

  }
  

  private processAllPending() {
    // TODO: Get all devices which are pending here
  }

  private queue(device: string, message: ContentMessage) {
    // This should simply add to the queue. No processing

    // TODO: implement
      // PSEUDOCODE

      // if message is Session Request
      //   SessionManager.sendSessionRequest(device, message)
      // return

      // PendingMessageCache.addPendingMessage(device, message)
      // processPending(device)

    console.log(`[vince] queue: Message added to the queue`, message);
    
    // Add the item to the queue
    const queue = this.getJobQueue(device);

    const job = new Promise(resolve => {
      setTimeout(() => {
        resolve();
      }, 3000);
    });

    // tslint:disable-next-line: no-floating-promises
    queue.add(async () => job);

    // Saving offline and stuff

    // Attach to event

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
