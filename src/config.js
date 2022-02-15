const assert = require('assert')

const { interactionPolicy: { Prompt, Check, base } } = require('oidc-provider')

const Account = require('./mongodb_account_adapter')

const localutil = require('./util')
const regpolicy = require('./reg_policy')
const basePolicy = base()
const interpol = require('./interaction_create_policy')
const resourceIndicators = require('./resource_indicators')

const createPolicy = interpol.createFactory(Prompt, Check)
basePolicy.add(createPolicy)

resourceIndicators.init(
  process.env.RESOURCE_INDICATOR_MODE,
  process.env.RESOURCE_INDICATOR_FRAG
)

const defaultConfig = {
  clients: [{
    client_id: 'acc',
    client_secret: 'bar',
    redirect_uris: ['https://acc.localnet/app/redirect.html'],
    response_types: ['code id_token', 'code'],
    grant_types: ['authorization_code', 'refresh_token', 'implicit'],
    token_endpoint_auth_method: 'none',
    introspection_endpoint_auth_method: 'client_secret_basic'
  },
  {
    client_id: 'app',
    client_secret: 'bar',
    redirect_uris: ['https://app.localnet'],
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
      idFactory: localutil.idFactory,
      initialAccessToken: true,
      issueRegistrationAccessToken: true,
      policies: regpolicy,
      secretFactory: localutil.secretFactory // see expanded details below
    },
    resourceIndicators: resourceIndicators.use()
  },
  pkce: {
    methods: ['S256', 'plain'],
    required: () => false
  },
  routes: {
    authorization: '/authorize',
    backchannel_authentication: '/backchannel',
    code_verification: '/device',
    device_authorization: '/device/auth',
    end_session: '/session/end',
    introspection: '/token/introspection',
    jwks: '/jwks',
    pushed_authorization_request: '/request',
    registration: '/reg',
    revocation: '/token/revocation',
    token: '/oauth/token',
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

function OAPConfig (option) {
  assert(typeof option === 'object', 'invalid configuration type')
  const config = option
  this.innerget = function oAPConfigInnerget (key) {
    return config[key] || config
  }
}

OAPConfig.prototype.get = function oAPConfigPrototypeGet () {
  return this.innerget(arguments)
}

const configValidation = copt => {
  return typeof copt === 'object'
}

const configFactory = (...copt) => {
  assert(configValidation(copt), 'invalid configuration option')
  return new OAPConfig(Object.assign({}, ...copt, defaultConfig))
}
module.exports = {
  validate: (option) => configValidation(option),
  create: (option) => configFactory(option)
}
