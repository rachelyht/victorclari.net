import { Mail, Phone, MapPin, Calendar } from 'lucide-react'

const Contact = () => {
  return (
    <div className="py-16 bg-[#eef2f6]">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12 text-[#3a5a78]">Contact</h2>
        
        <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-xl p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold mb-6 text-[#3a5a78]">Get In Touch</h3>
              
              <div className="space-y-4">
                <div className="flex items-center">
                  <Mail className="w-5 h-5 text-[#3a5a78] mr-3" />
                  <span>contact@victorclari.net</span>
                </div>
                
                <div className="flex items-center">
                  <Phone className="w-5 h-5 text-[#3a5a78] mr-3" />
                  <span>+852 1234 5678</span>
                </div>
                
                <div className="flex items-center">
                  <MapPin className="w-5 h-5 text-[#3a5a78] mr-3" />
                  <span>Hong Kong</span>
                </div>
                
                <div className="flex items-center">
                  <Calendar className="w-5 h-5 text-[#3a5a78] mr-3" />
                  <span>Available for performances and teaching</span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold mb-6 text-[#3a5a78]">Send A Message</h3>
              
              <form className="space-y-4">
                <div>
                  <input 
                    type="text" 
                    placeholder="Your Name" 
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3a5a78]"
                  />
                </div>
                
                <div>
                  <input 
                    type="email" 
                    placeholder="Your Email" 
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3a5a78]"
                  />
                </div>
                
                <div>
                  <textarea 
                    placeholder="Your Message" 
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3a5a78]"
                  ></textarea>
                </div>
                
                <button 
                  type="submit" 
                  className="px-6 py-2 bg-[#3a5a78] text-white rounded-md hover:bg-[#1c2e3f] transition-colors"
                >
                  Send Message
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Contact
