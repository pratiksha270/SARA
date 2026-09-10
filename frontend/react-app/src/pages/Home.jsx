import React from 'react'
import { Link } from 'react-router-dom'

export default function Home(){
  return (
    <main>
      <header className="app-header">
        <div className="brand"><h1>SARA</h1><div style={{fontSize:12,color:'rgba(255,255,255,0.85)'}}>Smart Aid Routing & Allocation</div></div>
        <nav style={{display:'flex',gap:8}}>
          <Link to="/"><button className="muted">Home</button></Link>
          <Link to="/dashboard"><button className="primary">Dashboard</button></Link>
        </nav>
      </header>

      <section className="container hero">
        <div className="hero-left">
          <h1 className="page-title">SARA — Smart Aid Routing & Allocation</h1>
          <p className="page-subtitle">Plan fair, fast, practical disaster relief. Warehouses share stock, relief centers share needs and urgency, and officials review a clear plan with optimized routes.</p>

          <div className="hero-cta">
            <Link to="/warehouse"><button className="primary">Go to Warehouse Portal</button></Link>
            <Link to="/relief"><button className="warn">Go to Relief Center Portal</button></Link>
            <Link to="/gov-login"><button className="muted">Government Login</button></Link>
          </div>

          <div className="portal-cards">
            <div className="portal-card card">
              <img src="/warehouse.jpeg" alt="Warehouse" />
              <div className="card-body">
                <h4>Warehouse Portal</h4>
                <p>Manage warehouse stock, upload CSV/JSON, add quick supplies.</p>
              </div>
            </div>

            <div className="portal-card card">
              <img src="/relief.jpeg" alt="Relief" />
              <div className="card-body">
                <h4>Relief Center Portal</h4>
                <p>Add affected areas, people counts, urgency and needs.</p>
              </div>
            </div>

            <div className="portal-card card">
              <img src="/Background.png" alt="Government" />
              <div className="card-body">
                <h4>Government Dashboard</h4>
                <p>Run allocation, review KPIs and visualize planned routes.</p>
              </div>
            </div>
          </div>
        </div>

        <aside className="hero-right demo-tips">
          <div className="card hero-card">
            <h3>Demo tips</h3>
            <ol>
              <li><b>Warehouse Portal</b>: upload/add warehouse stocks (CSV / JSON / form).</li>
              <li><b>Relief Center Portal</b>: add people, needs, urgency, and affected areas.</li>
              <li><b>Government Dashboard</b>: run allocation (with Dijkstra routes) and publish.</li>
            </ol>
          </div>
        </aside>
      </section>
    </main>
  )
}
