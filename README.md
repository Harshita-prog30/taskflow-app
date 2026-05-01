#  TaskFlow – Project Management App

A full-stack project management web application where users can create projects, manage tasks, and collaborate efficiently.

---

##  Live Demo
Frontend [https://taskflow-app-coral-mu.vercel.app/login]
Backend [https://taskflow-app-coral-mu.vercel.app/login]

---

##  Features

- 🔐 User Authentication (Signup/Login)
- 📁 Create, view, and delete projects
- ✅ Task management inside projects
- 👥 Role-based access (Admin / Member)
- 🔔 Toast notifications for actions
- 📊 Clean and responsive UI

---

## 🛠️ Tech Stack

**Frontend:**
- React (Vite)
- CSS

**Backend:**
- Node.js
- Express.js

**Database:**
- MongoDB (Atlas)

**Other:**
- Axios
- JWT Authentication

---

## ⚙️ Installation & Setup

### 1. Clone the repository
```bash
git clone https://github.com/your-username/taskflow-app.git
cd taskflow-app
2. Setup Backend
cd backend
npm install

Create .env file:

MONGO_URI=your_mongodb_url
JWT_SECRET=your_secret_key
PORT=5000

Run backend:

npm run dev
3. Setup Frontend
cd frontend
npm install
npm run dev
🔗 API Base URL
http://localhost:5000/api
📁 Folder Structure
taskflow-app/
│
├── backend/
│   ├── routes/
│   ├── controllers/
│   ├── models/
│   └── server.js
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── context/
│   │   ├── utils/
│   │   └── components/
│
└── README.md
