const JsonSocket = require('json-socket');

/**
 * Add useful method
 */
JsonSocket.prototype.socketName = function socketName() {
  return `${this._socket.remoteAddress}:${this._socket.remotePort}`;
};

module.exports = JsonSocket;
