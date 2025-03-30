import './App.css'
import Layout from './components/layout/Layout'
import Header from './components/layout/Header'
import Hero from './components/sections/Hero'
import Biography from './components/sections/Biography'
import Gallery from './components/sections/Gallery'
import StudentGallery from './components/sections/StudentGallery'
import VideoGallery from './components/sections/VideoGallery'
import Contact from './components/sections/Contact'

function App() {
  return (
    <Layout>
      <div id="home" className="section">
        <Hero />
      </div>
      <Header />
      <div id="biography" className="section">
        <Biography />
      </div>
      <div id="gallery" className="section">
        <Gallery />
      </div>
      <div id="student-gallery" className="section">
        <StudentGallery />
      </div>
      <div id="videos" className="section">
        <VideoGallery />
      </div>
      <div id="contact" className="section">
        <Contact />
      </div>
    </Layout>
  )
}

export default App
