cd src
nvm use 12
export DEBUG=oidc-provider:*
node inspect -e "var m = require('./');var o = m.createOption({cryptopath: '"${CRYPTOPATH}"'});var s = m.createServer(o)"
