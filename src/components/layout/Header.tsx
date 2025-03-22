import { Link } from 'react-router-dom'

const Header = () => {
  return (
    <header className="bg-blue-400/70 text-white">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <Link to="/" className="text-yellow-300 text-xl font-bold mb-4 md:mb-0">
            Victor Chan Hoi Sing
          </Link>
          <nav className="flex space-x-6">
            <Link to="/bio" className="hover:text-yellow-300 transition-colors">Bio</Link>
            <Link to="/portraits" className="hover:text-yellow-300 transition-colors">Portraits</Link>
            <Link to="/recordings" className="hover:text-yellow-300 transition-colors">Recordings</Link>
            <Link to="/contact" className="hover:text-yellow-300 transition-colors">Contact</Link>
            <Link to="/events" className="hover:text-yellow-300 transition-colors">Events</Link>
          </nav>
        </div>
      </div>
    </header>
  )
}

export default Header
