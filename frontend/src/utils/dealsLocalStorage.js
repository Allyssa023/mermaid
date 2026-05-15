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

export const ONBOARDING_DISMISSED_KEY = 'mermaid:deals:onboardingDismissed'

export const isOnboardingDismissed = () => {
  try {
    return localStorage.getItem(ONBOARDING_DISMISSED_KEY) === '1'
  } catch {
    return true // fail-closed: hide hint when storage is unavailable
  }
}

export const dismissOnboarding = () => {
  try {
    localStorage.setItem(ONBOARDING_DISMISSED_KEY, '1')
  } catch {
    // best-effort; hint will reappear next session if storage blocked
  }
}
