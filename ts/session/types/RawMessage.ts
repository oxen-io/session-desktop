import { SignalService } from '../../protobuf';
import { SnodeNamespaces } from '../apis/snode_api/namespaces';

export type OutgoingRawMessage = {
  identifier: string;
  plainTextBuffer: Uint8Array;
  device: string;
  ttl: number; // ttl is in millis
  networkTimestampCreated: number;
  encryption: SignalService.Envelope.Type;
  namespace: SnodeNamespaces;
};

export type StoredRawMessage = Pick<
  OutgoingRawMessage,
  'identifier' | 'device' | 'ttl' | 'networkTimestampCreated'
> & {
  plainTextBufferHex: string;
  encryption: number; // read it as number, we need to check that it is indeed a valid encryption once loaded
  namespace: number; // read it as number, we need to check that it is indeed a valid namespace once loaded
};
