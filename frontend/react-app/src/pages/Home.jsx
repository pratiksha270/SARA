import React from 'react'
import { Link } from 'react-router-dom'

export default function Home(){
  return (
    <main className="container hero">
      <div className="hero-left">
        <h1>SARA — Smart Aid Routing & Allocation</h1>
        <p><strong>
          Plan fair, fast, practical disaster relief. Warehouses share stock, relief centers share
          needs and urgency, and officials review a clear plan with optimized routes.
        </strong></p>

        <div className="hero-cta">
          <Link to="/warehouse"><button className="primary">Go to Warehouse Portal</button></Link>
          <Link to="/relief"><button className="warn">Go to Relief Center Portal</button></Link>
          <Link to="/gov-login"><button className="muted">Government Login</button></Link>
        </div>
      </div>

      <div className="hero-right">
        <div className="card hero-card">
          <h3>Demo tips</h3>
          <ol>
            <li><b>Warehouse Portal</b>: upload/add warehouse stocks (CSV / JSON / form).</li>
            <li><b>Relief Center Portal</b>: add people, needs, urgency, and affected areas.</li>
            <li><b>Government Dashboard</b>: run allocation (with Dijkstra routes) and publish.</li>
            <li>Check <b>“Met / Partial / Unmet”</b>, total coverage %, per-resource charts, and
              route distances.</li>
          </ol>
        </div>
      </div>
    </main>
  )
}
