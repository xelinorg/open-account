const crypto = require('crypto')

const bcrypt = require('bcryptjs')
const nanoid = require('nanoid')

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

function idFactory (ctx) {
  console.log('idFactory', ctx)
  return nanoid.nanoid()
}

function secretFactory (ctx) {
  return base64url.encodeBuffer(
    crypto.randomBytes(64)
  ) // 512 base64url random bits
}

async function saltpass (nosaltpass) {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(nosaltpass, salt)
}

function matchpass (plain, salted) {
  return bcrypt.compare(plain, salted)
}

function handleCORS (req, res, next) {
  const hh = {
    accessControlRequestHeaders: 'Access-Control-Request-Headers',
    accessControlAllowHeaders: 'Access-Control-Allow-Headers',
    accessControlRequestMethod: 'Access-Control-Request-Method',
    accessControlAllowMethod: 'Access-Control-Allow-Method',
    origin: 'Origin',
    accessControlAllowOrigin: 'Access-Control-Allow-Origin'
  }
  const handledCORS = {
    [hh.accessControlRequestHeaders]: res => [
      hh.accessControlAllowHeaders,
      req.headers[hh.accessControlRequestHeaders.toLowerCase()]],
    [hh.accessControlRequestMethod]: req => [
      hh.accessControlAllowMethod,
      req.headers[hh.accessControlRequestMethod.toLowerCase()]],
    [hh.origin]: req => [
      hh.accessControlAllowOrigin,
      req.headers[hh.origin.toLowerCase()]]
  }
  Object
    .keys(req.headers)
    .reduce((acc, cur) => {
      const fidx = Object.values(hh).map(h => h.toLowerCase()).indexOf(cur)
      const handler = handledCORS[hh[Object.keys(hh)[fidx]]]
      if (handler) {
        acc.push(handler(req))
      }
      return acc
    }, [])
    .forEach(h => res.setHeader(h[0], h[1]))

  if (req.method.toUpperCase() === 'OPTIONS') {
    res.end()
  }
  return next(null)
}

const b64favicon = 'AAABAAIAEBAAAAEAIABoBAAAJgAAABAQAgABAAEAsAAAAI4EAAAoAAAAE' +
  'AAAACAAAAABACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMDPQAAAAAAAAAAA' +
  'AAAAAATk1OBFdYV0l0dHS3hoeG3paWlt2Sk5KEf3x/AQAAAAAAAAAAAAAAAAAAAAAMDPQAAAA' +
  'AAAwM8xwMDPFDTE4THllZWbVsbGz/ent6toCAgG6Tk5OKsrKy/5ycnHMAAAAAAAAAAAAAAAAM' +
  'DPQAAAAAAAwM9BoMDPTGDAzx8TY2jdRaW1LdXl9dTAAAAAIAAAAAAAAAAKampsGwsLCqAAAAA' +
  'AAAAAAAAAAAAAAAAAwM9BcMDPTBDAz0/wwM8/8QEOf/GxvKXwAAAAAAAAAAAAAAAAAAAACtra' +
  '3lrKusmgAAAAAAAAAAAAAAAAwM9AAMDPRjDAz0/wwM9P8MDPP/Cwv0/wsL9KwEC/sIAAAAAAA' +
  'AAACOj455srKy/4KDgj0AAAAAAAAAAAAAAAAAAAAADAz0AgwM9H4MDPT9DAzz/wwM87sACP8Q' +
  '/xcABKA4Nwd3hIRYnp6e95mZmZwAAAAAycrJAAAAAAAAAAAADAz0AAAAAAAAAAAADAz0cQwM8' +
  '8AACf8R6hUFRdsUFbXXGRm6n21s742VlaZXWFcLAAAAABscGwAAAAAAAAAAAAAAAAAMDPQAAA' +
  'AAAAwM9AIAC/8K5xUIGdsUFcrbFBX/2xUV/9QdHc6sOzodAAAAAGdoZwAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAANEYGCraFRXc3BQU/9sVFf/cFBTO3RQUHAAAAAAAAAAAAAAA' +
  'ACSYJAAAAAAAAAAAAAAAAAAAAAAAKisqAAA2MwBPSEhcnzEx8NkWFu3cFRXm2xUVeAAAAAAAA' +
  'AAAAAAAAAAAAAAklCQAAAAAAAAAAAAAAAAAAAAAAAAAAAAzNDMdSk1M81lRUZvPGhk82xUVNA' +
  'AAAAAAAAAAJJUjMySWJHokliRGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOjs6lUlKSto+QT8' +
  'eAAAAAAAAAAAjliRAI5Yj2yOVI/IklSTvJJUkOwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADo7' +
  'OuZDREOHAAAAAF1eXQAAAAAAOnM6DjiUOMAmlib/I5Yj6ySaJAYAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAA7PDvvQkNCbwAAAAAAAAAAMDIwCYaFhnyenJ71PZQ9syOWI7sAAAAAI5UjAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAOTo5tkxNS+pTVFRuZWZlcHx8fMOLi4v+jIuMgH5ZfgUkliQmAAA' +
  'AACWbJQAAAAAAAAAAAAAAAAAAAAAAAAAAADU2NRZHSEerWVpZ4mlqaeJzc3OxbW9uOn1/ewEA' +
  'AAAAAAAAACSWJAAAAAAAAAAAAP8PAAD8TwAA4ecAAMPnAADB7wAA488AAPYfAAD8PwAA/D8AA' +
  'Px/AAD5/wAA88cAAPPHAAD3xwAA8x8AAPh/AAAoAAAAEAAAACAAAAABAAEAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAA////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=='

const favicon = Buffer.from(b64favicon, 'base64')

module.exports = {
  base64url,
  generateRandomString,
  generateCodeChalenge,
  idFactory,
  secretFactory,
  saltpass,
  matchpass,
  handleCORS,
  favicon
}
