#!/bin/sh

mkdir -p mongo_files
echo \$ mongod
pgrep mongod || (./mongo/bin/mongod --dbpath ./mongo_files --quiet -httpinterface --rest &)

echo \$ npm install
npm install

echo \$ nodemon -V -w server.js $@
node node_modules/nodemon/bin/nodemon.js -V server.js $@
