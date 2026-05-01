import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../utils/api'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { format, isPast, parseISO } from 'date-fns'

const statusLabel = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' }

export default function TasksPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ status: '', priority: '', assignee_id: '' })
  const [users, setUsers] = useState([])

  const load = () => {
    const params = new URLSearchParams()
    if (filters.status) params.set('status', filters.status)
    if (filters.priority) params.set('priority', filters.priority)
    if (filters.assignee_id) params.set('assignee_id', filters.assignee_id)
    api.get(`/tasks?${params}`).then(r => setTasks(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [filters])
  useEffect(() => { api.get('/users').then(r => setUsers(r.data)) }, [])

  const handleStatusChange = async (task, status) => {
    try {
      await api.put(`/tasks/${task.id}`, { status })
      load()
    } catch { toast.error('Failed to update') }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this task?')) return
    try {
      await api.delete(`/tasks/${id}`)
      toast.success('Deleted')
      load()
    } catch { toast.error('Failed to delete') }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Tasks</h1>
          <p className="page-subtitle">
            {user.role === 'admin' ? 'All tasks across all projects' : 'Tasks assigned to or created by you'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card flex gap-2 items-center" style={{ marginBottom: '1.25rem', padding: '0.85rem 1.25rem', flexWrap: 'wrap' }}>
        <span className="text-sm text-muted" style={{ marginRight: '0.25rem' }}>Filter:</span>
        <select value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}
          style={{ width: 'auto', padding: '0.35rem 0.65rem', fontSize: '0.82rem' }}>
          <option value="">All Status</option>
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="done">Done</option>
        </select>
        <select value={filters.priority} onChange={e => setFilters(p => ({ ...p, priority: e.target.value }))}
          style={{ width: 'auto', padding: '0.35rem 0.65rem', fontSize: '0.82rem' }}>
          <option value="">All Priority</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        {user.role === 'admin' && (
          <select value={filters.assignee_id} onChange={e => setFilters(p => ({ ...p, assignee_id: e.target.value }))}
            style={{ width: 'auto', padding: '0.35rem 0.65rem', fontSize: '0.82rem' }}>
            <option value="">All Members</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        )}
        {(filters.status || filters.priority || filters.assignee_id) && (
          <button className="btn-ghost btn-sm" onClick={() => setFilters({ status: '', priority: '', assignee_id: '' })}>Clear</button>
        )}
        <span className="text-xs text-muted" style={{ marginLeft: 'auto' }}>{tasks.length} task{tasks.length !== 1 ? 's' : ''}</span>
      </div>

      {loading ? (
        <div className="loading-page"><div className="spinner" /></div>
      ) : tasks.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-icon">◎</div>
          <div className="empty-title">No tasks found</div>
          <div className="empty-desc">Try adjusting your filters</div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Project</th>
                <th>Assignee</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Due</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {tasks.map(task => {
                const isOverdue = task.due_date && task.status !== 'done' && isPast(parseISO(task.due_date))
                return (
                  <tr key={task.id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{task.title}</div>
                      {task.description && <div className="text-xs text-muted">{task.description.slice(0, 50)}{task.description.length > 50 ? '…' : ''}</div>}
                    </td>
                    <td>
                      <Link to={`/projects/${task.project_id}`} style={{ color: 'var(--accent2)', fontSize: '0.85rem' }}>
                        {task.project_name}
                      </Link>
                    </td>
                    <td className="text-muted text-sm">{task.assignee_name || '—'}</td>
                    <td>
                      <select value={task.status} onChange={e => handleStatusChange(task, e.target.value)}
                        style={{ width: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.78rem' }}>
                        <option value="todo">To Do</option>
                        <option value="in_progress">In Progress</option>
                        <option value="done">Done</option>
                      </select>
                    </td>
                    <td><span className={`badge badge-${task.priority}`}>{task.priority}</span></td>
                    <td style={{ color: isOverdue ? 'var(--red)' : 'var(--text2)', fontSize: '0.8rem' }}>
                      {task.due_date ? format(parseISO(task.due_date), 'MMM d') : '—'}
                      {isOverdue && ' ⚠'}
                    </td>
                    <td>
                      <button className="btn-danger btn-icon btn-sm" onClick={() => handleDelete(task.id)}>✕</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}