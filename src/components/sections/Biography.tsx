const Biography = () => {
  return (
    <div className="py-16 bg-[#eef2f6]">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12 text-[#3a5a78]">Biography</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Chinese Biography */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-semibold mb-4 text-[#3a5a78] text-center">陳凱聲</h3>
            <p className="mb-4 text-sm sm:text-base text-justify">
              陳凱聲，畢業於香港浸會大學並修讀音樂系（學士），先後跟隨方濤先生，蔡國田先生及艾爾高先生學習單簧管。亦跟隨黃德釗博士學習色士風。陳氏已考獲單簧管聖三一演奏文憑（LTCL )以及色士風聖三一演奏文憑（ATCL )。
            </p>
            <p className="mb-4 text-sm sm:text-base text-justify">
              陳氏積極參與不同音樂活動。活躍於各樂團參與演出，包括翱樂管樂團，香港愛樂管樂團，香港室樂愛樂管樂團，香港浸會交響樂團等。亦曾參與Share the stage with Hkphil,與香港管弦樂團同台演出。除了本地活動，陳氏更前往奧地利，參與奧地利大師班，跟隨Mr. Dario Zingales學習單簧管。
            </p>
            <p className="mb-4 text-sm sm:text-base text-justify">
              除了表演活動，陳氏亦積與參與各項比賽。曾在香港演藝精英盃專業組獲得第一名及新中國際音樂比賽室內樂組一等獎。2019年隨翱樂管樂團參與聶耳青少年管樂藝術周比賽，榮獲公開組一等獎。
            </p>
            <p className="text-sm sm:text-base text-justify">
              陳氏有八年教學單簧管及色士風經驗，無論是一對一，小組教學，小組合奏及樂團教學。學生於各比賽考試都獲得出色成績，更曾於香港卡培尼亞音樂大賽及香港卓越音樂家大賽獲得優秀教師獎。陳氏擅長為每個學生度身訂造練習計劃及製訂目標，主旨為每個不同學生都能發揮自己的才華。
            </p>
          </div>
          
          {/* English Biography */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-semibold mb-4 text-[#3a5a78] text-center">Victor Chan</h3>
            <p className="mb-4 text-sm sm:text-base text-justify">
              Victor Chan is a distinguished clarinetist and saxophonist with a passion for both performance and education. 
              Born and raised in Hong Kong, Victor began his musical journey at an early age, showing exceptional talent and dedication.
            </p>
            <p className="mb-4 text-sm sm:text-base text-justify">
              He completed his formal music education at prestigious institutions, earning degrees in Music Performance. 
              Throughout his career, Victor has performed with various orchestras and ensembles across Asia and Europe.
            </p>
            <p className="mb-4 text-sm sm:text-base text-justify">
              As an educator, Victor is committed to nurturing the next generation of musicians. 
              He maintains a private teaching studio and regularly conducts masterclasses and workshops.
            </p>
            <p className="text-sm sm:text-base text-justify">
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
