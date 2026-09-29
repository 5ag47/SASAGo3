import React, { useEffect, useState } from 'react'
import MainPage from './pages/MainPage'

export default function App() {
  const [bg, setBg] = useState(localStorage.getItem('sasago-bg') || '')
  useEffect(() => {
    document.documentElement.style.setProperty('--bg-url', bg ? `url(${bg})` : 'none')
  }, [bg])

  return <MainPage currentBg={bg} onChangeBg={(v) => { localStorage.setItem('sasago-bg', v); setBg(v) }} />
}
