#!/bin/bash
# Validate a team's acquisition tree data
# Usage: ./validate-team.sh CHA

TEAM="${1:?Usage: validate-team.sh TEAM_ABBR}"
TEAM_LOWER=$(echo "$TEAM" | tr '[:upper:]' '[:lower:]')
DATA_DIR="/home/ubuntu/nba-acquisition-tree/app/data/acquisition-trees"
TSX_FILE="/home/ubuntu/nba-acquisition-tree/app/src/components/TeamAcquisitionTree.tsx"

echo "🏀 Validating $TEAM..."
echo "========================="

# 1. Count player files
FILES=$(ls "$DATA_DIR"/${TEAM_LOWER}-*.json 2>/dev/null | wc -l)
echo "📁 Player files: $FILES"

# 2. Validate JSON
echo ""
echo "📋 JSON Validation:"
INVALID=0
for f in "$DATA_DIR"/${TEAM_LOWER}-*.json; do
  if ! python3 -m json.tool "$f" > /dev/null 2>&1; then
    echo "  ❌ Invalid JSON: $(basename $f)"
    INVALID=$((INVALID + 1))
  fi
done
[ $INVALID -eq 0 ] && echo "  ✅ All files valid JSON"

# 3. Check origins
echo ""
echo "🌱 Origin Check:"
for f in "$DATA_DIR"/${TEAM_LOWER}-*.json; do
  PLAYER=$(python3 -c "import json; print(json.load(open('$f'))['_meta']['player'])" 2>/dev/null)
  HAS_ORIGIN=$(grep -c '"isOrigin": true' "$f")
  if [ "$HAS_ORIGIN" -eq 0 ]; then
    echo "  ❌ No origin: $PLAYER"
  fi
done

# 4. Check ESPN IDs in TSX
echo ""
echo "🖼️  ESPN ID Validation:"
for f in "$DATA_DIR"/${TEAM_LOWER}-*.json; do
  PLAYER=$(python3 -c "import json; print(json.load(open('$f'))['_meta']['player'])" 2>/dev/null)
  
  # Check if player has ESPN ID in map
  ESPN_ID=$(grep "\"$PLAYER\":" "$TSX_FILE" | grep -oP '"(\d+)"' | tr -d '"' | tail -1)
  
  if [ -z "$ESPN_ID" ]; then
    echo "  ❌ Missing ESPN ID: $PLAYER"
    continue
  fi
  
  # Check for duplicate entries
  DUPES=$(grep -c "\"$PLAYER\":" "$TSX_FILE")
  if [ "$DUPES" -gt 1 ]; then
    echo "  ⚠️  Duplicate ESPN entry ($DUPES): $PLAYER"
  fi
  
  # Validate headshot URL
  HTTP_STATUS=$(curl -sI "https://a.espncdn.com/combiner/i?img=/i/headshots/nba/players/full/${ESPN_ID}.png&w=350&h=254" -o /dev/null -w "%{http_code}" 2>/dev/null)
  
  if [ "$HTTP_STATUS" = "200" ]; then
    echo "  ✅ $PLAYER ($ESPN_ID)"
  else
    echo "  ❌ Headshot 404: $PLAYER ($ESPN_ID) — WRONG ID"
  fi
done

# 5. Check for missing draft info
echo ""
echo "🎯 Draft Info Check:"
for f in "$DATA_DIR"/${TEAM_LOWER}-*.json; do
  PLAYER=$(python3 -c "import json; print(json.load(open('$f'))['_meta']['player'])" 2>/dev/null)
  ACQ_TYPE=$(python3 -c "import json; print(json.load(open('$f'))['tree'].get('acquisitionType',''))" 2>/dev/null)
  HAS_PICK=$(grep -c '"draftPick"' "$f")
  
  if [[ "$ACQ_TYPE" == "draft" || "$ACQ_TYPE" == "draft-night-trade" ]] && [ "$HAS_PICK" -eq 0 ]; then
    echo "  ❌ Drafted but missing draftPick: $PLAYER"
  fi
done

# 6. Summary
echo ""
echo "========================="
echo "📊 Summary for $TEAM: $FILES players"
