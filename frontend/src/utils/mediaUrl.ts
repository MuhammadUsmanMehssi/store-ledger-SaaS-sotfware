export function mediaUrl(path?: string | null) {
  if (!path) return null
  if (path.startsWith('http')) return path
  const api = import.meta.env.VITE_API_URL || 'http://localhost:5055/api'
  const origin = api.replace(/\/api\/?$/, '')
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`
}
