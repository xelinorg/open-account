const Provider = require('oidc-provider')

const util = require('./util')
const condition = require('./condition')

module.exports = {
  'my-policy': function (ctx, properties) {
    // @param ctx - koa request context
    // @param properties - client props which are about to be validated
    // example of setting a default
    if (!('client_name' in properties)) {
      properties.client_name = util.generateRandomString(12)
    }
    // example of forcing a value
    properties.userinfo_signed_response_alg = 'RS256'
    // example of throwing a validation error
    if (condition.some(ctx, properties)) {
      throw new Provider.errors.InvalidClientMetadata(
        'validation error message'
      )
    }
  },
  'my-policy-2': async function (ctx, properties) {
    properties.client_secret = util.secretFactory()
  }
}
