#!/bin/bash

npm install

exec node -e "var m = require('${PROJECT_ROOT_PATH}');var o = m.createOption({cryptopath: '"${CRYPTOPATH}"', url: '"${OAP_ISSUER_URL}"'});var s = m.createServer(o)"
