const https = require('https')
const fs = require('fs')

const oaProvider = require('./provider')

const keyfilename = 'key.pem'
const certfilename = 'cert.pem'

module.exports = {
  createServer: (option) =>
    https.createServer(option.config, option.handler).listen(option.port),
  createOption: (option) => ({
    ...option,
    ...(option.cryptopath
      ? {
          config: {
            key: fs.readFileSync(option.cryptopath.concat('/', keyfilename)),
            cert: fs.readFileSync(option.cryptopath.concat('/', certfilename))
          }
        }
      : { config: {} }),
    ...(typeof option.handler !== 'function'
      ? {
          handler: (req, res) => oaProvider.attach()(req, res, () => {})
        }
      : {}),
    ...(typeof option.port !== 'number'
      ? { port: 36936 }
      : {})
  })
}
