const Home = () => {
  return (
    <div className="min-h-screen bg-blue-400/30">
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col md:flex-row items-center">
          <div className="md:w-1/2 mb-8 md:mb-0 md:pr-8">
            <h2 className="text-4xl md:text-6xl font-bold text-yellow-400 mb-4">Hey, I'm</h2>
            <h1 className="text-6xl md:text-8xl font-bold text-white mb-4">Victor Chan</h1>
            <p className="text-xl text-white mb-6">Clarinetist / Saxophonist</p>
          </div>
          <div className="md:w-1/2">
            <img 
              src="/images/victor-chan.jpg" 
              alt="Victor Chan" 
              className="rounded-lg shadow-xl w-full"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home
