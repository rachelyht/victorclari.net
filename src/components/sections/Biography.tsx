const Biography = () => {
  return (
    <div className="py-16 bg-[#eef2f6]">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12 text-[#3a5a78]">Biography</h2>
        
        <div className="grid grid-cols-1 gap-8 max-w-6xl mx-auto">
          {/* English Biography */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-semibold mb-4 text-[#3a5a78] text-center">Victor Chan</h3>
            <p className="mb-4 text-sm sm:text-base text-justify">
              Victor Chan is currently pursuing a Master of Music degree at the Hong Kong Academy for Performing Arts. He graduated with a Bachelor of Arts (Hons) in Music Studies from Hong Kong Baptist University. During his studies, he trained in clarinet under Mr. Andrew Simon, Mr. Lorenzo Iosco, Mr. Martin Choy, and Mr. Richard Fong, and studied saxophone with Dr. Wong Tak Chiu. Victor has earned the Licentiate of Trinity College London (LTCL) in Clarinet and the Associate of Trinity College London (ATCL) in Saxophone.
            </p>
            <p className="mb-4 text-sm sm:text-base text-justify">
              Victor is an active participant in a wide range of musical activities and performances. He has performed with various ensembles, including the O Wind Ensemble, Hong Kong Wind Philharmonia, Hong Kong Chamber Wind Philharmonia, and Hong Kong Baptist Symphony Orchestra. He also took part in the "Share the Stage with HKPhil" initiative, performing alongside the Hong Kong Philharmonic Orchestra. Beyond his local achievements, Victor further honed his skills by attending an Austrian Master Class in Austria, where he studied clarinet under Mr. Dario Zingales.
            </p>
            <p className="mb-4 text-sm sm:text-base text-justify">
              In addition to his performances, Victor has achieved remarkable success in music competitions. He was awarded Champion in the Professional Group of the 5th Hong Kong Music Talent Competition and First Prize in the Chamber Music Group of the Zhongsin International Music Competition. In 2019, Victor performed with the O Wind Ensemble at the Nie Er Youth Wind Band Art Week Competition, where they earned the First Prize in the Open Group.
            </p>
            <p className="text-sm sm:text-base text-justify">
              Victor possesses over eight years of experience teaching the clarinet and saxophone, covering one-on-one instruction, group lessons, ensemble coaching, and orchestra conducting. His students have consistently achieved outstanding results in competitions and examinations, and he has been recognized with the Outstanding Teacher Award at the Hong Kong Music Talent Award and the Hong Kong Youth Catania Music Competition. Victor specializes in designing personalized lesson plans tailored to each student's needs and goals, ensuring that every learner can fully develop their musical talents.
            </p>
          </div>
          
          {/* Chinese Biography */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-semibold mb-4 text-[#3a5a78] text-center">陳凱聲</h3>
            <p className="mb-4 text-sm sm:text-base text-justify">
              陳凱聲現為香港演藝學院音樂系碩士，先前畢業於香港浸會大學音樂系學士課程。他曾跟隨史安祖先生、方濤先生、蔡國田先生及艾爾高先生學習單簧管，同時亦向黃德釗博士學習色士風。陳氏已取得單簧管聖三一演奏文憑（LTCL）以及色士風聖三一演奏文憑（ATCL）。
            </p>
            <p className="mb-4 text-sm sm:text-base text-justify">
              陳氏熱衷於參與各類音樂活動，並活躍於多個樂團的演出，包括翱樂管樂團、香港愛樂管樂團、香港室樂愛樂管樂團及香港浸會交響樂團等。此外，他曾參與「Share the Stage with HKPhil」活動，與香港管弦樂團共同演出。除本地活動外，陳氏更遠赴奧地利參加大師班，跟隨Dario Zingales先生學習單簧管。
            </p>
            <p className="mb-4 text-sm sm:text-base text-justify">
              除了表演方面，陳氏也積極參與比賽，曾在香港演藝精英盃專業組獲得第一名，並在新中國際音樂比賽室內樂組榮獲一等獎。2019年，他與翱樂管樂團參加聶耳青少年管樂藝術周比賽，奪得公開組一等獎。
            </p>
            <p className="text-sm sm:text-base text-justify">
              陳氏擁有八年教學單簧管及色士風的經驗，涵蓋一對一教學、小組授課、小組合奏及樂團指導等範疇。其學生在各類比賽及考試中均表現優異，更曾於香港卡培尼亞音樂大賽及香港卓越音樂家大賽中獲得「優秀教師獎」。陳氏擅長為學生量身訂造練習計劃及目標，旨在幫助每位學生發揮自身的潛能。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Biography
