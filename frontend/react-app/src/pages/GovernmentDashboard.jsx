import React, { useEffect, useState } from 'react'
import api from '../services/api'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'
import '../styles/globals.css'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

export default function GovernmentDashboard(){
  // Visual shell only — no allocation logic as requested.
  return (
    <div style={{padding:20}}>
      <header className="page-header">
        <img src="/Background.png" alt="gov"/>
        <div>
          <h2 style={{margin:0,color:'var(--sara-white)'}}>SARA — Government Dashboard</h2>
          <div style={{color:'rgba(255,255,255,0.9)'}}>Overview • Routes • Allocations</div>
        </div>
      </header>

      <div style={{display:'flex',gap:12,alignItems:'center',marginTop:12}}>
        <button className="muted" style={{padding:'0.5rem 0.9rem'}}>Home</button>
        <button className="primary">Run Allocation</button>
        <button className="warn">Publish Snapshot</button>
      </div>

      <section style={{display:'grid',gridTemplateColumns:'1fr 420px',gap:16,marginTop:16}}>
        <div className="card">
          <h3 style={{marginTop:0,color:'#fff'}}>Key Indicators</h3>
          <div style={{display:'flex',gap:12}}>
            <div className="card" style={{flex:1,background:'rgba(255,255,255,0.06)'}}>Total Requested<br/><strong>—</strong></div>
            <div className="card" style={{flex:1,background:'rgba(255,255,255,0.06)'}}>Total Allocated<br/><strong>—</strong></div>
            <div className="card" style={{flex:1,background:'rgba(255,255,255,0.06)'}}>Coverage<br/><strong>—</strong></div>
          </div>

          <div style={{height:340,marginTop:12,background:'rgba(255,255,255,0.03)',borderRadius:8}}>
            {/* Placeholder for route visualization */}
          </div>
        </div>

        <aside>
          <div className="card">
            <h4 style={{marginTop:0,color:'#fff'}}>Summary</h4>
            <p style={{color:'rgba(255,255,255,0.9)'}}>No data loaded — run allocation to populate KPIs.</p>
          </div>
        </aside>
      </section>
    </div>
  )
}
