const assert = require('assert')

const { MongoClient } = require('mongodb')

const util = require('./util')

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
    const openidScope = 'openid'
    if (!account) {
      return undefined
    }
    const atoken = ctx.oidc.accessToken
    const scope = atoken && atoken.scope && atoken.scope.length > 0
      ? atoken.scope.split(' ')
      : []

    return {
      accountId: id,
      async claims () {
        const more = scope.reduce((acc, cur) => {
          if (
            cur !== openidScope &&
            Object.keys(account).includes(cur) &&
            Object.keys(localClaims).includes(cur)
          ) {
            acc[cur] = account[cur]
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
      return util.matchpass(password, account.password)
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
      assert(password, 'passwinsertOneord must be provided')
      assert(email, 'email must be provided')
      const lowercased = String(email).toLowerCase()

      const exiting = await coll.findOne({ email: lowercased })
      assert(!exiting, 'already exists')

      const accountId = util.idFactory()
      return util.saltpass(password).then(spass => {
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
