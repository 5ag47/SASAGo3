import React, { useState } from 'react'
import Character from '../components/Character'
import StatsPanel from '../components/StatsPanel'

export default function MainPage({ currentBg, onChangeBg }) {
  const [tasks, setTasks] = useState(['모의 면접','원서 작성'])

  return (
    <div className="app-root">
      <header className="topbar">
        <div className="date">2026년 9월 1주차</div>
        <div className="right-controls">
          <button className="icon">⚙️</button>
          <input
            placeholder="배경 이미지 URL 붙여넣기"
            value={currentBg || ''}
            onChange={(e)=>onChangeBg(e.target.value)}
            className="bg-input"
          />
        </div>
      </header>

      <main className="main-area">
        <aside className="left-col">
          <section className="weekly">
            <h3>이번 주 일정</h3>
            <ul>
              {tasks.map((t,i)=>(<li key={i}><input type="checkbox"/> {t}</li>))}
            </ul>
          </section>

          <StatsPanel />
        </aside>

        <section className="center-col">
          <div className="room-window">{/* background applied via CSS variable */}</div>
          <Character />
        </section>

        <aside className="right-col">
          <div className="card">
            <h4>자율학습 신청</h4>
            <label>장소</label>
            <select>
              <option>호실(요양)</option>
              <option>도서관</option>
            </select>
            <label>사유</label>
            <select>
              <option>게임</option>
              <option>공부</option>
            </select>
            <button className="primary">신청하기</button>
          </div>

          <button className="start-week">▶ 한 주 시작</button>
        </aside>
      </main>
    </div>
  )
}
