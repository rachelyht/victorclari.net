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
    <div className="min-h-screen bg-blue-400/30 py-16">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold text-center mb-12 text-white">Recordings</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recordings.map((recording) => (
            <Card key={recording.id} className="overflow-hidden">
              <CardHeader>
                <CardTitle>{recording.title}</CardTitle>
                <CardDescription>{recording.date}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="aspect-video mb-4">
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
                <p>{recording.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Recordings
