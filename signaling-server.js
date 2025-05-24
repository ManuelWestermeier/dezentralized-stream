const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });
const peers = new Map();

wss.on('connection', (ws) => {
  let peerId;

  ws.on('message', (msg) => {
    const { id, type, data, target } = JSON.parse(msg);
    peerId = id;
    peers.set(id, ws);

    if (target && peers.has(target)) {
      peers.get(target).send(JSON.stringify({ type, data, from: id }));
    }
  });

  ws.on('close', () => {
    if (peerId) peers.delete(peerId);
  });
});

console.log('Signaling server running on ws://localhost:8080');
