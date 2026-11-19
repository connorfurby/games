/** Real campaign save — never overwritten by DevMode. */
export const PRIMARY_SAVE_ID = 'signal-decay'

/** Isolated sandbox save — autosave lands here only while DevMode is active. */
export const DEV_SAVE_ID = 'signal-decay-dev'

export const SAVE_ID = PRIMARY_SAVE_ID

const SESSION_KEY = 'sd.activeSaveId'

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

export function restoreActiveSaveIdFromSession() {
  try {
    const v = sessionStorage.getItem(SESSION_KEY)
    if (v === DEV_SAVE_ID || v === PRIMARY_SAVE_ID) activeSaveId = v
  } catch {
    /* ignore */
  }
}
