#!/bin/bash
# Batch generate RosterDNA card library
# Saves PNGs to public/cards/

BASE="http://localhost:3456"
OUT_DIR="/home/ubuntu/nba-acquisition-tree/app/public/cards"
mkdir -p "$OUT_DIR/team" "$OUT_DIR/player" "$OUT_DIR/chain"

echo "=== Generating Team Cards (30) ==="
for team in ATL BKN BOS CHA CHI CLE DAL DEN DET GSW HOU IND LAC LAL MEM MIA MIL MIN NOP NYK OKC ORL PHI PHX POR SAC SAS TOR UTA WAS; do
  echo "  $team..."
  curl -s "$BASE/api/card/team/$team" -o "$OUT_DIR/team/$team.png"
done

echo ""
echo "=== Generating Marquee Player Cards (50) ==="
# Top players from greatest chains research + stars
PLAYERS=(
  "bos-jayson-tatum" "bos-jaylen-brown" "bos-jrue-holiday" "bos-nikola-vucevic" "bos-derrick-white"
  "okc-shai-gilgeous-alexander" "okc-chet-holmgren" "okc-jalen-williams" "okc-alex-caruso"
  "dal-luka-doncic" "dal-kyrie-irving" "dal-klay-thompson"
  "den-nikola-jokic" "den-jamal-murray"
  "gsw-stephen-curry" "gsw-draymond-green" "gsw-kristaps-porzingis"
  "mil-giannis-antetokounmpo" "mil-damian-lillard"
  "phi-joel-embiid" "phi-tyrese-maxey" "phi-paul-george"
  "nyk-karl-anthony-towns" "nyk-jalen-brunson" "nyk-mikal-bridges" "nyk-og-anunoby"
  "lal-lebron-james" "lal-anthony-davis" "lal-austin-reaves"
  "lac-james-harden" "lac-kawhi-leonard"
  "mia-jimmy-butler" "mia-bam-adebayo" "mia-tyler-herro"
  "min-anthony-edwards" "min-rudy-gobert" "min-julius-randle"
  "cle-donovan-mitchell" "cle-darius-garland" "cle-evan-mobley"
  "mem-ja-morant" "mem-desmond-bane"
  "sac-domantas-sabonis" "sac-deaaron-fox"
  "hou-alperen-sengun" "hou-jalen-green"
  "ind-tyrese-haliburton" "ind-pascal-siakam"
  "phx-kevin-durant" "phx-devin-booker"
)

count=0
for slug in "${PLAYERS[@]}"; do
  echo "  $slug..."
  curl -s "$BASE/api/card/player/$slug" -o "$OUT_DIR/player/${slug}.png" 2>/dev/null
  # Also generate chain card
  curl -s "$BASE/api/card/chain/$slug" -o "$OUT_DIR/chain/${slug}.png" 2>/dev/null
  count=$((count + 1))
done

echo ""
echo "=== Summary ==="
echo "Team cards: $(ls $OUT_DIR/team/*.png 2>/dev/null | wc -l)"
echo "Player cards: $(ls $OUT_DIR/player/*.png 2>/dev/null | wc -l)"
echo "Chain cards: $(ls $OUT_DIR/chain/*.png 2>/dev/null | wc -l)"
echo "Total PNGs: $(find $OUT_DIR -name '*.png' | wc -l)"
echo "Total size: $(du -sh $OUT_DIR | cut -f1)"
