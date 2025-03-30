const Biography = () => {
  return (
    <div className="py-16 bg-[#eef2f6]">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12 text-[#3a5a78]">Biography</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Chinese Biography */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-semibold mb-4 text-[#3a5a78] text-center">陳凱聲</h3>
            <p className="mb-4 text-sm sm:text-base">
              陳凱聲是一位傑出的單簧管和薩克斯管音樂家，專注於表演和教育。陳凱聲在香港出生並長大，自小就展現出對音樂的熱愛和天賦。
            </p>
            <p className="mb-4 text-sm sm:text-base">
              他在著名的音樂學院完成了正規的音樂教育，獲得了音樂表演學位。在他的職業生涯中，陳凱聲與亞洲和歐洲的各種樂團和合奏團一起表演。
            </p>
            <p className="mb-4 text-sm sm:text-base">
              作為一名教育家，陳凱聲致力於培養下一代音樂家。他經營著私人教學工作室，並定期舉辦大師班和工作坊。
            </p>
            <p className="text-sm sm:text-base">
              陳凱聲的演奏以其富有表現力的音色、精準的技巧和深刻的音樂理解而聞名。他不斷擴展自己的曲目並探索新的音樂合作。
            </p>
          </div>
          
          {/* English Biography */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-semibold mb-4 text-[#3a5a78] text-center">Victor Chan</h3>
            <p className="mb-4 text-sm sm:text-base">
              Victor Chan is a distinguished clarinetist and saxophonist with a passion for both performance and education. 
              Born and raised in Hong Kong, Victor began his musical journey at an early age, showing exceptional talent and dedication.
            </p>
            <p className="mb-4 text-sm sm:text-base">
              He completed his formal music education at prestigious institutions, earning degrees in Music Performance. 
              Throughout his career, Victor has performed with various orchestras and ensembles across Asia and Europe.
            </p>
            <p className="mb-4 text-sm sm:text-base">
              As an educator, Victor is committed to nurturing the next generation of musicians. 
              He maintains a private teaching studio and regularly conducts masterclasses and workshops.
            </p>
            <p className="text-sm sm:text-base">
              Victor's playing is characterized by his expressive tone, technical precision, and deep musical understanding. 
              He continues to expand his repertoire and explore new musical collaborations.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Biography
