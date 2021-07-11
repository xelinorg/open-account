const low = require('lowdb')
const Memory = require('lowdb/adapters/Memory')

const db = low(new Memory())

const assert = require('assert')

db.defaults({
  users: [
    {
      id: '0cyroF61cqyVgLimaUfwR',
      email: 'foo@example.com',
      email_verified: true
    }
  ]
}).write()

class Account {
  // This interface is required by oidc-provider
  static async findAccount (ctx, id) {
    // This would ideally be just a check whether the account is still in your storage
    const account = db.get('users').find({ id }).value()
    if (!account) {
      return undefined
    }

    return {
      accountId: id,
      // and this claims() method would actually query to retrieve the account claims
      async claims () {
        return {
          sub: id,
          email: account.email,
          email_verified: account.email_verified
        }
      }
    }
  }

  // This can be anything you need to authenticate a user
  static async authenticate (email, password) {
    try {
      assert(password, 'password must be provided')
      assert(email, 'email must be provided')
      const lowercased = String(email).toLowerCase()
      const account = db.get('users').find({ email: lowercased }).value()
      assert(account, 'invalid credentials provided')

      return account.id
    } catch (err) {
      return undefined
    }
  }
}

module.exports = Account
