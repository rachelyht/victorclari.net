import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Button } from '../ui/button'

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const scrollToSection = (id: string) => {
    setIsMenuOpen(false)
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <header className="bg-black text-white sticky top-0 z-50 shadow-md">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="w-full md:w-auto flex justify-between items-center">
            <a onClick={() => scrollToSection('home')} className="text-[#e8d4a9] text-xl font-bold cursor-pointer">
              Victor Chan
            </a>
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden text-white hover:text-[#e8d4a9]"
              onClick={toggleMenu}
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </Button>
          </div>
          
          <nav className={`${isMenuOpen ? 'flex' : 'hidden'} md:flex flex-col md:flex-row w-full md:w-auto space-y-4 md:space-y-0 md:space-x-6 mt-4 md:mt-0`}>
            <a onClick={() => scrollToSection('biography')} className="hover:text-[#e8d4a9] transition-colors cursor-pointer">Biography</a>
            <a onClick={() => scrollToSection('gallery')} className="hover:text-[#e8d4a9] transition-colors cursor-pointer">Gallery</a>
            <a onClick={() => scrollToSection('student-gallery')} className="hover:text-[#e8d4a9] transition-colors cursor-pointer">Students</a>
            <a onClick={() => scrollToSection('videos')} className="hover:text-[#e8d4a9] transition-colors cursor-pointer">Videos</a>
            <a onClick={() => scrollToSection('contact')} className="hover:text-[#e8d4a9] transition-colors cursor-pointer">Contact</a>
          </nav>
        </div>
      </div>
    </header>
  )
}

export default Header
