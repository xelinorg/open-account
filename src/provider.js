const Provider = require('oidc-provider')

const jwks = require('./jwks.json')
const ttl = {
  AccessToken: function AccessTokenTTL (ctx, token, client) {
    if (token.resourceServer) {
      return token.resourceServer.accessTokenTTL || 60 * 60 // 1 hour in seconds
    }
    return 60 * 60 // 1 hour in seconds
  },
  AuthorizationCode: 600 /* 10 minutes in seconds */,
  BackchannelAuthenticationRequest:
    function BackchannelAuthenticationRequestTTL (ctx, request, client) {
      if (ctx && ctx.oidc && ctx.oidc.params.requested_expiry) {
        // 10 minutes in seconds or requested_expiry, whichever is shorter
        return Math.min(10 * 60, +ctx.oidc.params.requested_expiry)
      }

      return 10 * 60 // 10 minutes in seconds
    },
  ClientCredentials: function ClientCredentialsTTL (ctx, token, client) {
    if (token.resourceServer) {
      // 10 minutes in seconds
      return token.resourceServer.accessTokenTTL || 10 * 60
    }
    return 10 * 60 // 10 minutes in seconds
  },
  DeviceCode: 600 /* 10 minutes in seconds */,
  Grant: 1209600 /* 14 days in seconds */,
  IdToken: 3600 /* 1 hour in seconds */,
  Interaction: 3600 /* 1 hour in seconds */,
  RefreshToken: function RefreshTokenTTL (ctx, token, client) {
    if (
      ctx && ctx.oidc.entities.RotatedRefreshToken &&
      client.applicationType === 'web' &&
      client.tokenEndpointAuthMethod === 'none' &&
      !token.isSenderConstrained()
    ) {
      // Non-Sender Constrained SPA RefreshTokens do
      // not have infinite expiration through rotation
      return ctx.oidc.entities.RotatedRefreshToken.remainingTTL
    }

    return 14 * 24 * 60 * 60 // 14 days in seconds
  },
  Session: 1209600 /* 14 days in seconds */
}

const MongoDBAdapter = require('./mongodb_adapter')

const providerFactory = (option) => {
  const oidc = new Provider(option.url, {
    // configure Provider to use the adapter
    adapter: MongoDBAdapter,
    clients: [
      {
        client_id: 'foo',
        redirect_uris: ['https://jwt.io'], // using jwt.io as redirect_uri to show the ID Token contents
        response_types: ['id_token'],
        grant_types: ['implicit'],
        token_endpoint_auth_method: 'none'
      }
    ],
    interactions: {
      url (ctx, interaction) { // eslint-disable-line no-unused-vars
        return `/interaction/${interaction.uid}`
      }
    },
    claims: {
      address: ['address'],
      email: ['email', 'email_verified'],
      phone: ['phone_number', 'phone_number_verified'],
      profile: ['birthdate', 'family_name', 'gender', 'given_name', 'locale',
        'middle_name', 'name', 'nickname', 'picture', 'preferred_username',
        'profile', 'updated_at', 'website', 'zoneinfo']
    },
    cookies: {
      keys: process.env.SECURE_KEY.split(',')
    },
    features: {
      devInteractions: { enabled: false },
      backchannelLogout: { enabled: true, ack: 'draft-06' },
      jwtIntrospection: { enabled: true, ack: 'draft-10' },
      jwtResponseModes: { enabled: true, ack: 'implementers-draft-01' },
      introspection: { enabled: true }
    },
    jwks,
    ttl
  })
  return oidc.callback()
}

module.exports.attach = (option) => {
  const o = option || {}
  !o.url && (o.url = 'https://localhost:36936')
  return providerFactory(o)
}
