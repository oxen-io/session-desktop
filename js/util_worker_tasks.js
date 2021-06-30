/* global  dcodeIO, libsignal */
/* eslint-disable strict */

const functions = {
  verifyOpenGroupV2MessageSignature,
};
onmessage = async e => {
  const [jobId, fnName, ...args] = e.data;
  try {
    const fn = functions[fnName];
    if (!fn) {
      throw new Error(`Worker: job ${jobId} did not find function ${fnName}`);
    }
    const result = await fn(...args);
    postMessage([jobId, null, result]);
  } catch (error) {
    const errorForDisplay = prepareErrorForPostMessage(error);
    postMessage([jobId, errorForDisplay]);
  }
};
function prepareErrorForPostMessage(error) {
  if (!error) {
    return null;
  }
  if (error.stack) {
    return error.stack;
  }
  return error.message;
}

function fromBase64ToArrayBuffer(value) {
  return dcodeIO.ByteBuffer.wrap(value, 'base64').toArrayBuffer();
}

function fromHex(value) {
  return dcodeIO.ByteBuffer.wrap(value, 'hex').toArrayBuffer();
}

async function verifyOpenGroupV2MessageSignature(
  senderPubKeyNoPrefix,
  base64EncodedData,
  base64EncodedSignature
) {
  try {
    // Validate the message signature

    const signature = fromBase64ToArrayBuffer(base64EncodedSignature);
    const messageData = fromBase64ToArrayBuffer(base64EncodedData);
    // throws if signature failed
    await libsignal.Curve.async.verifySignature(
      fromHex(senderPubKeyNoPrefix),
      messageData,
      signature
    );
    return true;
  } catch (e) {
    console.warn('e', e);
    return false;
  }
}
