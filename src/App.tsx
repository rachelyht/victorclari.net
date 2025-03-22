import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './App.css'

// Pages
import Home from './pages/Home'
import Bio from './pages/Bio'
import Portraits from './pages/Portraits'
import Recordings from './pages/Recordings'
import Contact from './pages/Contact'
import Events from './pages/Events'

// Layout
import Layout from './components/layout/Layout'

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/bio" element={<Bio />} />
          <Route path="/portraits" element={<Portraits />} />
          <Route path="/recordings" element={<Recordings />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/events" element={<Events />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App
