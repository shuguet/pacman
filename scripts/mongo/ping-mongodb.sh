#!/bin/bash
mongosh  $TLS_OPTIONS --port $MONGODB_PORT_NUMBER --eval "db.adminCommand('ping')"