module.exports = {
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
