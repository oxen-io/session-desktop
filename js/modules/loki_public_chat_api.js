const EventEmitter = require('events');
const nodeFetch = require('node-fetch');
const { URL, URLSearchParams } = require('url');

const GROUPCHAT_POLL_EVERY = 1000; // 1 second

class LokiPublicChatAPI extends EventEmitter {
  constructor(ourKey) {
    super();
    this.ourKey = ourKey;
    this.lastGot = {};
  }

  async pollForMessages(source, groupName, endpoint) {
    const url = new URL(endpoint);
    const params = {
      include_annotations: 1,
      count: -20,
    };
    if (this.lastGot[endpoint]) {
      params.since_id = this.lastGot[endpoint];
    }
    url.search = new URLSearchParams(params);

    let res;
    let success = true;
    try {
      res = await nodeFetch(url);
    } catch (e) {
      success = false;
    }

    const response = await res.json();
    if (response.meta.code !== 200) {
      success = false;
    }

    if (success) {
      response.data.forEach(post => {
        this.emit('publicMessage', {
          message: post.text,
        });
        this.lastGot[endpoint] = !this.lastGot[endpoint]
          ? post.id
          : Math.max(this.lastGot[endpoint], post.id);
      });
    }

    setTimeout(() => {
      this.pollForMessages(source, groupName, endpoint);
    }, GROUPCHAT_POLL_EVERY);
  }
}

module.exports = LokiPublicChatAPI;
