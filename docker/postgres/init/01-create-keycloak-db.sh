#!/bin/sh
# Runs once, on first initialisation of the postgres volume.
# Gives Keycloak its own database inside the same server so realm config survives restarts.
set -eu

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE ${KEYCLOAK_DB:-keycloak} OWNER ${POSTGRES_USER};
EOSQL
