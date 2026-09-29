import React from 'react'

function Bar({label, value, color}){
  return (
    <div className="stat-row">
      <div className="label">{label}</div>
      <div className="bar"><div className="fill" style={{width:`${value}%`, background:color}}/></div>
    </div>
  )
}

export default function StatsPanel(){
  return (
    <div className="stats">
      <Bar label="HP" value={65} color="#5cc26b" />
      <Bar label="스트레스" value={20} color="#e76f51" />
      <Bar label="수학" value={45} color="#4dabf7" />
      <Bar label="물리" value={12} color="#7b5cff" />
    </div>
  )
}
