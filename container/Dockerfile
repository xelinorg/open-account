FROM node:12
RUN groupadd -r artsteps && useradd -r -g artsteps artsteps

RUN mkdir -p /container/open-account

COPY auth-entrypoint.sh /usr/local/bin/
RUN chmod 755 /usr/local/bin/auth-entrypoint.sh

COPY crypto /container/open-account/crypto
COPY src /container/open-account/src
COPY package.json /container/open-account
COPY index.js /container/open-account

RUN chown -R artsteps:artsteps /container/open-account

USER artsteps
WORKDIR /container/open-account

ENV HOME=/container/open-account

EXPOSE 36936

ENTRYPOINT ["/usr/local/bin/auth-entrypoint.sh"]
