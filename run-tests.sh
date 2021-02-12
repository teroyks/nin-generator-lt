#!/usr/bin/env bash
deno test --importmap=import_map.json --unstable $@
