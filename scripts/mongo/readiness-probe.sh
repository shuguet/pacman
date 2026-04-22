#!/bin/bash
# Run the proper check depending on the version
[[ $(mongod -version | grep "db version") =~ ([0-9]+\.[0-9]+\.[0-9]+) ]] && VERSION=${BASH_REMATCH[1]}
. /opt/bitnami/scripts/libversion.sh
VERSION_MAJOR="$(get_sematic_version "$VERSION" 1)"
VERSION_MINOR="$(get_sematic_version "$VERSION" 2)"
VERSION_PATCH="$(get_sematic_version "$VERSION" 3)"
readiness_test='db.isMaster().ismaster || db.isMaster().secondary'
if [[ ( "$VERSION_MAJOR" -ge 5 ) || ( "$VERSION_MAJOR" -ge 4 && "$VERSION_MINOR" -ge 4 && "$VERSION_PATCH" -ge 2 ) ]]; then
    readiness_test='db.hello().isWritablePrimary || db.hello().secondary'
fi
mongosh  $TLS_OPTIONS --port $MONGODB_PORT_NUMBER --eval "${readiness_test}" | grep 'true'