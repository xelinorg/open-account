const crypto = require('crypto')

const nanoid = require('nanoid')
const bodyParser = require('body-parser')
const Provider = require('oidc-provider')

const MongoDBAdapter = require('./mongodb_adapter')
const Account = require('./account')

const jwks = require('./jwks.json')
const ttl = require('./ttl')
const util = require('./util')

const interaction = require('./interaction')
const policy = require('./policy')

function idFactory (ctx) {
  console.log('idFactory', ctx)
  return nanoid.nanoid()
}

function secretFactory (ctx) {
  return util.base64url.encodeBuffer(
    crypto.randomBytes(64)
  ) // 512 base64url random bits
}

const partialConfig = {
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
    }
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
      idFactory: idFactory,
      initialAccessToken: true,
      issueRegistrationAccessToken: true,
      policies: {},
      secretFactory: secretFactory // see expanded details below
    }
  },
  pkce: {
    methods: ['S256', 'plain'],
    required: () => false
  }
}

const router = oidc => (req, res) => req.url.includes('interaction')
  ? interaction.handler(oidc, bodyParser, Account)(req, res)
  : oidc.callback()(req, res)

const providerFactory = (option) => {
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
                  policies: { ...policy, ...option.policy }
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
  !o.url && (o.url = 'https://mongodb1:36936')
  return providerFactory(o)
}
