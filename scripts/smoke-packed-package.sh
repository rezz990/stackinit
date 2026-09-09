#!/usr/bin/env bash

set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
temporary_directory="$(mktemp -d "${TMPDIR:-/tmp}/stackinit-package-smoke.XXXXXX")"
tarball=""

cleanup() {
  rm -rf "$temporary_directory"
  if [[ -n "$tarball" ]]; then
    rm -f "$repository_root/$tarball"
  fi
}
trap cleanup EXIT

cd "$repository_root"
tarball="$(npm pack | tail -n 1)"

cd "$temporary_directory"
npm init --yes >/dev/null
npm install "$repository_root/$tarball" --ignore-scripts --no-audit --no-fund
npx --no-install stackinit --help
npx --no-install stackinit --version
