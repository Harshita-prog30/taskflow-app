import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import { format, isPast, parseISO } from 'date-fns'


function StatCard({ label, value, icon, color }) {
  return (
    <div className="stat-card" style={{ '--accent-color': color }}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}

function StatusDot({ status }) {
  const map = { todo: '#5a5a78', in_progress: '#3b82f6', done: '#22c55e' }
  return <span style={{ width:8, height:8, borderRadius:'50%', background: map[status]||'#5a5a78', display:'inline-block', marginRight:6 }} />
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null)
  const { user } = useAuth()

  useEffect(() => {
    axios.get('/api/dashboard').then(r => setStats(r.data))
  }, [])

  if (!stats) return <div className="loading-page"><div className="spinner" /></div>

  const statusMap = {}
  stats.tasksByStatus?.forEach(s => statusMap[s.status] = s.count)
  const total = Object.values(statusMap).reduce((a, b) => a + b, 0)

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="text-muted text-sm">Welcome back, {user.name}</p>
        </div>
      </div>

      <div className="grid-4" style={{marginBottom:'1.5rem'}}>
        {user.role === 'admin' ? <>
          <StatCard label="Total Projects" value={stats.totalProjects} icon="◈" color="var(--accent)" />
          <StatCard label="Total Users" value={stats.totalUsers} icon="◎" color="var(--blue)" />
          <StatCard label="Total Tasks" value={stats.totalTasks} icon="◻" color="var(--green)" />
          <StatCard label="Overdue" value={stats.overdueTasks?.length || 0} icon="⚠" color="var(--red)" />
        </> : <>
          <StatCard label="My Projects" value={stats.myProjects} icon="◈" color="var(--accent)" />
          <StatCard label="My Tasks" value={stats.myTasks} icon="◻" color="var(--blue)" />
          <StatCard label="In Progress" value={statusMap['in_progress']||0} icon="▶" color="var(--yellow)" />
          <StatCard label="Overdue" value={stats.overdueTasks?.length||0} icon="⚠" color="var(--red)" />
        </>}
      </div>

      <div className="dash-grid">
        <div className="card">
          <h3 className="section-title">Task Status</h3>
          <div className="status-bars">
            {[['todo','To Do'],['in_progress','In Progress'],['done','Done']].map(([s,l])=>(
              <div key={s} className="status-bar-row">
                <div className="status-bar-label">
                  <StatusDot status={s} />{l}
                  <span className="status-count">{statusMap[s]||0}</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{width: total ? `${((statusMap[s]||0)/total)*100}%` : '0%', background: s==='done'?'var(--green)':s==='in_progress'?'var(--blue)':'var(--border2)'}} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="section-title">Overdue Tasks</h3>
          {stats.overdueTasks?.length === 0 ? (
            <div style={{color:'var(--text3)', fontSize:'0.875rem', padding:'1rem 0'}}>No overdue tasks 🎉</div>
          ) : stats.overdueTasks?.slice(0,5).map(t => (
            <div key={t.id} className="overdue-item">
              <div>
                <div className="overdue-title">{t.title}</div>
                <div className="overdue-meta">{t.project_name} · Due {format(parseISO(t.due_date), 'MMM d')}</div>
              </div>
              <span className={`badge badge-${t.priority}`}>{t.priority}</span>
            </div>
          ))}
        </div>

        <div className="card" style={{gridColumn:'1/-1'}}>
          <h3 className="section-title">Recent Activity</h3>
          <table className="table">
            <thead><tr><th>Task</th><th>Project</th><th>Status</th><th>Priority</th><th>Assignee</th><th>Updated</th></tr></thead>
            <tbody>
              {stats.recentTasks?.map(t => (
                <tr key={t.id}>
                  <td style={{fontWeight:500}}>{t.title}</td>
                  <td className="text-muted">{t.project_name}</td>
                  <td><span className={`badge badge-${t.status}`}>{t.status.replace('_',' ')}</span></td>
                  <td><span className={`badge badge-${t.priority}`}>{t.priority}</span></td>
                  <td className="text-muted">{t.assignee_name || '—'}</td>
                  <td className="text-muted text-xs">{format(new Date(t.updated_at), 'MMM d, HH:mm')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}