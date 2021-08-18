const assert = require('assert')

const ejs = require('ejs')

const ejsLogin = 'views/login.ejs'
const ejsInteract = 'views/interaction.ejs'

function htmlResponse (view, data, res, cb) {
  const filename = view === 'login' ? ejsLogin : ejsInteract
  return ejs.renderFile(filename, data, (e, s) => {
    if (e) return cb(e)
    res.body = s
    return cb(null)
  })
}

function setNoCache (req, res, next) {
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Cache-Control', 'no-cache, no-store')
  next()
}

function normalizeResult (payload) {
  return {
    ...(payload.uid ? { uid: payload.uid } : {}),
    ...(payload.details ? { details: payload.details } : {}),
    ...(payload.params ? { params: payload.params } : {}),
    ...(payload.title ? { title: payload.title } : {})
  }
}

const root = async (oidc, req, res, next) => {
  // '/interaction/:uid'
  try {
    const details = await oidc.interactionDetails(req, res)
    console.log(
      'see what else is available to you for interaction views',
      details
    )
    const {
      uid, prompt, params
    } = details

    const client = await oidc.Client.find(params.client_id)

    if (prompt.name === 'login') {
      return htmlResponse('login', {
        client,
        uid,
        details: prompt.details,
        params,
        title: 'Sign-in',
        flash: undefined
      }, res, next)
    }
    return htmlResponse('interaction', {
      client,
      uid,
      details: prompt.details,
      params,
      title: prompt.name
    }, res, next)
  } catch (err) {
    return next(err)
  }
}

const create = Account => async (oidc, req, res, next) => {
  // '/interaction/:uid/create'
  // const interactionDetails = await oidc.interactionDetails(req, res)

  try {
    const account = await Account.create(
      req.body.email, req.body.password
    )
    if (!account) return next('could not create account')
    // TODO add client_id into grant
    const agrant = new oidc.Grant(oidc)
    agrant.addOIDCScope('openid')
    const asession = new oidc.Session(oidc)

    return agrant.save().then(async xgrant => {
      asession.grantIdFor(account.id, xgrant)
      asession.loginAccount({ accountId: account.id })
      return asession.save(600).then(async xsession => {
        // const result = { consent: { grantId: xgrant } }
        const result = {
          login: { accountId: account.id },
          create: { accountId: account.id }
        }
        await oidc.interactionFinished(
          req, res, result, { mergeWithLastSubmission: true }
        )

        return next(null, normalizeResult(result))
      })
    })
  } catch (err) {
    next(err)
  }
}

const verify = Account => async (oidc, req, res, next) => {
  // '/interaction/:uid/login'
  try {
    const { uid, prompt, params } = await oidc.interactionDetails(req, res)
    assert.strictEqual(prompt.name, 'login')
    const client = await oidc.Client.find(params.client_id)

    const accountId = await Account.authenticate(
      req.body.email, req.body.password
    )

    if (!accountId) {
      return res.write('login ' + JSON.stringify({
        client,
        uid,
        details: prompt.details,
        params: {
          ...params,
          login_hint: req.body.email
        },
        title: 'Sign-in',
        flash: 'Invalid email or password.'
      }))
    }

    const result = {
      login: { accountId }
    }

    await oidc.interactionFinished(
      req, res, result, { mergeWithLastSubmission: false }
    )
    return next(null, normalizeResult(result))
  } catch (err) {
    next(err)
  }
}

const login = Account => async (oidc, req, res, next) => {
  // '/interaction/:uid/login'
  try {
    const { uid, prompt, params } = await oidc.interactionDetails(req, res)
    assert.strictEqual(prompt.name, 'login')
    const client = await oidc.Client.find(params.client_id)

    const accountId = await Account.authenticate(
      req.body.email, req.body.password
    )

    if (!accountId) {
      return htmlResponse('login', {
        client,
        uid,
        details: prompt.details,
        params: {
          ...params,
          login_hint: req.body.email
        },
        title: 'Sign-in',
        flash: 'Invalid email or password.'
      }, res, next)
    }

    const result = {
      login: { accountId }
    }

    await oidc.interactionFinished(
      req, res, result, { mergeWithLastSubmission: false }
    )
    return next(null)
  } catch (err) {
    next(err)
  }
}

const confirm = async (oidc, req, res, next) => {
  // '/interaction/:uid/confirm'
  try {
    const interactionDetails = await oidc.interactionDetails(req, res)
    const {
      prompt: { name, details },
      params,
      session: { accountId }
    } = interactionDetails
    assert.strictEqual(name, 'consent')

    let { grantId } = interactionDetails
    let grant

    if (grantId) {
      // we'll be modifying existing grant in existing session
      grant = await oidc.Grant.find(grantId)
    } else {
      // we're establishing a new grant
      grant = new oidc.Grant({
        accountId,
        clientId: params.client_id
      })
    }

    if (details.missingOIDCScope) {
      grant.addOIDCScope(details.missingOIDCScope.join(' '))
      // use grant.rejectOIDCScope to reject a subset or the whole thing
    }
    if (details.missingOIDCClaims) {
      grant.addOIDCClaims(details.missingOIDCClaims)
      // use grant.rejectOIDCClaims to reject a subset or the whole thing
    }
    if (details.missingResourceScopes) {
      // eslint-disable-next-line no-restricted-syntax
      const missingRSE = Object.entries(details.missingResourceScopes)
      for (const [indicator, scopes] of missingRSE) {
        grant.addResourceScope(indicator, scopes.join(' '))
        // use grant.rejectResourceScope to reject a subset or the whole thing
      }
    }

    grantId = await grant.save()

    const consent = {}
    if (!interactionDetails.grantId) {
      // we don't have to pass grantId to consent,
      // we're just modifying existing one
      consent.grantId = grantId
    }

    const result = { consent }
    await oidc.interactionFinished(
      req, res, result, { mergeWithLastSubmission: true }
    )
    return next(null)
  } catch (err) {
    next(err)
  }
}

const abort = async (oidc, req, res, next) => {
  // '/interaction/:uid/abort'
  try {
    const result = {
      error: 'access_denied',
      error_description: 'End-User aborted interaction'
    }
    await oidc.interactionFinished(
      req, res, result, { mergeWithLastSubmission: false }
    )
    return next(null)
  } catch (err) {
    next(err)
  }
}

const actions = {
  login,
  create,
  verify,
  abort,
  confirm,
  root
}

const errorHandler = (err, res) => {
  if (!res.finished) {
    res.writeHead(err.statusCode || 500)
    res.addTrailers({ 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({
      ...(err.error ? { error: err.error } : {}),
      ...(err.error_description ? { error_desc: err.error_description } : {}),
      ...(err.error_detail ? { error_detail: err.error_detail } : {}),
      ...(err.name ? { name: err.name } : {})
    }))
  }
}

const successHandler = (res) => {
  if (!res.finished && res.body) {
    if (typeof res.body === 'string') {
      res.addTrailers({ 'Content-Type': 'text/html' })
      res.write(res.body)
    } else {
      res.addTrailers({ 'Content-Type': 'application/json' })
      res.write(JSON.stringify(res.body))
    }
  }
  return res.end()
}

module.exports.handler = (oidc, bodyParser, Account) => (req, res) => {
  const torun = [
    setNoCache,
    bodyParser.urlencoded({ extended: false }),
    bodyParser.json()
  ]

  const next = (nerr, nres) => {
    if (nerr) return errorHandler(nerr, res)
    return nres
  }

  for (let n = 0; n < torun.length; n++) {
    torun[n](req, res, function (e, r) {
      if (e) errorHandler(e, res)
      if (n >= torun.length - 1) {
        const urlParts = req.url.split('/').filter(p => p)
        const interactionIdx = urlParts.indexOf('interaction')
        const interaction = interactionIdx === 0 && urlParts[interactionIdx + 2]
          ? urlParts[interactionIdx + 2]
          : 'root'
        let action = actions[interaction]
        if (action && (action.name === 'login' || action.name === 'create')) {
          action = action(Account)
        }

        return action(oidc, req, res, next)
          .then(() => successHandler(res))
      }
    })
  }
}
