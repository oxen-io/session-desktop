/* global textsecure */
const https = require('https');
const EventEmitter = require('events');
const natUpnp = require('nat-upnp');
const nodeFetch = require('node-fetch');

const STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  INTERNAL_SERVER_ERROR: 500,
};

const GROUPCHAT_POLL_EVERY = 5 * 1000;

let lastGot = null;
// const haveIds = {};
// set up group chat polling
async function pollForMessages(lokiServer) {
  // our key?
  let params = '?include_annotations=1&count=-20';
  if (lastGot !== null) {
    params += `&since_id=${lastGot}`;
  }
  const res = await nodeFetch(
    // `https://chat.lokinet.org/posts/stream/global${params}`
    `https://chat.lokinet.org/channels/1/messages${params}`
  );
  const response = await res.json();
  if (response.meta.code !== 200) {
    /*
    console.error(
      'error reading chat server',
      response.meta.code,
      response
    );
    */
    return;
  }
  const revChono = response.data.reverse();
  for (let i = 0; i < revChono.length; i += 1) {
    const post = revChono[i];
    // console.log('downloaded', post)
    let from = post.user.username;

    // let id = post.id
    // console.log('created_at', post.created_at)
    // Set some sensible defaults
    const createdAtTimestamp = new Date(post.created_at).getTime();
    let timestamp = createdAtTimestamp;
    const group = 'lokiPublicChat';
    if (post.annotations.length) {
      const noteValue = post.annotations[0].value;
      ({ from, timestamp } = noteValue);
      // from = noteValue.from;
      // id = noteValue.id;
      // timestamp = noteValue.timestamp;
      // by not hard coding the group, we'll allowing the backend to create new groups
      // should be tied to channel any ways
      // group = noteValue.group;
    }
    // if (haveIds[post.id] === undefined) {
    lokiServer.emit('publicMessage', {
      message: {
        // id: id,
        created_at: createdAtTimestamp,
        body: `${post.created_at} ${post.user.username}: ${post.text}`,
        from,
        // FIXME: multiple group support
        // the incoming channel should handle this...
        group,
        timestamp,
      },
      // onSuccess: () => sendResponse(STATUS.OK),
      // onFailure: () => sendResponse(STATUS.NOT_FOUND),
    });
    // haveIds[post.id] = true;
    lastGot = Math.max(lastGot, post.id);
    // console.log('lastGot', lastGot)
    // }
  }
  function quickRunAgain() {
    pollForMessages(lokiServer);
  }
  setTimeout(quickRunAgain, GROUPCHAT_POLL_EVERY);
}

class LocalLokiServer extends EventEmitter {
  /**
   * Creates an instance of LocalLokiServer.
   * Sends out a `message` event when a new message is received.
   */
  constructor(pems, options = {}) {
    super();
    const httpsOptions = {
      key: pems.private,
      cert: pems.cert,
    };
    if (!options.skipUpnp) {
      this.upnpClient = natUpnp.createClient();
    }

    // start group chat polling
    // how do we know what channels to check? registration should set this...
    pollForMessages(this);

    this.server = https.createServer(httpsOptions, (req, res) => {
      let body = [];

      const sendResponse = (statusCode, message = null) => {
        const headers = message && {
          'Content-Type': 'text/plain',
        };
        res.writeHead(statusCode, headers);
        res.end(message);
      };

      if (req.method !== 'POST') {
        sendResponse(STATUS.METHOD_NOT_ALLOWED);
        return;
      }

      // Check endpoints
      req
        .on('error', () => {
          // Internal server error
          sendResponse(STATUS.INTERNAL_SERVER_ERROR);
        })
        .on('data', chunk => {
          body.push(chunk);
        })
        .on('end', () => {
          try {
            body = Buffer.concat(body).toString();
          } catch (e) {
            // Internal server error: failed to convert body to string
            sendResponse(STATUS.INTERNAL_SERVER_ERROR);
          }

          // Check endpoints here
          if (req.url === '/storage_rpc/v1') {
            try {
              const bodyObject = JSON.parse(body);
              if (bodyObject.method !== 'store') {
                sendResponse(STATUS.NOT_FOUND, 'Invalid endpoint!');
                return;
              }
              this.emit('p2pMessage', {
                message: bodyObject.params.data,
                onSuccess: () => sendResponse(STATUS.OK),
                onFailure: () => sendResponse(STATUS.NOT_FOUND),
              });
            } catch (e) {
              // Bad Request: Failed to decode json
              sendResponse(STATUS.BAD_REQUEST, 'Failed to decode JSON');
            }
          } else {
            sendResponse(STATUS.NOT_FOUND, 'Invalid endpoint!');
          }
        });
    });
  }

  async start(port, ip) {
    // Close the old server
    await this.close();

    // Start a listening on new server
    return new Promise((res, rej) => {
      this.server.listen(port, ip, async err => {
        if (err) {
          rej(err);
        } else if (this.upnpClient) {
          try {
            const publicPort = await this.punchHole();
            res(publicPort);
          } catch (e) {
            if (e instanceof textsecure.HolePunchingError) {
              await this.close();
            }
            rej(e);
          }
        } else {
          res(port);
        }
      });
    });
  }

  async punchHole() {
    const privatePort = this.server.address().port;
    const portStart = 22100;
    const portEnd = 22200;
    const ttl = 60 * 15; // renew upnp every 15 minutes
    const publicPortsInUse = await new Promise((resolve, reject) => {
      this.upnpClient.getMappings({ local: true }, (err, results) => {
        if (err) {
          // We assume an error here means upnp not enabled
          reject(
            new textsecure.HolePunchingError(
              'Could not get mapping from upnp. Upnp not available?',
              err
            )
          );
        } else {
          // remove the current private port from the current mapping
          // to allow reusing that port.
          resolve(
            results
              .filter(entry => entry.private.port !== privatePort)
              .map(entry => entry.public.port)
          );
        }
      });
    });

    for (let publicPort = portStart; publicPort <= portEnd; publicPort += 1) {
      if (publicPortsInUse.includes(publicPort)) {
        // eslint-disable-next-line no-continue
        continue;
      }
      const p = new Promise((resolve, reject) => {
        this.upnpClient.portMapping(
          {
            public: publicPort,
            private: privatePort,
            ttl,
          },
          err => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
      try {
        // eslint-disable-next-line no-await-in-loop
        await p;
        this.publicPort = publicPort;
        this.timerHandler = setTimeout(async () => {
          try {
            this.publicPort = await this.punchHole();
          } catch (e) {
            this.close();
          }
        }, ttl * 1000);
        return publicPort;
      } catch (e) {
        throw new textsecure.HolePunchingError(
          'Could not punch hole. Disabled upnp?',
          e
        );
      }
    }
    const e = new Error();
    throw new textsecure.HolePunchingError(
      `Could not punch hole: no available port. Public ports: ${portStart}-${portEnd}`,
      e
    );
  }
  // Async wrapper for http server close
  close() {
    clearInterval(this.timerHandler);
    if (this.upnpClient) {
      this.upnpClient.portUnmapping({
        public: this.publicPort,
      });
      this.publicPort = null;
    }
    if (this.server) {
      return new Promise(res => {
        this.server.close(() => res());
      });
    }

    return Promise.resolve();
  }

  getPort() {
    if (this.server.listening) {
      return this.server.address().port;
    }

    return null;
  }

  getPublicPort() {
    return this.publicPort;
  }

  isListening() {
    return this.server.listening;
  }
}

module.exports = LocalLokiServer;
