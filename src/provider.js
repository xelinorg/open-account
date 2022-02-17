const bodyParser = require('body-parser')
const { Provider } = require('oidc-provider')

const MongoDBAdapter = require('./mongodb_oidc_adapter')
const Account = require('./mongodb_account_adapter')

const jwks = require('./jwks.json')
const ttl = require('./ttl')
const localutil = require('./util')

const router = (oidc, interaction) => (req, res) => {
  return localutil.handleCORS(req, res, (err, suc) => {
    if (err) return res.end()

    if (res.finished) return

    if (req.url.includes('/favicon.ico')) {
      res.setHeader('Content-Type', 'image/x-icon')
      res.write(localutil.favicon)
      return res.end()
    }

    return req.url.includes('interaction')
      ? interaction.handler(oidc, bodyParser, Account)(req, res)
      : oidc.callback()(req, res)
  })
}

const providerFactory = (option) => {
  Account.connect(option.get().claims)
  return MongoDBAdapter.connect().then(suc => {
    const config = {
      // configure Provider to use the adapter
      adapter: MongoDBAdapter,
      ...option.get(),
      jwks,
      ttl
    }
    const oidc = new Provider(option.url, config)
    oidc.proxy = true

    return new (oidc.InitialAccessToken)(config.features.registration.policies
      ? {
          policies: [...Object.keys(config.features.registration.policies)]
        }
      : {}
    ).save().then(() => router(oidc, config.interaction))
  })
}

module.exports.attach = (option) => {
  const o = option || {}
  !o.url && (o.url = option.get().url)
  !o.url && (o.url = 'https://oap.localnet/')
  return providerFactory(o)
}
