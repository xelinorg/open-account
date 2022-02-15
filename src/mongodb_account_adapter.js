const assert = require('assert')

const { MongoClient } = require('mongodb')

const localutil = require('./util')

let DB
let coll
let localClaims

module.exports = {
  connect: async function connect (claims) {
    if (!localClaims && claims) localClaims = claims
    if (!DB) {
      const connection = await MongoClient.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      })
      DB = connection.db(connection.s.options.dbName)
      coll = DB.collection('OIDCAccount')
    }
  },
  findAccount: async function accountAdapterFindAccount (
    ctx, id
  ) {
    const account = await coll.findOne({ id: id })
    const openidScopeIn = ['profile', 'phone', 'email', 'address']
    if (!account) {
      return undefined
    }
    let scope = []
    if (
      ['authorization', 'userinfo'].includes(ctx.oidc.route) &&
      ctx.oidc.accessToken &&
      ctx.oidc.accessToken.scope &&
      ctx.oidc.accessToken.scope.length > 0
    ) {
      scope = ctx.oidc.accessToken.scope.split(' ')
    }
    if (
      ctx.oidc.route === 'resume' &&
      ctx.oidc.entities &&
      ctx.oidc.entities.Interaction &&
      ctx.oidc.entities.Interaction.params &&
      ctx.oidc.entities.Interaction.params.scope
    ) {
      scope = ctx.oidc.entities.Interaction.params.scope.split(' ')
    }

    if (
      ctx.oidc.route === 'token' &&
      ctx.oidc.entities &&
      ctx.oidc.entities.Grant &&
      ctx.oidc.entities.Grant.openid &&
      ctx.oidc.entities.Grant.openid.scope
    ) {
      scope = ctx.oidc.entities.Grant.openid.scope.split(' ')
    }

    return {
      accountId: id,
      async claims () {
        const more = scope.reduce((acc, cur) => {
          if (
            openidScopeIn.indexOf(cur) >= 0 &&
            Object.keys(account).includes(cur) &&
            Object.keys(localClaims).includes(cur)
          ) {
            const c = account[cur]
            if (typeof c === 'object' && Object.keys(c).length > 0) {
              Object.keys(c).forEach(k => (acc[k] = account[cur][k]))
            } else {
              acc[cur] = account[cur]
            }
          }
          return acc
        }, {}) || {}
        return {
          sub: id,
          email: account.email,
          email_verified: account.email_verified,
          ...(more || {})
        }
      }
    }
  },
  authenticate: async function accountAdapterAuthenticate (
    email, password
  ) {
    try {
      assert(password, 'password must be provided')
      assert(email, 'email must be provided')
      const lowercased = String(email).toLowerCase()
      // const account = db.get('users').find({ email: lowercased }).value()
      const account = await coll.findOne({ email: lowercased })
      return localutil.matchpass(password, account.password)
        .then(spass => {
          assert(
            spass,
            'invalid credentials provided'
          )

          return account.id
        },
        err => Promise.reject(err))
    } catch (err) {
      return undefined
    }
  },
  create: async function accountAdapterCreate (
    email, password, ...rest
  ) {
    try {
      assert(password, 'password must be provided')
      assert(email, 'email must be provided')
      const lowercased = String(email).toLowerCase()

      const existing = await coll.findOne({ email: lowercased })
      assert(!existing, 'could not create account')

      const accountId = localutil.idFactory()
      return localutil.saltpass(password).then(spass => {
        const user = {
          _id: accountId,
          id: accountId,
          email: lowercased,
          password: spass,
          email_verified: false
        }
        return coll.insertOne(user).then(u => ({ id: u.insertedId }))
      })
    } catch (err) {
      return undefined
    }
  }
}
