import { generateKeyPair, signData, verifyData, getPublicKeyHash } from './crypto.js';

const socket = new WebSocket('wss://dezentralized-stream.onrender.com ');
const peerConnections = new Map();
const dataChannels = new Map();
let localKeyPair;
let publicKeyHash;
const MAX_PEERS = 5;

async function initKeys() {
  localKeyPair = await generateKeyPair();
  const pubKey = await crypto.subtle.exportKey('jwk', localKeyPair.publicKey);
  publicKeyHash = await getPublicKeyHash(pubKey);
}

async function streamData() {
  const data = `Stream Data: ${Date.now()}`;
  const signed = await signData(data, localKeyPair.privateKey);
  for (let [, dc] of dataChannels) {
    dc.send(JSON.stringify(signed));
  }
  appendStream(data);
}

function appendStream(data) {
  const div = document.getElementById('streamData');
  const entry = document.createElement('div');
  entry.textContent = data;
  div.appendChild(entry);
}

function createConnection(peerId) {
  const pc = new RTCPeerConnection();
  const dc = pc.createDataChannel('stream');
  dc.onopen = () => dataChannels.set(peerId, dc);
  dc.onmessage = async e => {
    const msg = JSON.parse(e.data);
    if (await verifyData(msg)) {
      appendStream(msg.data);
      relayData(msg, peerId);
    }
  };

  pc.onicecandidate = e => {
    if (e.candidate) socket.send(JSON.stringify({ id: publicKeyHash, type: 'candidate', data: e.candidate, target: peerId }));
  };

  peerConnections.set(peerId, pc);
  return { pc, dc };
}

function relayData(msg, fromId) {
  for (let [id, dc] of dataChannels) {
    if (id !== fromId && dataChannels.size <= MAX_PEERS) {
      dc.send(JSON.stringify(msg));
    }
  }
}

socket.onmessage = async ({ data }) => {
  const { type, data: msg, from } = JSON.parse(data);
  let pc = peerConnections.get(from);
  if (!pc && type === 'offer') {
    ({ pc } = createConnection(from));
    pc.setRemoteDescription(new RTCSessionDescription(msg));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.send(JSON.stringify({ id: publicKeyHash, type: 'answer', data: answer, target: from }));
  } else if (type === 'answer') {
    pc.setRemoteDescription(new RTCSessionDescription(msg));
  } else if (type === 'candidate') {
    pc.addIceCandidate(new RTCIceCandidate(msg));
  }
};

async function start() {
  await initKeys();
  setInterval(streamData, 2000);
}

document.getElementById('startStream').onclick = start;
document.getElementById('connect').onclick = () => {
  const peerId = prompt('Enter peer ID to connect:');
  const { pc } = createConnection(peerId);
  pc.createOffer().then(offer => {
    pc.setLocalDescription(offer);
    socket.send(JSON.stringify({ id: publicKeyHash, type: 'offer', data: offer, target: peerId }));
  });
};
