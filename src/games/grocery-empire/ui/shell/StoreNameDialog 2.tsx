import { useState } from 'react'
import { STORE_NAME_MAX, cleanStoreName, storeDisplayName } from '../../sim/state'
import { useGame } from '../GameContext'
import { Button, Modal } from '../kit'

/**
 * Name your store. The name goes on the storefront sign and the top bar. It is display
 * only: it changes no numbers, and it can be changed or cleared at any time.
 */
export function StoreNameDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state: s, dispatch, reducedMotion } = useGame()
  const [draft, setDraft] = useState(s.storeName)
  const clean = cleanStoreName(draft)
  const save = () => {
    if (clean !== s.storeName) dispatch({ type: 'setStoreName', name: clean })
    onClose()
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Name your store"
      reducedMotion={reducedMotion}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button tone="free" onClick={save}>
            {clean ? 'Put it on the sign' : 'Use no name'}
          </Button>
        </>
      }
    >
      <form
        className="sn-form"
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <label className="sn-form__label" htmlFor="sn-name">
          Store name
        </label>
        <input
          id="sn-name"
          className="sn-form__input"
          type="text"
          value={draft}
          maxLength={STORE_NAME_MAX}
          placeholder="Grocery Empire"
          autoComplete="off"
          spellCheck={false}
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
        />
        <p className="sn-form__note">
          Shows on your storefront sign and the top bar. Up to {STORE_NAME_MAX} characters. It changes nothing about
          the numbers.
        </p>
        <p className="sn-form__preview" aria-live="polite">
          Sign will read: <strong>{clean || storeDisplayName({ storeName: '' })}</strong>
        </p>
      </form>
    </Modal>
  )
}
