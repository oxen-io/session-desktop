import { PendingMessageCache } from '../../../../session/sending';
import { OutgoingRawMessage } from '../../../../session/types';

export class PendingMessageCacheStub extends PendingMessageCache {
  public dbData: Array<OutgoingRawMessage>;
  constructor(dbData: Array<OutgoingRawMessage> = []) {
    super();
    this.dbData = dbData;
  }

  public getCache(): Readonly<Array<OutgoingRawMessage>> {
    return this.cache;
  }

  protected async getFromStorage() {
    return this.dbData;
  }

  // eslint-disable-next-line  no-empty-function
  protected async saveToDB() {}
}
