import React, { useState } from 'react'
import api from '../services/api'

export default function Warehouse(){
  const [name,setName] = useState('')
  const [city,setCity] = useState('')
  const [pairs,setPairs] = useState('')
  const [draft, setDraft] = useState([])
  const [msg, setMsg] = useState('')

  function parsePairs(str){
    if(!str) return []
    return str.split(',').map(p=>{ const [r,q]=p.split(':').map(s=>s&&s.trim()); return {resource:r,quantity: Number(q||0)} }).filter(x=>x.resource && Number.isFinite(x.quantity))
  }

  function addQuick(){
    const p = parsePairs(pairs)
    if(!name||!city||!p.length){ alert('Enter name, city, and at least one resource.'); return }
    const rows = p.flatMap(item=> ({ name, city, resource: item.resource, quantity: item.quantity }))
    setDraft(d=>[...d, ...rows])
    setName(''); setCity(''); setPairs('')
  }

  async function submit(){
    if(!draft.length) { alert('Nothing to submit'); return }
    const map = new Map()
    draft.forEach(r=>{
      const key = r.name+'__'+r.city
      if(!map.has(key)) map.set(key,{name:r.name,city:r.city,resources:[]})
      map.get(key).resources.push({resource:r.resource,quantity:r.quantity})
    })
    try{
      await api.post('/admin/upload/warehouse',{warehouses:Array.from(map.values())})
      setDraft([])
      setMsg('Submitted ✔')
    }catch(e){ alert('Submit failed: '+e.message) }
  }

  return (
    <div className="container portal-shell">
      <div className="card warehouse-card">
        <h3>Warehouse Stock — Quick Add</h3>
        <div className="form-row-3">
          <div><label>Warehouse Name<input value={name} onChange={e=>setName(e.target.value)} /></label></div>
          <div><label>City<input value={city} onChange={e=>setCity(e.target.value)} /></label></div>
          <div><label>Resources (Resource:Qty, Resource:Qty)<input value={pairs} onChange={e=>setPairs(e.target.value)} placeholder="Food:300, Water:200" /></label></div>
        </div>
        <div className="btn-row"><button onClick={addQuick} className="primary">Add to Draft</button><button onClick={()=>setDraft([])} className="muted">Clear Draft</button></div>
      </div>

      <section className="card warehouse-card warehouse-draft">
        <h3>Stock Draft (to be submitted)</h3>
        <div className="table-wrap"><table className="table"><thead><tr><th>#</th><th>Warehouse</th><th>City</th><th>Resource</th><th>Quantity</th></tr></thead>
        <tbody>{draft.map((r,i)=>(<tr key={i}><td>{i+1}</td><td>{r.name}</td><td>{r.city}</td><td>{r.resource}</td><td>{r.quantity}</td></tr>))}</tbody>
        </table></div>
        <div className="btn-row" style={{marginTop:'1rem'}}>
          <button onClick={submit} className="primary">Submit Stock to Server</button>
        </div>
        <div style={{marginTop:8,color:'#0b7285',fontWeight:700}}>{msg}</div>
      </section>
    </div>
  )
}
