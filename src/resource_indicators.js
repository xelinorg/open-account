const url = require('url')
let resourceIndicatorMode = 'path'
let resourceIndicatorFrag

const audienceMap = {
  chat: 'chat',
  file: 'file',
  users: 'https://api.localnet/api/v1/users'
}

const scopeMap = {
  chat: 'chat:read chat:write',
  file: 'file:read file:write',
  users: 'users:read users:write'
}

function extractResourceHash (urlHash) {
  const normalizedUrl = new url.URL(urlHash)
  let resourceHash
  if (resourceIndicatorMode === 'path') {
    const startPosition = normalizedUrl.pathname.indexOf(resourceIndicatorFrag)
    const splitPosition = startPosition + resourceIndicatorFrag.length + 1
    resourceHash = normalizedUrl.pathname.slice(splitPosition).split('/')[0]
  } else if (resourceIndicatorMode === 'hostname') {
    const hostnameParts = normalizedUrl.hostname.split('.')
    const indicator = hostnameParts[0]
    hostnameParts.shift()
    resourceHash = hostnameParts.join('.') === resourceIndicatorFrag
      ? indicator
      : ''
  } else {
    resourceHash = ''
  }
  return resourceHash
}

function mapResourceServerInfo (ctx, resourceIndicator, client) {
  const audienceHash = extractResourceHash(resourceIndicator)
  return {
    scope: scopeMap[audienceHash],
    audience: audienceMap[audienceHash],
    accessTokenTTL: 2 * 60 * 60, // 2 hours
    accessTokenFormat: 'jwt',
    jwt: {
      sign: { alg: 'ES256' }
    }
  }
}

module.exports = {
  init: (mode, fragment) => {
    resourceIndicatorMode = mode
    resourceIndicatorFrag = fragment
  },
  use: () => ({
    defaultResource: async function defaultResource (ctx, client, oneOf) {
      if (client && client.clientId === 'acc') return undefined
      if (client && client.clientId === 'app') return 'https://api.localnet/api/v1/users'

      if (oneOf) return oneOf[0]
      return undefined
    },
    enabled: true,
    getResourceServerInfo: async function getResourceServerInfo (
      ctx, resourceIndicator, client
    ) {
      return mapResourceServerInfo(ctx, resourceIndicator, client)
    },
    useGrantedResource: async function useGrantedResource (ctx, model) {
      return false
    }
  })
}
