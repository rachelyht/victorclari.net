import { Mail, Phone, MapPin, Calendar } from 'lucide-react'

const Contact = () => {
  return (
    <div className="py-16 bg-[#eef2f6]">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12 text-[#3a5a78]">Contact</h2>
        
        <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-xl p-8">
          <div className="flex justify-center">
            <div className="max-w-md">
              <h3 className="text-xl font-semibold mb-6 text-center text-[#3a5a78]">Get In Touch</h3>
              
              <div className="space-y-6">
                <div className="flex items-center">
                  <Mail className="w-6 h-6 text-[#3a5a78] mr-4" />
                  <span className="text-lg">contact@victorclari.net</span>
                </div>
                
                <div className="flex items-center">
                  <Phone className="w-6 h-6 text-[#3a5a78] mr-4" />
                  <span className="text-lg">+852 1234 5678</span>
                </div>
                
                <div className="flex items-center">
                  <MapPin className="w-6 h-6 text-[#3a5a78] mr-4" />
                  <span className="text-lg">Hong Kong</span>
                </div>
                
                <div className="flex items-center">
                  <Calendar className="w-6 h-6 text-[#3a5a78] mr-4" />
                  <span className="text-lg">Available for performances and teaching</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Contact
