#!/usr/bin/env sh
./run-tests.sh && \
deno bundle --import-map=import_map.json --unstable main.ts nin.js
