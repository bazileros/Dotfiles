#!/bin/bash
# paced targeted query: $1=query, $2=label
q="$1"; label="$2"
curl -sL --max-time 20 "https://skills.sh/api/search?q=$q&limit=200" > "/tmp/opencode/targeted/${label}.json"
sleep 2.2
