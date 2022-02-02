# open account

oauth2 and oidc provider

### How to use this project

All the work has been done in linux machines and is destined to be deployed in linux machines. The issue with this is that the scripts required to run are crafted in `bash` and will not work in other shells let alone windows. One solution is to study the scripts and do manually the work in the targeted environment another is to use git bash from [gitforwindows](https://gitforwindows.org/)

Generate some crypto elements with the provided script if you have openssl installed. You could use crypto elements created elsewhere as long as you keep the names `cert.pem` and `key.pem`.


```
bash script/generate_selfsigned_certificate.sh
```

Add this entry in you etc hosts file so the different services can discover each other.

`127.0.0.1 oap.localnet acc.localnet app.localnet api.localnet`

### Start the main services with docker

With the crypto elements generated run the following scripts to build and run the auth provider with its database and the proxy.

```
bash script/build_docker.sh
bash script/run_docker.sh
```

### OpenID Connect client

To test openid connect use this modified example of
[AppAuth-JS ](https://github.com/xelinorg/AppAuth-JS/tree/add-userinfo-request). You should checkout the `add-userinfo-request` branch. The base of this example is provided from OpenID.

```
git clone https://github.com/xelinorg/AppAuth-JS.git
cd AppAuth-JS
git checkout add-userinfo-request
npm install
npm run app
```

### OAuth2 client

To test resource indicators a.k.a. Resource API you should use the modified example of [auth0-react](https://github.com/xelinorg/auth0-react/tree/open-account-integration). You should checkout the `open-account-integration`. The base of this project is provided from Auth0.

```
git clone https://github.com/xelinorg/auth0-react.git
cd auth0-react
git checkout open-account-integration
npm install
npm run build
npm install:examples
npm run start:cra
```

Open another terminal for the api.

```
npm run start:api
```

### Do the test

Fire the following urls in your browser. By opening all the links in different tabs you accept the self signed certificates. This is needed for the auth flow to work as some calls are ajax and you do not see the error on the browser window.

[Authentication provider](https://oap.localnet/.well-known/openid-configuration)

[OpenID client](https://acc.localnet/app)

[OAuth client](https://app.localnet/)

[A static resource server to access](https://api.localnet/users)

### More about the underline technologies

[OpenID github](https://github.com/openid)

[Auth0 github](https://github.com/auth0)
