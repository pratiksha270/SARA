import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function GovLogin(){
  const [user,setUser]=useState('')
  const [pass,setPass]=useState('')
  const [err,setErr]=useState('')
  const nav = useNavigate()

  function login(){
    if(user==='admin' && pass==='admin'){
      // placeholder: the dashboard will be added later
      nav('/');
    } else setErr('Invalid username or password.')
  }

  return (
    <main className="container" style={{maxWidth:480,marginTop:48}}>
      <div className="card">
        <h1 className="page-title">Government Login</h1>
        <p className="page-subtitle">Enter demo credentials to open the dashboard.</p>
        <div style={{marginTop:16,display:'flex',flexDirection:'column',gap:8}}>
          <label><span style={{fontSize:12,color:'#4b5563'}}>Username</span><input value={user} onChange={e=>setUser(e.target.value)} style={{width:'100%',padding:8,borderRadius:8}}/></label>
          <label><span style={{fontSize:12,color:'#4b5563'}}>Password</span><input type="password" value={pass} onChange={e=>setPass(e.target.value)} style={{width:'100%',padding:8,borderRadius:8}}/></label>
        </div>
        <div className="btn-row" style={{marginTop:12}}>
          <button onClick={login} className="primary">Login</button>
        </div>
        <p style={{color:'#b91c1c',fontSize:12,marginTop:8}}>{err}</p>
        <p style={{fontSize:12,color:'#6b7280'}}>Demo credentials: <b>admin / admin</b></p>
      </div>
    </main>
  )
}
