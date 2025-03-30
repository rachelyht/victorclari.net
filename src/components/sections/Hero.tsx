const Hero = () => {
  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Full-screen background image */}
      <div className="absolute inset-0 z-0">
        <img 
          src="/images/victor_chan_main.jpg" 
          alt="Victor Chan" 
          className="w-full h-full object-cover"
        />
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-black bg-opacity-30"></div>
      </div>
      
      {/* Content positioned over the image */}
      <div className="relative z-10 flex items-center justify-center min-h-screen">
        <div className="text-center text-white px-4 py-8">
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold mb-2 sm:mb-4">Victor Chan</h1>
          <p className="text-lg sm:text-xl mb-6 sm:mb-8">Clarinetist</p>
          <button onClick={() => document.getElementById('biography')?.scrollIntoView({ behavior: 'smooth' })} 
            className="px-6 py-3 bg-[#3a5a78] text-white rounded-full hover:bg-[#1c2e3f] transition-colors border-2 border-white">
            Learn More
          </button>
        </div>
      </div>
    </div>
  )
}

export default Hero
