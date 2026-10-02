// Genera src/app/data/puzzles.json a partir de la base de datos pública de puzzles de Lichess (CC0).
// Uso: node scripts/build-puzzles.mjs <ruta-al-csv>
// El CSV se puede obtener sin descargar el fichero entero (~300 MB):
//   curl -s -r 0-3000000 https://database.lichess.org/lichess_db_puzzle.csv.zst | zstd -dc | head -n 20001 > puzzles.csv
import { Chess } from 'chess.js'
import { readFileSync, writeFileSync } from 'node:fs'

const PER_BUCKET = 8
const BUCKET_SIZE = 100
const MIN_RATING = 400
const MAX_RATING = 2500

const [, , csvPath] = process.argv
if (!csvPath) throw new Error('Indica la ruta al CSV de puzzles')

const rows = readFileSync(csvPath, 'utf8').trim().split('\n').slice(1)
const buckets = new Map()

for (const row of rows) {
  const [id, fen, moves, rating, deviation, popularity, plays, themes] = row.split(',')
  const r = Number(rating)
  if (r < MIN_RATING || r >= MAX_RATING) continue
  if (Number(deviation) > 90 || Number(popularity) < 85 || Number(plays) < 300) continue

  const solution = moves.split(' ')
  const chess = new Chess(fen)
  try {
    for (const uci of solution) chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })
  } catch {
    continue
  }

  const bucket = Math.floor(r / BUCKET_SIZE)
  const list = buckets.get(bucket) ?? []
  if (list.length >= PER_BUCKET) continue
  list.push({ id, fen, moves: solution, rating: r, themes: themes.split(' ') })
  buckets.set(bucket, list)
}

const puzzles = [...buckets.values()].flat().sort((a, b) => a.rating - b.rating)
writeFileSync(new URL('../src/app/data/puzzles.json', import.meta.url), JSON.stringify(puzzles))
console.log(`Guardados ${puzzles.length} puzzles (${puzzles[0]?.rating}–${puzzles.at(-1)?.rating})`)
