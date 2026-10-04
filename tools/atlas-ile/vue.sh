#!/bin/sh
# usage : tools/atlas-ile/vue.sh <page relative à la racine> "<query>" <sortie.png> [largeur hauteur attente]
R="$(cd "$(dirname "$0")/../.." && pwd -W 2>/dev/null || pwd)"
node "$R/tools/atlas-ile/capture.mjs" "file:///$R/$1?$2" "$3" --w "${4:-1200}" --h "${5:-800}" --attente "${6:-3500}"
