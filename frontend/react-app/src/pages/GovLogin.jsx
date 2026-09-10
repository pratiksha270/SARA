import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function GovLogin(){
  const [user,setUser]=useState('')
  const [pass,setPass]=useState('')
  const [err,setErr]=useState('')
  const nav = useNavigate()

  function login(){
    if(user==='admin' && pass==='admin'){
      // demo login -> go to dashboard
      nav('/dashboard');
    } else setErr('Invalid username or password.')
  }

  return (
    <main style={{minHeight:'80vh',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div className="card" style={{maxWidth:420,width:'100%'}}>
        <h1 style={{marginTop:0}}>Government Login</h1>
        <p className="page-subtitle">Enter demo credentials to open the dashboard.</p>
        <div style={{marginTop:16,display:'flex',flexDirection:'column',gap:8}}>
          <label><span style={{fontSize:12,color:'var(--sara-muted)'}}>Username</span><input value={user} onChange={e=>setUser(e.target.value)} style={{width:'100%',padding:10,borderRadius:8}}/></label>
          <label><span style={{fontSize:12,color:'var(--sara-muted)'}}>Password</span><input type="password" value={pass} onChange={e=>setPass(e.target.value)} style={{width:'100%',padding:10,borderRadius:8}}/></label>
        </div>
        <div className="btn-row" style={{marginTop:12}}>
          <button onClick={login} className="primary">Login</button>
          <button onClick={() => nav('/')} className="muted">Back</button>
        </div>
        <p style={{color:'#b91c1c',fontSize:12,marginTop:8}}>{err}</p>
        <p style={{fontSize:12,color:'var(--sara-muted)'}}>Demo credentials: <b>admin / admin</b></p>
      </div>
    </main>
  )
}
