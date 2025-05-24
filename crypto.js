export async function generateKeyPair() {
  return await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
  );
}

export async function signData(data, privateKey) {
  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    encoder.encode(data)
  );
  return {
    data,
    signature: Array.from(new Uint8Array(signature)),
    publicKey: await crypto.subtle.exportKey('jwk', privateKey)
  };
}

export async function verifyData({ data, signature, publicKey }) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'jwk',
    publicKey,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['verify']
  );
  return await crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new Uint8Array(signature),
    encoder.encode(data)
  );
}

export async function getPublicKeyHash(publicKey) {
  const keyBytes = new TextEncoder().encode(JSON.stringify(publicKey));
  const hashBuffer = await crypto.subtle.digest('SHA-256', keyBytes);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}
