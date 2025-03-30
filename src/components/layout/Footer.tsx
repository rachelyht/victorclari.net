import { Linkedin, Instagram, Youtube, Mail } from 'lucide-react'

const Footer = () => {
  return (
    <footer className="bg-[#3a5a78] text-white py-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0 text-center md:text-left">
            <p>&copy; {new Date().getFullYear()} Victor Chan. All rights reserved.</p>
          </div>
          <div className="flex space-x-6">
            <a href="mailto:victormusic.clarinet@gmail.com" className="text-white hover:text-[#e8d4a9] flex items-center">
              <Mail size={20} />
              <span className="ml-2 sm:inline hidden">Email</span>
            </a>
            <a href="https://www.linkedin.com/" target="_blank" rel="noopener noreferrer" className="text-white hover:text-[#e8d4a9] flex items-center">
              <Linkedin size={20} />
              <span className="ml-2 sm:inline hidden">LinkedIn</span>
            </a>
            <a href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer" className="text-white hover:text-[#e8d4a9] flex items-center">
              <Instagram size={20} />
              <span className="ml-2 sm:inline hidden">Instagram</span>
            </a>
            <a href="https://www.youtube.com/" target="_blank" rel="noopener noreferrer" className="text-white hover:text-[#e8d4a9] flex items-center">
              <Youtube size={20} />
              <span className="ml-2 sm:inline hidden">YouTube</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
