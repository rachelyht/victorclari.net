import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { Button } from '../ui/button'

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  return (
    <header className="bg-blue-400/70 text-white">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="w-full md:w-auto flex justify-between items-center">
            <Link to="/" className="text-yellow-300 text-xl font-bold">
              Victor Chan Hoi Sing
            </Link>
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden text-white hover:text-yellow-300"
              onClick={toggleMenu}
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </Button>
          </div>
          
          <nav className={`${isMenuOpen ? 'flex' : 'hidden'} md:flex flex-col md:flex-row w-full md:w-auto space-y-4 md:space-y-0 md:space-x-6 mt-4 md:mt-0`}>
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
