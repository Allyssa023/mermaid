const LAST_VIEWED_PREFIX = 'mermaid:deals:lastViewed:'

export const lastViewedKey = (dealId) => `${LAST_VIEWED_PREFIX}${dealId}`

export const readLastViewed = (dealId) => {
  try {
    const raw = localStorage.getItem(lastViewedKey(dealId))
    return raw ? new Date(raw) : null
  } catch {
    return null
  }
}

export const writeLastViewed = (dealId) => {
  try {
    localStorage.setItem(lastViewedKey(dealId), new Date().toISOString())
  } catch {
    /* ignore */
  }
}
