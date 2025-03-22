import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "../components/ui/carousel"

const Portraits = () => {
  // Placeholder for portrait images
  const portraits = [
    { id: 1, src: "/images/victor-chan.jpg", alt: "Victor Chan Portrait 1" },
    { id: 2, src: "/images/victor-chan.jpg", alt: "Victor Chan Portrait 2" },
    { id: 3, src: "/images/victor-chan.jpg", alt: "Victor Chan Portrait 3" },
  ]

  return (
    <div className="min-h-screen bg-blue-400/30 py-16">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold text-center mb-12 text-white">Portraits</h1>
        
        <div className="max-w-4xl mx-auto">
          <Carousel className="w-full">
            <CarouselContent>
              {portraits.map((portrait) => (
                <CarouselItem key={portrait.id} className="flex justify-center">
                  <div className="p-1">
                    <img 
                      src={portrait.src} 
                      alt={portrait.alt} 
                      className="rounded-lg shadow-xl w-full max-h-[600px] object-cover"
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </div>
      </div>
    </div>
  )
}

export default Portraits
