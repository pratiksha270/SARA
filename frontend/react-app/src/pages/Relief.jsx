import React, { useState } from 'react'
import api from '../services/api'

export default function Relief(){
  const [name,setName]=useState('')
  const [city,setCity]=useState('')
  const [people,setPeople]=useState(0)
  const [urg,setUrg]=useState(0)
  const [pairs,setPairs]=useState('')
  const [draft,setDraft]=useState([])
  const [msg,setMsg]=useState('')

  function parsePairs(str){
    if(!str) return []
    return str.split(';').map(p=>{ const [r,q]=p.split(':').map(s=>s&&s.trim()); return {resource:r,quantity: Number(q||0)} }).filter(x=>x.resource && Number.isFinite(x.quantity))
  }

  function addQuick(){
    const needs=parsePairs(pairs)
    if(!name||!city||!needs.length){ alert('Provide Name, City and at least one Need'); return }
    const rows = needs.flatMap(n=> ({ name, city, resource:n.resource, quantity:n.quantity, people, urgency:urg }))
    setDraft(d=>[...d,...rows])
    setName(''); setCity(''); setPeople(0); setUrg(0); setPairs('')
  }

  function groupAreas(flat){
    const map = new Map();
    flat.forEach(r=>{
      const key = `${r.name}__${r.city}__${r.people}__${r.urgency}`;
      if(!map.has(key)) map.set(key,{name:r.name,city:r.city,people:r.people,urgency:r.urgency,resources:[]});
      map.get(key).resources.push({resource:r.resource,quantity:r.quantity});
    });
    return Array.from(map.values())
  }

  async function submit(){
    if(!draft.length){ alert('Nothing to submit.'); return }
    try{
      await api.post('/admin/upload/relief',{areas:groupAreas(draft)})
      setDraft([])
      setMsg('Submitted ✔')
    }catch(e){ alert('Submit failed: '+e.message) }
  }

  return (
    <div className="container portal-shell">
      <div className="card span-7">
        <h3>Relief Needs (Form / CSV / JSON)</h3>
        <div className="grid">
          <label>Name (area / center)<input value={name} onChange={e=>setName(e.target.value)} /></label>
          <label>City<input value={city} onChange={e=>setCity(e.target.value)} /></label>
          <label>People affected<input type="number" value={people} onChange={e=>setPeople(Number(e.target.value))} /></label>
          <label>Urgency (0–100)<input type="number" value={urg} onChange={e=>setUrg(Number(e.target.value))} /></label>
        </div>
        <label style={{display:'block',marginTop:8}}>Needs (Resource:Qty; Resource:Qty)<input value={pairs} onChange={e=>setPairs(e.target.value)} placeholder="Food:120; Water:60; Medicine:40" /></label>
        <div className="btn-row" style={{marginTop:8}}><button onClick={addQuick} className="primary">Add to Draft</button><button onClick={()=>setDraft([])} className="muted">Clear Draft</button></div>
      </div>

      <section className="card section">
        <h3>Draft (to be submitted)</h3>
        <div className="table-wrap"><table id="draft"><thead><tr><th>#</th><th>Name</th><th>City</th><th>Resource</th><th>Qty</th><th>People</th><th>Urgency</th></tr></thead>
        <tbody>{draft.map((r,i)=>(<tr key={i}><td>{i+1}</td><td>{r.name}</td><td>{r.city}</td><td>{r.resource}</td><td>{r.quantity}</td><td>{r.people}</td><td>{r.urgency}</td></tr>))}</tbody></table></div>
        <div className="btn-row"><button onClick={submit} className="primary">Submit to Server</button></div>
        <div style={{marginTop:8,color:'#0b7285',fontWeight:700}}>{msg}</div>
      </section>
    </div>
  )
}
