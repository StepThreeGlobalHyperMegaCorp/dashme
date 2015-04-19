#!/bin/sh

echo \$ npm install
npm install

echo \$ nodemon -V -w server.js $@
node node_modules/nodemon/bin/nodemon.js -V server.js $@
