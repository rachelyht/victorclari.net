const Bio = () => {
  return (
    <div className="min-h-screen bg-blue-400/30 py-16">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold text-center mb-12 text-white">Biography</h1>
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-4xl mx-auto">
          <p className="mb-4">
            Victor Chan is a distinguished clarinetist and saxophonist with a passion for both performance and education. 
            Born and raised in Hong Kong, Victor began his musical journey at an early age, showing exceptional talent and dedication.
          </p>
          <p className="mb-4">
            He completed his formal music education at prestigious institutions, earning degrees in Music Performance. 
            Throughout his career, Victor has performed with various orchestras and ensembles across Asia and Europe.
          </p>
          <p className="mb-4">
            As an educator, Victor is committed to nurturing the next generation of musicians. 
            He maintains a private teaching studio and regularly conducts masterclasses and workshops.
          </p>
          <p>
            Victor's playing is characterized by his expressive tone, technical precision, and deep musical understanding. 
            He continues to expand his repertoire and explore new musical collaborations.
          </p>
        </div>
      </div>
    </div>
  )
}

export default Bio
