import React from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import Home from './pages/Home'
import Warehouse from './pages/Warehouse'
import Relief from './pages/Relief'
import GovLogin from './pages/GovLogin'

export default function App(){
  return (
    <div>
      <Routes>
        <Route path="/" element={<Home/>} />
        <Route path="/warehouse" element={<Warehouse/>} />
        <Route path="/relief" element={<Relief/>} />
        <Route path="/gov-login" element={<GovLogin/>} />
      </Routes>
    </div>
  )
}
