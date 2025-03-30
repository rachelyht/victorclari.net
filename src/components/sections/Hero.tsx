const Hero = () => {
  return (
    <div className="min-h-[90vh] bg-[#f5f5f5] flex items-center">
      <div className="container mx-auto px-4 py-8 sm:py-12 md:py-16">
        <div className="flex flex-col-reverse md:flex-row items-center">
          <div className="w-full md:w-1/2 mt-8 md:mt-0 md:pr-8 text-center md:text-left">
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-[#3a5a78] mb-2 sm:mb-4">Welcome to</h2>
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-[#1c2e3f] mb-2 sm:mb-4">Victor Chan</h1>
            <p className="text-lg sm:text-xl text-[#5c7a98] mb-4 sm:mb-6">Clarinetist / Saxophonist</p>
            <button onClick={() => document.getElementById('biography')?.scrollIntoView({ behavior: 'smooth' })} 
              className="px-6 py-2 bg-[#3a5a78] text-white rounded-full hover:bg-[#1c2e3f] transition-colors">
              Learn More
            </button>
          </div>
          <div className="w-full md:w-1/2">
            <img 
              src="/images/victor_chan_main.jpg" 
              alt="Victor Chan" 
              className="rounded-lg shadow-xl w-full max-w-md mx-auto md:max-w-none"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default Hero
