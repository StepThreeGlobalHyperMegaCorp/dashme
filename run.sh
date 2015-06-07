#!/bin/sh

mkdir -p mongo_files
echo \$ mongod
pgrep mongod || (./mongo/bin/mongod --dbpath ./mongo_files --quiet -httpinterface --rest &)

args=$( getopt rl $* )
set -- $args

for i; do
    case "$i" in
        -r)
            ./mongo/bin/mongo candidate.1.mongolayer.com:10406/app36180534 -u lucas -pmypasswordissecure
            exit 1;;
        -l)
            ./mongo/bin/mongo dashme
            exit 1;;
    esac
done

echo \$ npm install
npm install

echo \$ nodemon -V -w server.js $@
node node_modules/nodemon/bin/nodemon.js -V server.js $@
