import { SYMBOLS, phraseClueCell, phraseClues, type Phrase as PhraseRun } from '../../content/horizon'
import { planetDef } from '../../sim/systems/horizon'
import { SymbolMark } from '../horizon/SymbolMark'

/** Four-mark phrase board with world/modal clues for hidden cells. */
export function Phrase({
  phrase,
  symbols,
  cell,
  guess,
  onCell,
  onMark,
  showClue = false,
}: {
  /** Empire 105: name the one hidden cell that is not the world mark. */
  showClue?: boolean
  phrase: PhraseRun | null
  symbols: string[]
  cell: number
  guess: string[]
  onCell: (i: number) => void
  onMark: (mark: string) => void
}) {
  const revealed = new Set<number>(phrase ? phrase.revealed : [])
  const clues = phrase ? phraseClues(phrase) : null
  const clueCell = showClue && phrase ? phraseClueCell(phrase) : null
  const world = phrase ? (planetDef(phrase.planetId)?.name ?? phrase.planetId) : null

  return (
    <div className="hz-phrase" data-coach-id="signal-phrase">
      {clues ? (
        <p className="hz-wants" aria-label="Phrase clues">
          <span>{world}</span>
          <em className="hz-want is-on">{clues.modal}</em>
          <strong>{clues.hint}</strong>
          {clueCell !== null ? <small>{`Ivo’s pin: mark ${clueCell + 1} is not the world mark.`}</small> : null}
        </p>
      ) : (
        <p className="hz-note">The wire is quiet until a relay is up and the next phrase arrives.</p>
      )}
      <div className="hz-slots hz-slots--four" role="group" aria-label="Open phrase">
        {symbols.map((mark, i) => {
          const open = phrase ? !revealed.has(i) : false
          return (
            <button
              key={i}
              type="button"
              className={`hz-slot${cell === i && open ? ' is-on' : ''}`}
              disabled={!open}
              aria-pressed={cell === i && open}
              aria-label={mark ? `Mark ${i + 1} ${mark}` : `Mark ${i + 1} hidden`}
              onClick={() => onCell(i)}
            >
              <span>{i + 1}</span>
              {mark ? <SymbolMark id={mark} /> : '?'}
            </button>
          )
        })}
      </div>
      <div className="hz-chips" role="group" aria-label="Marks">
        {SYMBOLS.map((mark) => (
          <button
            key={mark}
            type="button"
            className={`hz-chip${guess[cell] === mark ? ' is-on' : ''}`}
            aria-label={mark}
            aria-pressed={guess[cell] === mark}
            disabled={!phrase || revealed.has(cell)}
            onClick={() => onMark(mark)}
          >
            <SymbolMark id={mark} />
          </button>
        ))}
      </div>
    </div>
  )
}
