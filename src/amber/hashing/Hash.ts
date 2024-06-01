

export const code = (text: string) => {
  let hash = 0

  if (text.length === 0) {
    return hash
  }

  for (let i = 0; i < text.length; i++) {
    const chr = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr
    hash |= 0 // Convert to 32bit integer
  }

  return hash
}

const toHex = (data: Uint8Array) => [...data].map(x => x.toString(16).padStart(2, '0')).join('')

type DataSource = ArrayBuffer|DataView|ArrayBufferView|string

const digest = async (algo: string, buffer: DataSource) => {
  if (typeof buffer === 'string') {
    buffer = new TextEncoder().encode(buffer)
  }

  return new Uint8Array(await window.crypto.subtle.digest(algo, buffer as BufferSource))
}

export const sha1 = (data: DataSource) => digest('SHA-1', data).then(toHex)
export const sha256 = (data: DataSource) => digest('SHA-256', data).then(toHex)
export const sha384 = (data: DataSource) => digest('SHA-384', data).then(toHex)
export const sha512 = (data: DataSource) => digest('SHA-512', data).then(toHex)
