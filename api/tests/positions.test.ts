import assert from 'assert'

type PositionPayload = { group: string; instanceIndex: number; x: number; y: number; z: number }

async function post<T>(url: string, body: T) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return { ok: res.ok, data }
}

async function get(url: string) {
  const res = await fetch(url)
  const data = await res.json()
  return { ok: res.ok, data }
}

async function run() {
  {
    const { ok, data } = await post('http://localhost:3001/api/positions/save', { group: 'square-tube', instanceIndex: 0, x: 10, y: 0, z: 20 })
    assert.ok(ok, 'save position ok')
    assert.equal(data.record.instanceIndex, 0)
    assert.equal(data.record.x, 10)
  }
  {
    const { ok, data } = await get('http://localhost:3001/api/positions')
    assert.ok(ok, 'list positions ok')
    assert.ok(Array.isArray(data.positions), 'positions array')
  }
  console.log('Positions tests passed')
}

run().catch((e) => {
  console.error('Positions tests failed', e)
  process.exit(1)
})

