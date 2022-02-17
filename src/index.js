const https = require('https')
const fs = require('fs')

const oaProvider = require('./provider')
const interaction = require('./interaction')
const oapConfig = require('./config')

const keyfilename = 'key.pem'
const certfilename = 'cert.pem'

module.exports = {
  createServer: (option) =>
    oaProvider.attach(
      oapConfig.create({ ...option, interaction })
    ).then(f =>
      https.createServer(
        option.config, (req, res) => f(req, res, () => {
          console.info('root listener', req.method, req.path)
        })
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
