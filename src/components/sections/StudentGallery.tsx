const StudentGallery = () => {
  const studentImages = [
    { id: 1, src: "/images/victor_chan_main.jpg", alt: "Student performance" },
    { id: 2, src: "/images/victor_chan_main.jpg", alt: "Student masterclass" },
    { id: 3, src: "/images/victor_chan_main.jpg", alt: "Student recital" },
    { id: 4, src: "/images/victor_chan_main.jpg", alt: "Students group photo" },
  ];
  
  return (
    <div className="py-16 bg-[#eef2f6]">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12 text-[#3a5a78]">Student Gallery</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {studentImages.map((image) => (
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

export default StudentGallery
