import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"

const Recordings = () => {
  // Placeholder for recordings
  const recordings = [
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
  ]

  return (
    <div className="min-h-screen bg-blue-400/30 py-8 sm:py-12 md:py-16">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl sm:text-4xl font-bold text-center mb-6 sm:mb-8 md:mb-12 text-white">Recordings</h1>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {recordings.map((recording) => (
            <Card key={recording.id} className="overflow-hidden">
              <CardHeader className="p-3 sm:p-4 md:p-6">
                <CardTitle className="text-lg sm:text-xl">{recording.title}</CardTitle>
                <CardDescription>{recording.date}</CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
                <div className="aspect-video mb-3 sm:mb-4">
                  <iframe 
                    width="100%" 
                    height="100%" 
                    src={recording.videoUrl} 
                    title={recording.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="rounded-md"
                  ></iframe>
                </div>
                <p className="text-sm sm:text-base">{recording.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Recordings
