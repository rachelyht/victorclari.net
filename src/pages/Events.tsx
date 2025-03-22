import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"

const Events = () => {
  // Placeholder for events
  const events = [
    {
      id: 1,
      title: "Solo Recital",
      date: "April 15, 2025",
      time: "7:30 PM",
      location: "Concert Hall, Music Academy",
      description: "An evening of classical clarinet works featuring pieces by Mozart, Brahms, and Debussy."
    },
    {
      id: 2,
      title: "Chamber Music Festival",
      date: "May 20-22, 2025",
      time: "Various times",
      location: "City Arts Center",
      description: "Participating in the annual chamber music festival with performances on all three days."
    },
    {
      id: 3,
      title: "Masterclass",
      date: "June 10, 2025",
      time: "2:00 PM - 5:00 PM",
      location: "University Music Department",
      description: "Conducting a masterclass for advanced clarinet students. Open to the public."
    }
  ]

  return (
    <div className="min-h-screen bg-blue-400/30 py-16">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold text-center mb-12 text-white">Upcoming Events</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <Card key={event.id}>
              <CardHeader>
                <CardTitle>{event.title}</CardTitle>
                <CardDescription>{event.date} • {event.time}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="font-medium mb-2">{event.location}</p>
                <p>{event.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Events
