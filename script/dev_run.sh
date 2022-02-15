cd src
# after the trap we catch errors
trap 'catch $LINENO' ERR
catch() {
  echo "exiting badly : node not found"
  exit 1
}

NODE_VER=$(node --version)
if [ -n STRING ]
  then
    echo "node version is ${NODE_VER}"
    export DEBUG=oidc-provider:*
    node inspect -e "var m = require('./');var o = m.createOption({cryptopath: '"${CRYPTOPATH}"'});var s = m.createServer(o)"
fi
exit 0
