const Home = () => {
  return (
    <div className="min-h-screen bg-blue-400/30">
      <div className="container mx-auto px-4 py-8 sm:py-12 md:py-16">
        <div className="flex flex-col md:flex-row items-center">
          <div className="w-full md:w-1/2 mb-8 md:mb-0 md:pr-8 text-center md:text-left">
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-yellow-400 mb-2 sm:mb-4">Hey, I'm</h2>
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white mb-2 sm:mb-4">Victor Chan</h1>
            <p className="text-lg sm:text-xl text-white mb-4 sm:mb-6">Clarinetist / Saxophonist</p>
          </div>
          <div className="w-full md:w-1/2">
            <img 
              src="/images/victor-chan.jpg" 
              alt="Victor Chan" 
              className="rounded-lg shadow-xl w-full max-w-md mx-auto md:max-w-none"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home
