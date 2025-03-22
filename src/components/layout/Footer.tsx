const Footer = () => {
  return (
    <footer className="bg-blue-400/70 text-white py-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <p>&copy; {new Date().getFullYear()} Victor Chan. All rights reserved.</p>
          </div>
          <div className="flex space-x-4">
            <a href="https://www.linkedin.com/" target="_blank" rel="noopener noreferrer" className="text-white hover:text-yellow-300">
              LinkedIn
            </a>
            <a href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer" className="text-white hover:text-yellow-300">
              Instagram
            </a>
            <a href="https://www.youtube.com/" target="_blank" rel="noopener noreferrer" className="text-white hover:text-yellow-300">
              YouTube
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
