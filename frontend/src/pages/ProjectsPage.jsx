import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../utils/api'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { format } from 'date-fns'

export default function ProjectsPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', description: '' })
  const [saving, setSaving] = useState(false)

  const load = () => {
    api.get('/projects').then(r => setProjects(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/projects', form)
      toast.success('Project created!')
      setShowModal(false)
      setForm({ name: '', description: '' })
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create project')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this project and all its tasks?')) return
    try {
      await api.delete(`/projects/${id}`)
      toast.success('Project deleted')
      load()
    } catch (err) {
      toast.error('Failed to delete')
    }
  }

  if (loading) return <div className="loading-page"><div className="spinner" /></div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>+ New Project</button>
      </div>

      {projects.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-icon">◈</div>
          <div className="empty-title">No projects yet</div>
          <div className="empty-desc">Create your first project to get started</div>
          <button className="btn-primary" style={{ marginTop: '0.5rem' }} onClick={() => setShowModal(true)}>+ New Project</button>
        </div>
      ) : (
        <div className="grid-3">
          {projects.map(p => (
            <div key={p.id} className="card project-card">
              <div className="flex justify-between items-center" style={{ marginBottom: '0.6rem' }}>
                <span className={`badge badge-${p.status}`}>{p.status}</span>
                {(user.role === 'admin' || p.owner_id === user.id) && (
                  <button className="btn-danger btn-sm" onClick={() => handleDelete(p.id)}>Delete</button>
                )}
              </div>
              <Link to={`/projects/${p.id}`}>
                <h3 style={{ fontSize: '1.05rem', marginBottom: '0.35rem' }}>{p.name}</h3>
              </Link>
              {p.description && <p className="text-sm text-muted" style={{ marginBottom: '0.75rem', lineHeight: 1.5 }}>{p.description}</p>}
              <div className="flex gap-2 text-xs text-muted" style={{ marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                <span>◎ {p.task_count} tasks</span>
                <span>◑ {p.member_count} members</span>
                <span style={{ marginLeft: 'auto' }}>{format(new Date(p.created_at), 'MMM d, yyyy')}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">New Project</h2>
              <button className="btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Project name *</label>
                <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="My awesome project" />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="What is this project about?" style={{ resize: 'vertical' }} />
              </div>
              <div className="modal-footer" style={{ margin: 0 }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .project-card { display: flex; flex-direction: column; transition: border-color 0.15s; }
        .project-card:hover { border-color: var(--border2); }
        .project-card h3:hover { color: var(--accent2); }
      `}</style>
    </div>
  )
}