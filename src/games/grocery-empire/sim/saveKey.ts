/** Real campaign save — never overwritten by DevMode. */
export const PRIMARY_SAVE_ID = 'grocery-empire'

/** Isolated sandbox save — autosave/slots land here only while DevMode is active. */
export const DEV_SAVE_ID = 'grocery-empire-dev'

/** @deprecated Prefer PRIMARY_SAVE_ID or getActiveSaveId(). */
export const SAVE_ID = PRIMARY_SAVE_ID

const SESSION_KEY = 'ge.activeSaveId'

let activeSaveId: string = PRIMARY_SAVE_ID

export function getActiveSaveId(): string {
  return activeSaveId
}

export function isDevSave(): boolean {
  return activeSaveId === DEV_SAVE_ID
}

export function setActiveSaveId(id: typeof PRIMARY_SAVE_ID | typeof DEV_SAVE_ID) {
  activeSaveId = id
  try {
    sessionStorage.setItem(SESSION_KEY, id)
  } catch {
    /* ignore */
  }
}

/** Sync module flag from sessionStorage (refresh on /dev). */
export function restoreActiveSaveIdFromSession() {
  try {
    const v = sessionStorage.getItem(SESSION_KEY)
    if (v === DEV_SAVE_ID || v === PRIMARY_SAVE_ID) activeSaveId = v
  } catch {
    /* ignore */
  }
}
