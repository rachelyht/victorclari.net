import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Calendar, Clock, MapPin } from 'lucide-react'

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
    <div className="min-h-screen bg-blue-400/30 py-8 sm:py-12 md:py-16">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl sm:text-4xl font-bold text-center mb-6 sm:mb-8 md:mb-12 text-white">Upcoming Events</h1>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {events.map((event) => (
            <Card key={event.id} className="overflow-hidden">
              <CardHeader className="p-3 sm:p-4 md:p-6">
                <CardTitle className="text-lg sm:text-xl">{event.title}</CardTitle>
                <div className="flex items-center mt-2">
                  <Calendar size={16} className="mr-1 text-blue-500" />
                  <CardDescription className="text-xs sm:text-sm">{event.date}</CardDescription>
                  <Clock size={16} className="ml-3 mr-1 text-blue-500" />
                  <CardDescription className="text-xs sm:text-sm">{event.time}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
                <div className="flex items-center mb-2">
                  <MapPin size={16} className="mr-1 text-blue-500 flex-shrink-0" />
                  <p className="font-medium text-sm sm:text-base">{event.location}</p>
                </div>
                <p className="text-sm sm:text-base">{event.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Events
