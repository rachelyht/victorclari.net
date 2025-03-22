import { useState } from 'react'
import { Input } from "../components/ui/input"
import { Textarea } from "../components/ui/textarea"
import { Button } from "../components/ui/button"
import { Mail, Phone } from 'lucide-react'

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // In a real application, this would send the form data to a server
    console.log('Form submitted:', formData)
    alert('Thank you for your message! I will get back to you soon.')
    setFormData({
      name: '',
      email: '',
      subject: '',
      message: ''
    })
  }

  return (
    <div className="min-h-screen bg-blue-400/30 py-8 sm:py-12 md:py-16">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl sm:text-4xl font-bold text-center mb-6 sm:mb-8 md:mb-12 text-white">Contact</h1>
        
        <div className="max-w-sm sm:max-w-md md:max-w-lg lg:max-w-2xl mx-auto bg-white rounded-lg shadow-xl p-4 sm:p-6 md:p-8">
          <form onSubmit={handleSubmit}>
            <div className="mb-3 sm:mb-4">
              <label htmlFor="name" className="block mb-1 sm:mb-2 font-medium text-sm sm:text-base">Name</label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full"
              />
            </div>
            
            <div className="mb-3 sm:mb-4">
              <label htmlFor="email" className="block mb-1 sm:mb-2 font-medium text-sm sm:text-base">Email</label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full"
              />
            </div>
            
            <div className="mb-3 sm:mb-4">
              <label htmlFor="subject" className="block mb-1 sm:mb-2 font-medium text-sm sm:text-base">Subject</label>
              <Input
                id="subject"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                required
                className="w-full"
              />
            </div>
            
            <div className="mb-4 sm:mb-6">
              <label htmlFor="message" className="block mb-1 sm:mb-2 font-medium text-sm sm:text-base">Message</label>
              <Textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                required
                className="w-full min-h-24 sm:min-h-32"
              />
            </div>
            
            <Button type="submit" className="w-full bg-blue-500 hover:bg-blue-600 text-sm sm:text-base">
              Send Message
            </Button>
          </form>
          
          <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t">
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Contact Information</h2>
            <div className="flex items-center mb-2">
              <Mail size={18} className="mr-2" />
              <p className="text-sm sm:text-base">contact@victorclari.net</p>
            </div>
            <div className="flex items-center">
              <Phone size={18} className="mr-2" />
              <p className="text-sm sm:text-base">+1 (123) 456-7890</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Contact
