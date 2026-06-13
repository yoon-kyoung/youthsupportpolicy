let cache = null
let inflight = null

export function getPolicies() {
  return cache ?? []
}

export function loadPolicies() {
  if (cache) return Promise.resolve(cache)
  if (!inflight) {
    inflight = fetch(`${import.meta.env.BASE_URL}policies.json`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(data => {
        cache = data
        return cache
      })
      .catch(err => {
        inflight = null
        throw err
      })
  }
  return inflight
}
