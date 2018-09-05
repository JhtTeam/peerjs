var util = require('./util');
var EventEmitter = require('eventemitter3');
var Negotiator = require('./negotiator');

/**
 * Wraps the streaming interface between two Peers.
 */
function MediaConnection(peer, provider, options) {
  if (!(this instanceof MediaConnection)) return new MediaConnection(peer, provider, options);
  EventEmitter.call(this);

  this.options = util.extend({}, options);

  this.open = false;
  this.type = 'media';
  this.peer = peer;
  this.provider = provider;
  this.metadata = this.options.metadata;
  this.localStream = this.options._stream;

  this.id = this.options.connectionId || MediaConnection._idPrefix + util.randomToken();
  if (this.localStream) {
    Negotiator.startConnection(
      this,
      {_stream: this.localStream, originator: true}
    );
  }
};

util.inherits(MediaConnection, EventEmitter);

MediaConnection._idPrefix = 'mc_';

MediaConnection.prototype.addStream = function(remoteStream) {
  util.log('Receiving stream', remoteStream);

  this.remoteStream = remoteStream;
  this.emit('stream', remoteStream); // Should we call this `open`?

};

MediaConnection.prototype.handleMessage = function(message) {
  var payload = message.payload;

  switch (message.type) {
    case 'ANSWER':
      // Forward to negotiator
      Negotiator.handleSDP(message.type, this, payload.sdp);
      this.open = true;
      break;
    case 'CANDIDATE':
      Negotiator.handleCandidate(this, payload.candidate);
      break;
    default:
      util.warn('Unrecognized message type:', message.type, 'from peer:', this.peer);
      break;
  }
}

MediaConnection.prototype.answer = function(stream) {
  console.log("MediaConnection.. answer");
  console.log(stream);
  if (this.localStream) {
    util.warn('Local stream already exists on this MediaConnection. Are you answering a call twice?');
    return;
  }
  console.log("MediaConnection.. answer 1");

  this.options._payload._stream = stream;
  console.log("MediaConnection.. answer 2");
  this.localStream = stream;
  console.log("MediaConnection.. answer 3");
  Negotiator.startConnection(
    this,
    this.options._payload
  )
  console.log("MediaConnection.. answer 4");
  // Retrieve lost messages stored because PeerConnection not set up.
  var messages = this.provider._getMessages(this.id);
  console.log("MediaConnection.. answer 5");
  for (var i = 0, ii = messages.length; i < ii; i += 1) {
    this.handleMessage(messages[i]);
  }
  console.log("MediaConnection.. answer 6");
  this.open = true;
};

/**
 * Exposed functionality for users.
 */

/** Allows user to close connection. */
MediaConnection.prototype.close = function() {
  if (!this.open) {
    return;
  }
  this.open = false;
  Negotiator.cleanup(this);
  this.emit('close')
};

module.exports = MediaConnection;
