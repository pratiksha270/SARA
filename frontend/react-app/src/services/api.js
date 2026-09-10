const BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000'

async function request(path, opts = {}){
  const url = path.startsWith('http') ? path : `${BASE}${path}`
  const res = await fetch(url, opts)
  if(!res.ok){
    const text = await res.text()
    throw new Error(`${res.status} ${text}`)
  }
  return res.json()
}

const api = {
  get: (path) => request(path, { method: 'GET' }),
  post: (path, body) => request(path, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(body) })
}

export default api
