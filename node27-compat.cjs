const http = require('node:http');

const originalEmit = http.Server.prototype.emit;
http.Server.prototype.emit = function patchedEmit(event, ...args) {
  if (event === 'request' && args[0] && args[0].headers) {
    if (Object.getPrototypeOf(args[0].headers) === null) {
      Object.setPrototypeOf(args[0].headers, Object.prototype);
    }
  }
  return originalEmit.apply(this, [event, ...args]);
};
