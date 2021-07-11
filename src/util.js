const crypto = require('crypto')

function base64url (str) {
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/\=+$/, '')
}

function generateRandomString (length) {
  let result = ''
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const charactersLength = characters.length
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength))
  }
  return result
}

function generateCodeChalenge () {
  const codeVerifier = generateRandomString(128)
  const base64Digest = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64')
  return {
    code_challenge: base64url(base64Digest),
    base64Digest,
    code_verifier: codeVerifier
  }
}

module.exports = {
  base64url,
  generateRandomString,
  generateCodeChalenge
}
