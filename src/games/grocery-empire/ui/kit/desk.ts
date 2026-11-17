import { createContext, useContext } from 'react'

/**
 * Inside a PlayFrame's desk area a `Sheet` renders in place as a titled card:
 * always visible, no opener button, no side drawer. Detail sheets elsewhere stay sheets.
 */
export const DeskInline = createContext(false)
export const useDeskInline = () => useContext(DeskInline)
