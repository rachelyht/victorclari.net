const Gallery = () => {
  const galleryImages = [
    { id: 1, src: "/images/victor_chan_main.jpg", alt: "Victor Chan performance" },
    { id: 2, src: "/images/victor_chan_main.jpg", alt: "Victor Chan portrait" },
    { id: 3, src: "/images/victor_chan_main.jpg", alt: "Victor Chan in concert" },
    { id: 4, src: "/images/victor_chan_main.jpg", alt: "Victor Chan with orchestra" },
    { id: 5, src: "/images/victor_chan_main.jpg", alt: "Victor Chan recital" },
    { id: 6, src: "/images/victor_chan_main.jpg", alt: "Victor Chan rehearsal" },
  ];
  
  return (
    <div className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12 text-[#3a5a78]">Gallery</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {galleryImages.map((image) => (
            <div key={image.id} className="overflow-hidden rounded-lg shadow-lg transition-transform duration-300 hover:scale-105">
              <img 
                src={image.src} 
                alt={image.alt} 
                className="w-full h-64 object-cover"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Gallery
