const bodyParser = require('body-parser')
const {
  Provider,
  interactionPolicy: { Prompt, Check, base }
} = require('oidc-provider')

const MongoDBAdapter = require('./mongodb_oidc_adapter')
const Account = require('./mongodb_account_adapter')

const jwks = require('./jwks.json')
const ttl = require('./ttl')
const util = require('./util')

const interaction = require('./interaction')
const interpol = require('./interaction_create_policy')
const regpolicy = require('./reg_policy')

const basePolicy = base()
const createPolicy = interpol.createFactory(Prompt, Check)
basePolicy.add(createPolicy)

const partialConfig = {
  clients: [{
    client_id: 'foo',
    client_secret: 'bar',
    redirect_uris: ['https://app.localnet/app/redirect.html', 'https://oap.localnet:8000/app/redirect.html'],
    response_types: ['code id_token', 'code'],
    grant_types: ['authorization_code', 'refresh_token', 'implicit'],
    token_endpoint_auth_method: 'none',
    introspection_endpoint_auth_method: 'client_secret_basic'
  }],
  findAccount: Account.findAccount,
  claims: {
    openid: ['sub'],
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
  interactions: {
    url (ctx, interaction) {
      return `/interaction/${interaction.uid}`
    },
    policy: [
      basePolicy[2],
      basePolicy[0],
      basePolicy[1]
    ]
  },
  features: {
    devInteractions: { enabled: false },
    clientCredentials: { enabled: true },
    backchannelLogout: { enabled: true, ack: 'draft-06' },
    jwtIntrospection: { enabled: true, ack: 'draft-10' },
    jwtResponseModes: { enabled: true, ack: 'implementers-draft-01' },
    introspection: { enabled: true },
    registrationManagement: {
      enabled: true,
      rotateRegistrationAccessToken: false
    },
    registration: {
      enabled: true,
      idFactory: util.idFactory,
      initialAccessToken: true,
      issueRegistrationAccessToken: true,
      policies: {},
      secretFactory: util.secretFactory // see expanded details below
    },
    resourceIndicators: {
      defaultResource: async function defaultResource (ctx, client, oneOf) {
        console.log('defaultResource', arguments)
        if (oneOf) return oneOf
        return undefined
      },
      enabled: true,
      getResourceServerInfo: async function getResourceServerInfo (
        ctx, resourceIndicator, client
      ) {
        console.log('getResourceServerInfo', arguments)
        return {
          scope: 'api:read api:write',
          audience: 'resource-server-audience-value',
          accessTokenTTL: 2 * 60 * 60, // 2 hours
          accessTokenFormat: 'jwt',
          jwt: {
            sign: { alg: 'ES256' }
          }
        }
      },
      useGrantedResource: async function useGrantedResource (ctx, model) {
        console.log('useGrantedResource', arguments)
        return false
      }
    }
  },
  pkce: {
    methods: ['S256', 'plain'],
    required: () => false
  },
  routes: {
    authorization: '/auth',
    backchannel_authentication: '/backchannel',
    code_verification: '/device',
    device_authorization: '/device/auth',
    end_session: '/session/end',
    introspection: '/token/introspection',
    jwks: '/jwks',
    pushed_authorization_request: '/request',
    registration: '/reg',
    revocation: '/token/revocation',
    token: '/token',
    userinfo: '/me'
  },
  issueRefreshToken: async function issueRefreshToken (ctx, client, code) {
    if (!client.grantTypeAllowed('refresh_token')) {
      return false
    }
    return code.scopes.has('offline_access') || (
      client.applicationType === 'web' &&
      client.tokenEndpointAuthMethod === 'none'
    )
  }

}

const router = oidc => (req, res) => {
  if (req.url.includes('/favicon.ico')) {
    res.setHeader('Content-Type', 'image/x-icon')
    res.write(util.favicon)
    return res.end()
  }
  return util.handleCORS(req, res, (err, suc) => {
    if (err) return res.end()

    return req.url.includes('interaction')
      ? interaction.handler(oidc, bodyParser, Account)(req, res)
      : oidc.callback()(req, res)
  })
}

const providerFactory = (option) => {
  Account.connect(partialConfig.claims)
  return MongoDBAdapter.connect().then(suc => {
    const config = {
      // configure Provider to use the adapter
      adapter: MongoDBAdapter,
      ...partialConfig,
      ...({
        features: {
          ...(partialConfig.features || {}),
          ...(partialConfig.features.registration
            ? {
                registration: {
                  ...partialConfig.features.registration,
                  policies: { ...regpolicy, ...option.policy }
                }
              }
            : {})
        }
      }),
      jwks,
      ttl
    }
    const oidc = new Provider(option.url, config)
    oidc.proxy = true
    return new (oidc.InitialAccessToken)(config.features.registration.policies
      ? {
          policies: [...Object.keys(config.features.registration.policies)]
        }
      : {}).save().then(suc => router(oidc))
  })
}

module.exports.attach = (option) => {
  const o = option || {}
  !o.url && (o.url = 'https://oap.localnet')
  return providerFactory(o)
}
