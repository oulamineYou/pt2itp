set -eu -o pipefail
DBNAME=mbpl_us_wv_address_both
PSQL="psql -t -q -U postgres $DBNAME"
dropdb --if-exists -U postgres $DBNAME
createdb -U postgres $DBNAME
echo 'CREATE EXTENSION postgis;' | $PSQL
$PSQL < mbpl_us_wv_address_both-after-collapse.pgsql
node reload.js
