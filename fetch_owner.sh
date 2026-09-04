#!/bin/bash
o="$1"
curl -sL --max-time 20 "https://skills.sh/api/search?q=$o&limit=200" > "/tmp/opencode/owner_results/${o//\//_}.json"
