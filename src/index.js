const https = require('https')
const fs = require('fs')

const oaProvider = require('./provider')

const keyfilename = 'key.pem'
const certfilename = 'cert.pem'

module.exports = {
  createServer: (option) =>
    oaProvider.attach().then(f =>
      https.createServer(
        option.config, (req, res) => f(req, res, () => {})
      ).listen(option.port)
    ),
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
    ...(typeof option.port !== 'number'
      ? { port: 36936 }
      : {})
  })
}
