import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../utils/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import './AuthPage.css'

export default function SignupPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'member' })
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
     const { data } = await api.post('/auth/signup', form)
      login(data.token, data.user)
      toast('Account created!', 'success')
      navigate('/')
    } catch (err) {
      toast(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Signup failed', 'error')
    } finally { setLoading(false) }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">⬡ TaskFlow</div>
        <h1 className="auth-title">Create account</h1>
        <p className="auth-sub">Start managing tasks with your team</p>
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input placeholder="Jane Smith" required
              value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" placeholder="you@example.com" required
              value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" placeholder="Min 6 characters" required minLength={6}
              value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
          </div>
          <div className="form-group">
            <label className="form-label">Role</label>
            <select value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button type="submit" className="btn-primary" style={{width:'100%', justifyContent:'center', padding:'0.75rem'}} disabled={loading}>
            {loading ? 'Creating...' : 'Create account'}
          </button>
        </form>
        <p className="auth-link">Already have an account? <Link to="/login">Sign in</Link></p>
      </div>
    </div>
  )
}