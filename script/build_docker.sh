BUILD_DIR=build
CONTAINER_DIR=container
SRC_DIR=src
CRYPTO_DIR=crypto
KEY_FILENAME=key.pem
CERT_FILENAME=cert.pem
CRYPTO_DEST=$BUILD_DIR/$CONTAINER_DIR/$CRYPTO_DIR/

mkdir $BUILD_DIR

cp -r $CONTAINER_DIR $BUILD_DIR
cp -r $CRYPTO_DIR $BUILD_DIR/$CONTAINER_DIR

cp index.js $BUILD_DIR/$CONTAINER_DIR
cp package.json $BUILD_DIR/$CONTAINER_DIR

cp $CRYPTO_DIR/$KEY_FILENAME $CRYPTO_DEST
cp $CRYPTO_DIR/$CERT_FILENAME $CRYPTO_DEST

cp -r $SRC_DIR $BUILD_DIR/$CONTAINER_DIR

cd $BUILD_DIR/$CONTAINER_DIR

docker build -t arsteps-auth .
