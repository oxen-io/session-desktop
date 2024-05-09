const channels = {} as Record<string, any>;

export function addChannel(fnName: string, action: (...args: any) => Promise<any>) {

  channels[fnName] = action;
}

export function getChannels() {
  return channels;
}
