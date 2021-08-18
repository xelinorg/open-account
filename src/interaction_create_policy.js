module.exports.createFactory = (Prompt, Check) => {
  return new Prompt(
    { name: 'create', requestable: true },

    (ctx) => {
      const { oidc } = ctx

      return {
        ...(oidc.params.max_age === undefined
          ? undefined
          : { max_age: oidc.params.max_age }),
        ...(oidc.params.login_hint === undefined
          ? undefined
          : { login_hint: oidc.params.login_hint }),
        ...(oidc.params.id_token_hint === undefined
          ? undefined
          : { id_token_hint: oidc.params.id_token_hint })
      }
    },
    new Check(
      'max_age', 'End-User authentication could not be obtained',
      (ctx) => {
        const { oidc } = ctx
        if (oidc.params.max_age === undefined) {
          return Check.NO_NEED_TO_PROMPT
        }

        return Check.NO_NEED_TO_PROMPT
      })
  )
}
