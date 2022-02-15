#!/usr/bin/env bash

SOURCE="${BASH_SOURCE[0]}"
while [ -h "$SOURCE" ]; do # resolve $SOURCE until the file is no longer a symlink
  DIR="$( cd -P "$( dirname "$SOURCE" )" && pwd )"
  SOURCE="$(readlink "$SOURCE")"
  [[ $SOURCE != /* ]] && SOURCE="$DIR/$SOURCE" # if $SOURCE was a relative symlink, we need to resolve it relative to the path where the symlink file was located
done

export DEPLOY_ROOT_DIR="$( cd -P "$( dirname "$SOURCE" )" && pwd )"

source "$DEPLOY_ROOT_DIR/common.sh"

ensure_environment_url
ensure_deploy_variables
create_kubeconfig

CI_ENVIRONMENT_HOSTNAME="${CI_ENVIRONMENT_URL}"
CI_ENVIRONMENT_HOSTNAME="${CI_ENVIRONMENT_HOSTNAME/http:\/\//}"
CI_ENVIRONMENT_HOSTNAME="${CI_ENVIRONMENT_HOSTNAME/https:\/\//}"

# set this on gitlab pipeline env vars
#MONGODB_URI="mongodb://admin:my-super-secret-password@rtstps.xyz/${CI_ENVIRONMENT_SLUG}?authSource=admin"

cat <<EOF | kubectl apply -f -
kind: Namespace
apiVersion: v1
metadata:
  name: $KUBE_NAMESPACE
EOF

kubectl create secret -n $KUBE_NAMESPACE \
  docker-registry gitlab-registry \
  --docker-server="$CI_REGISTRY" \
  --docker-username="$REGISTRY_USER" \
  --docker-password="$REGISTRY_PASSWORD" \
  --docker-email="$GITLAB_USER_EMAIL" \
  -o yaml --dry-run=client | kubectl replace -n $KUBE_NAMESPACE --force -f -

track="${1-stable}"
name="$CI_ENVIRONMENT_SLUG"

if [[ "$track" != "stable" ]]; then
  name="$name-$track"
fi

replicas="1"

env_track="${track^^}"
env_slug="${CI_ENVIRONMENT_SLUG//-/_}"
env_slug="${env_slug^^}"

if [[ "$track" == "stable" ]]; then
  # for stable track get number of replicas from `PRODUCTION_REPLICAS`
  eval new_replicas=\$${env_slug}_REPLICAS
  if [[ -n "$new_replicas" ]]; then
    replicas="$new_replicas"
  fi
else
  # for all tracks get number of replicas from `CANARY_PRODUCTION_REPLICAS`
  eval new_replicas=\$${env_track}_${env_slug}_REPLICAS
  if [[ -n "$new_replicas" ]]; then
    replicas="$new_replicas"
  fi
fi

echo "Deploying $CI_ENVIRONMENT_SLUG (track: $track, replicas: $replicas) with $CI_REGISTRY/$CI_REGISTRY_IMAGE:$CI_REGISTRY_TAG..."
cat <<EOF | kubectl apply -n $KUBE_NAMESPACE --force -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: $name
  namespace: $KUBE_NAMESPACE
  annotations:
    app.gitlab.com/env: $CI_ENVIRONMENT_SLUG
    app.gitlab.com/app: $CI_PROJECT_PATH_SLUG
  labels:
    app: $CI_ENVIRONMENT_SLUG
    track: "$track"
    pipeline_id: "$CI_PIPELINE_ID"
    build_id: "$CI_BUILD_ID"
    tier: web
spec:
  paused: false
  progressDeadlineSeconds: 300
  replicas: $replicas
  selector:
    matchLabels:
      app.kubernetes.io/name: $name
  strategy:
     type: RollingUpdate
     rollingUpdate:
        maxSurge: 0
        maxUnavailable: 1
  template:
    metadata:
      annotations:
        app.gitlab.com/env: $CI_ENVIRONMENT_SLUG
        app.gitlab.com/app: $CI_PROJECT_PATH_SLUG
      labels:
        app.kubernetes.io/name: $name
        app: $CI_ENVIRONMENT_SLUG
        track: "$track"
        tier: web
    spec:
      imagePullSecrets:
      - name: gitlab-registry
      containers:
      - name: app
        image: $CI_REGISTRY/$CI_REGISTRY_IMAGE:$CI_REGISTRY_TAG
        imagePullPolicy: Always
        env:
        - name: CI_PIPELINE_ID
          value: "$CI_PIPELINE_ID"
        - name: CI_BUILD_ID
          value: "$CI_BUILD_ID"
        - name: MONGODB_URI
          value: "$MONGODB_URI"
        - name: SECURE_KEY
          value: "abcde, asadad, kjhhkhj, hjbshjbsa, papakia, ktl, zwakia"
        - name: RESOURCE_INDICATOR_MODE
          value: path
        - name: RESOURCE_INDICATOR_FRAG
          value: /api/v1
        - name: CRYPTOPATH
          value: /container/open-account/crypto
        - name: PROJECT_ROOT_PATH
          value: /container/open-account/
        - name: OAP_ISSUER_URL
          value: https://$CI_ENVIRONMENT_SLUG.$FQDN
        ports:
        - name: web
          containerPort: 36936
          hostPort: 36936
        livenessProbe:
          httpGet:
            scheme: HTTPS
            path: /.well-known/openid-configuration
            port: web
          initialDelaySeconds: 120
          timeoutSeconds: 120
        startupProbe:
          httpGet:
            scheme: HTTPS
            path: /.well-known/openid-configuration
            port: web
          failureThreshold: 120
          periodSeconds: 10
        readinessProbe:
          httpGet:
            scheme: HTTPS
            path: /.well-known/openid-configuration
            port: web
          initialDelaySeconds: 120
          timeoutSeconds: 120
---
apiVersion: v1
kind: Service
metadata:
  name: $CI_ENVIRONMENT_SLUG
  namespace: $KUBE_NAMESPACE
  annotations:
    app.gitlab.com/env: $CI_ENVIRONMENT_SLUG
    app.gitlab.com/app: $CI_PROJECT_PATH_SLUG
  labels:
    app: $CI_ENVIRONMENT_SLUG
    pipeline_id: "$CI_PIPELINE_ID"
    build_id: "$CI_BUILD_ID"
spec:
  ports:
    - name: web
      port: 36936
      targetPort: web
  selector:
    app: $CI_ENVIRONMENT_SLUG
    tier: web
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: $CI_ENVIRONMENT_SLUG
  namespace: $KUBE_NAMESPACE
  labels:
    app: $CI_ENVIRONMENT_SLUG
    pipeline_id: "$CI_PIPELINE_ID"
    build_id: "$CI_BUILD_ID"
  annotations:
    app.gitlab.com/env: $CI_ENVIRONMENT_SLUG
    app.gitlab.com/app: $CI_PROJECT_PATH_SLUG
    kubernetes.io/tls-acme: "true"
    kubernetes.io/ingress.class: "nginx"
    nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"
spec:
  tls:
  - hosts:
    - $CI_ENVIRONMENT_SLUG.$CI_ENVIRONMENT_HOSTNAME
    secretName: ${CI_ENVIRONMENT_SLUG}-tls
  rules:
  - host: $CI_ENVIRONMENT_SLUG.$CI_ENVIRONMENT_HOSTNAME
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: $CI_ENVIRONMENT_SLUG
            port:
              number: 36936
EOF

echo "Waiting for deployment..."
kubectl rollout status -n "$KUBE_NAMESPACE" -w "deployment/$name"

if [[ "$track" == "stable" ]]; then
  echo "Removing canary deployments (if found)..."
  kubectl delete all,ing -l "app=$CI_ENVIRONMENT_SLUG" -l "track=canary" -n "$KUBE_NAMESPACE"
fi

echo "Application is accessible at: ${CI_ENVIRONMENT_URL}"
echo ""
