#!/bin/bash
mongosh  $TLS_OPTIONS --port $MONGODB_PORT_NUMBER --eval 'db.hello().isWritablePrimary || db.hello().secondary' | grep 'true'