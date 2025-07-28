import { useState } from 'react'
import './App.css'
import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/homePage'

function App() {

  return (
    <>
      <div className='App'>
        <Routes>
          <Route path='/' element={<HomePage />} />
        </Routes>
      </div>
    </>
  )
}

export default App
