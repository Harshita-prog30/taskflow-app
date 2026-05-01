import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../utils/api'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import TaskModal from '../components/TaskModal'
import { format, isPast, parseISO } from 'date-fns'

const statusLabel = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' }

export default function ProjectDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [tasks, setTasks] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('tasks')
  const [taskModal, setTaskModal] = useState(null) // null | 'new' | task object
  const [memberEmail, setMemberEmail] = useState('')
  const [addingMember, setAddingMember] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')

  const loadProject = () => api.get(`/projects/${id}`).then(r => setProject(r.data))
  const loadTasks = () => api.get(`/tasks?project_id=${id}`).then(r => setTasks(r.data))
  const loadUsers = () => api.get('/users').then(r => setAllUsers(r.data))

  useEffect(() => {
    Promise.all([loadProject(), loadTasks(), loadUsers()]).finally(() => setLoading(false))
  }, [id])

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Delete this task?')) return
    try {
      await api.delete(`/tasks/${taskId}`)
      toast.success('Task deleted')
      loadTasks()
    } catch { toast.error('Failed to delete') }
  }

  const handleStatusChange = async (task, status) => {
    try {
      await api.put(`/tasks/${task.id}`, { status })
      loadTasks()
    } catch { toast.error('Failed to update') }
  }

  const handleAddMember = async (e) => {
    e.preventDefault()
    const foundUser = allUsers.find(u => u.email.toLowerCase() === memberEmail.toLowerCase())
    if (!foundUser) { toast.error('User not found'); return }
    setAddingMember(true)
    try {
      await api.post(`/projects/${id}/members`, { user_id: foundUser.id })
      toast.success('Member added')
      setMemberEmail('')
      loadProject()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add member')
    } finally { setAddingMember(false) }
  }

  const handleRemoveMember = async (userId) => {
    if (!confirm('Remove this member?')) return
    try {
      await api.delete(`/projects/${id}/members/${userId}`)
      toast.success('Member removed')
      loadProject()
    } catch { toast.error('Failed to remove') }
  }

  const canManage = user.role === 'admin' || project?.owner_id === user.id

  const filteredTasks = statusFilter ? tasks.filter(t => t.status === statusFilter) : tasks

  if (loading) return <div className="loading-page"><div className="spinner" /></div>
  if (!project) return <div style={{ padding: '2rem' }}>Project not found</div>

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="text-sm text-muted" style={{ marginBottom: '0.25rem', cursor: 'pointer' }} onClick={() => navigate('/projects')}>← Projects</div>
          <h1 className="page-title">{project.name}</h1>
          {project.description && <p className="page-subtitle">{project.description}</p>}
        </div>
        <div className="flex gap-2 items-center">
          <span className={`badge badge-${project.status}`}>{project.status}</span>
          {canManage && (
            <button className="btn-primary" onClick={() => setTaskModal('new')}>+ Add Task</button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0' }}>
        {['tasks', 'members'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{
              background: 'transparent', color: activeTab === tab ? 'var(--accent2)' : 'var(--text2)',
              borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
              borderRadius: 0, padding: '0.6rem 1rem', fontSize: '0.9rem', fontWeight: 500, textTransform: 'capitalize',
              marginBottom: '-1px'
            }}>
            {tab} {tab === 'tasks' ? `(${tasks.length})` : `(${project.members?.length || 0})`}
          </button>
        ))}
      </div>

      {activeTab === 'tasks' && (
        <div>
          {/* Filters */}
          <div className="flex gap-2 items-center" style={{ marginBottom: '1rem' }}>
            {['', 'todo', 'in_progress', 'done'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={statusFilter === s ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}>
                {s === '' ? 'All' : statusLabel[s]}
              </button>
            ))}
          </div>

          {filteredTasks.length === 0 ? (
            <div className="empty-state card">
              <div className="empty-icon">◎</div>
              <div className="empty-title">No tasks here</div>
              {canManage && <button className="btn-primary" onClick={() => setTaskModal('new')}>+ Add Task</button>}
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Assignee</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Due Date</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map(task => {
                    const isOverdue = task.due_date && task.status !== 'done' && isPast(parseISO(task.due_date))
                    return (
                      <tr key={task.id}>
                        <td>
                          <div style={{ fontWeight: 500 }}>{task.title}</div>
                          {task.description && <div className="text-xs text-muted">{task.description.slice(0, 60)}{task.description.length > 60 ? '…' : ''}</div>}
                        </td>
                        <td className="text-muted">{task.assignee_name || '—'}</td>
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
                          {task.due_date ? format(parseISO(task.due_date), 'MMM d, yyyy') : '—'}
                          {isOverdue && ' ⚠'}
                        </td>
                        <td>
                          <div className="flex gap-1">
                            <button className="btn-ghost btn-icon btn-sm" onClick={() => setTaskModal(task)}>✏</button>
                            {canManage && <button className="btn-danger btn-icon btn-sm" onClick={() => handleDeleteTask(task.id)}>✕</button>}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'members' && (
        <div>
          {canManage && (
            <form onSubmit={handleAddMember} className="flex gap-2 items-center" style={{ marginBottom: '1.25rem' }}>
              <input
                placeholder="Add member by email..."
                value={memberEmail}
                onChange={e => setMemberEmail(e.target.value)}
                style={{ maxWidth: 300 }}
              />
              <button type="submit" className="btn-primary" disabled={addingMember}>
                {addingMember ? 'Adding...' : '+ Add Member'}
              </button>
            </form>
          )}

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>System Role</th>
                  <th>Project Role</th>
                  <th>Joined</th>
                  {canManage && <th></th>}
                </tr>
              </thead>
              <tbody>
                {project.members?.map(m => (
                  <tr key={m.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div style={{ width: 28, height: 28, background: 'var(--accent-dim)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: 'var(--accent2)', fontWeight: 700 }}>
                          {m.name[0].toUpperCase()}
                        </div>
                        {m.name}
                      </div>
                    </td>
                    <td className="text-muted">{m.email}</td>
                    <td><span className={`badge badge-${m.system_role}`}>{m.system_role}</span></td>
                    <td><span className={`badge badge-${m.project_role}`}>{m.project_role}</span></td>
                    <td className="text-muted text-sm">{format(new Date(m.joined_at), 'MMM d, yyyy')}</td>
                    {canManage && (
                      <td>
                        {m.id !== user.id && (
                          <button className="btn-danger btn-sm" onClick={() => handleRemoveMember(m.id)}>Remove</button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {taskModal !== null && (
        <TaskModal
          task={taskModal === 'new' ? null : taskModal}
          projectId={parseInt(id)}
          members={project.members || []}
          onClose={() => setTaskModal(null)}
          onSave={() => { setTaskModal(null); loadTasks() }}
        />
      )}
    </div>
  )
}