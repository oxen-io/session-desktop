/* eslint-disable class-methods-use-this */
/* eslint-disable no-unused-vars */
/* global log, textsecure, libloki, Signal, Whisper, ConversationController,
clearTimeout, MessageController, libsignal, StringView, window, _,
dcodeIO, Buffer, lokiSnodeAPI, TextDecoder, process */

const OriginalAppDotNetApi = require('../../js/modules/loki_app_dot_net_api.js');
const nodeFetch = require('node-fetch');

const sampleFeed =
  '<?xml version="1.0" encoding="windows-1252"?><rss version="2.0"><channel>    <title>FeedForAll Sample Feed</title></channel></rss>';

class StubAppDotNetAPI extends OriginalAppDotNetApi {
  // make a request to the server
  async serverRequest(endpoint, options = {}) {
    console.log('stubbed serverRequest with', endpoint);
    const { params = {}, method, rawBody, objBody } = options;
    if (
      endpoint === 'loki/v1/rss/messenger' ||
      endpoint === 'loki/v1/rss/loki'
    ) {
      return {
        statusCode: 200,
        response: {
          data: sampleFeed,
        },
      };
    }

    if (
      endpoint === 'loki/v1/channel/1/deletes' ||
      endpoint === 'loki/v1/channel/1/moderators' ||
      endpoint === 'channels/1/messages'
    ) {
      return {
        statusCode: 200,
        response: {
          data: [],
          meta: {
            max_id: 0,
          },
        },
      };
    }

    if (endpoint === 'channels/1') {
      let name = 'Unknown group';
      if (this.baseServerUrl.includes('/chat-dev.lokinet.org')) {
        name = 'Loki Dev Chat';
      } else if (this.baseServerUrl.includes('/chat.getsession.org')) {
        name = 'Session Public Chat';
      }
      return {
        statusCode: 200,
        response: {
          data: {
            annotations: [
              {
                type: 'net.patter-app.settings',
                value: {
                  name,
                },
              },
            ],
          },
        },
      };
    }

    const response = {
      ok: 'ok',
    };

    return {
      statusCode: 200,
      response,
    };
  }
}

module.exports = StubAppDotNetAPI;
