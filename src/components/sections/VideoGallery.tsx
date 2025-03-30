const VideoGallery = () => {
  const videos = [
    {
      id: 1,
      title: "Classical Clarinet Recital",
      date: "June 2024",
      description: "A collection of classical clarinet pieces performed live.",
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ"
    },
    {
      id: 2,
      title: "Jazz Saxophone Session",
      date: "March 2024",
      description: "Improvisational jazz saxophone pieces with piano accompaniment.",
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ"
    },
    {
      id: 3,
      title: "Chamber Music Collaboration",
      date: "December 2023",
      description: "Collaborative performance with string quartet.",
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ"
    }
  ];
  
  return (
    <div className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12 text-[#3a5a78]">Videos</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {videos.map((video) => (
            <div key={video.id} className="bg-[#f9fafc] rounded-lg shadow-lg overflow-hidden">
              <div className="aspect-video">
                <iframe 
                  width="100%" 
                  height="100%" 
                  src={video.videoUrl} 
                  title={video.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-1 text-[#3a5a78]">{video.title}</h3>
                <p className="text-sm text-gray-500 mb-2">{video.date}</p>
                <p className="text-sm">{video.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default VideoGallery
