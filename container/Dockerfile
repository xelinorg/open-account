FROM node:16
RUN groupadd -r oap && useradd -r -g oap oap

RUN mkdir -p /container/open-account

COPY auth-entrypoint.sh /usr/local/bin/
RUN chmod 755 /usr/local/bin/auth-entrypoint.sh

COPY crypto /container/open-account/crypto
COPY src /container/open-account/src
COPY package.json /container/open-account
COPY index.js /container/open-account

RUN chown -R oap:oap /container/open-account

USER oap
WORKDIR /container/open-account

ENV HOME=/container/open-account

EXPOSE 36936

ENTRYPOINT ["/usr/local/bin/auth-entrypoint.sh"]
