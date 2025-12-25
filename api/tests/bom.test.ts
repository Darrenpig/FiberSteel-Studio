import assert from 'assert'

async function post(url: string, body: any) {
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
  const items = [
    { partNo: 'ST-20x20x2', name: '方管', spec: '20×20×t2×L1000', qty: 10, unit: '件', remark: 'Q235' },
  ]
  {
    const { ok, data } = await post('http://localhost:3001/api/bom/export/excel', { items, pageSize: 5 })
    assert.ok(ok, 'excel export ok')
    assert.ok(Array.isArray(data.files) && data.files.length >= 1, 'files returned')
  }
  {
    const { ok, data } = await post('http://localhost:3001/api/bom/export/pdf', { items, pageSize: 10 })
    assert.ok(ok, 'pdf export ok')
    assert.ok(Array.isArray(data.files) && data.files.length >= 1, 'files returned')
  }
  {
    const { ok, data } = await get('http://localhost:3001/api/bom/history')
    assert.ok(ok, 'history ok')
    assert.ok(Array.isArray(data.history), 'history array')
  }
  console.log('BOM tests passed')
}

run().catch((e) => {
  console.error('BOM tests failed', e)
  process.exit(1)
})

