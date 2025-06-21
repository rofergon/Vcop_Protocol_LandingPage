import React, { useState, useEffect } from 'react';
import { 
  Code, 
  Rocket, 
  Target, 
  Users, 
  Globe, 
  ChevronDown,
  ArrowRight,
  Zap,
  Heart,
  Coffee,
  BookOpen,
  Award,
  MapPin,
  Calendar,
  Github,
  Linkedin,
  Mail,
  Phone,
  Star,
  TrendingUp,
  Lightbulb,
  Shield
} from 'lucide-react';

const AboutMe: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentSkill, setCurrentSkill] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const skills = [
    { name: "Blockchain Development", level: 95, color: "emerald" },
    { name: "DeFi Protocols", level: 90, color: "blue" },
    { name: "Smart Contracts", level: 88, color: "purple" },
    { name: "Frontend Development", level: 85, color: "yellow" },
    { name: "Protocol Design", level: 92, color: "red" },
    { name: "Team Leadership", level: 87, color: "green" }
  ];

  const experiences = [
    {
      role: "VCOP Protocol Founder",
      company: "VCOP Protocol",
      period: "2024 - Present",
      description: "Leading the development of the first DeFi protocol designed for Latin American markets"
    },
    {
      role: "Blockchain Engineer",
      company: "Previous Company",
      period: "2022 - 2024",
      description: "Developed smart contracts and DeFi solutions for institutional clients"
    },
    {
      role: "Full Stack Developer",
      company: "Tech Startup",
      period: "2020 - 2022",
      description: "Built scalable web applications and contributed to product architecture"
    }
  ];

  const achievements = [
    { icon: <Award className="w-6 h-6" />, title: "VCOP Protocol Launch", desc: "Successfully launched on Base Sepolia" },
    { icon: <Shield className="w-6 h-6" />, title: "Security First", desc: "Halborn audit in progress" },
    { icon: <Users className="w-6 h-6" />, title: "Community Building", desc: "Growing Latin American DeFi community" },
    { icon: <Lightbulb className="w-6 h-6" />, title: "Innovation", desc: "First peso-pegged DeFi protocol" }
  ];

  useEffect(() => {
    setIsVisible(true);
    const interval = setInterval(() => {
      setCurrentSkill((prev) => (prev + 1) % skills.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 300);
    return () => clearTimeout(timer);
  }, [currentSkill]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-blue-950 relative overflow-hidden">
      {/* VCOP-style Diagonal Lines Background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-blue-500/10 to-transparent transform -rotate-12"></div>
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-blue-400/30 to-transparent transform rotate-12 translate-y-32"></div>
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-blue-400/20 to-transparent transform rotate-12 translate-y-64"></div>
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-blue-400/30 to-transparent transform rotate-12 translate-y-96"></div>
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-blue-400/20 to-transparent transform rotate-12 translate-y-128"></div>
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-blue-400/30 to-transparent transform rotate-12 translate-y-160"></div>
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-blue-400/20 to-transparent transform rotate-12 translate-y-192"></div>
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-blue-400/30 to-transparent transform rotate-12 translate-y-224"></div>
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-blue-400/20 to-transparent transform rotate-12 translate-y-256"></div>
        
        {/* Additional diagonal elements */}
        <div className="absolute top-0 right-0 w-full h-0.5 bg-gradient-to-l from-transparent via-emerald-400/20 to-transparent transform -rotate-12 translate-y-40"></div>
        <div className="absolute top-0 right-0 w-full h-0.5 bg-gradient-to-l from-transparent via-emerald-400/15 to-transparent transform -rotate-12 translate-y-80"></div>
        <div className="absolute top-0 right-0 w-full h-0.5 bg-gradient-to-l from-transparent via-emerald-400/20 to-transparent transform -rotate-12 translate-y-120"></div>
        <div className="absolute top-0 right-0 w-full h-0.5 bg-gradient-to-l from-transparent via-emerald-400/15 to-transparent transform -rotate-12 translate-y-160"></div>
      </div>

      {/* Subtle geometric accents */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
        <div className="absolute top-20 left-20 w-2 h-2 bg-emerald-400/60 rotate-45"></div>
        <div className="absolute top-40 right-32 w-1 h-1 bg-blue-400/60 rounded-full"></div>
        <div className="absolute bottom-40 left-16 w-1.5 h-1.5 bg-white/40 rotate-12"></div>
        <div className="absolute bottom-20 right-20 w-1 h-1 bg-emerald-400/60 rounded-full"></div>
        <div className="absolute top-1/2 left-8 w-2 h-2 bg-blue-400/40 rotate-45"></div>
        <div className="absolute top-1/3 right-12 w-1 h-1 bg-white/60 rounded-full"></div>
      </div>

             {/* Navigation - Clean VCOP Style */}
       <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-blue-500/20">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="flex items-center justify-between h-16">
             <div className="flex items-center space-x-4">
               <img 
                 src="/logovcop.png" 
                 alt="VCOP Protocol" 
                 className="w-10 h-10 hover:scale-110 transition-all duration-300"
               />
               <div className="h-6 w-px bg-white/20"></div>
               <span className="text-white font-semibold text-lg tracking-wide">About Sebastian</span>
             </div>
             <div className="flex items-center space-x-6">
               <a 
                 href="/" 
                 className="text-white/70 hover:text-emerald-400 transition-colors text-sm font-medium flex items-center gap-2"
               >
                 ← Back to VCOP Protocol
               </a>
             </div>
           </div>
         </div>
       </nav>

      {/* Main Content */}
      <div className="relative z-10 pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Hero Section with Photo */}
          <div className={`text-center mb-20 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            
                         {/* Photo Container - Clean VCOP Style */}
             <div className="relative mb-12 flex justify-center">
               <div className="relative">
                 {/* Elegant circular border with subtle glow */}
                 <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-400/30 via-blue-500/30 to-emerald-400/30 p-1 animate-pulse-slow"></div>
                 
                 {/* Photo container with professional styling */}
                 <div className="relative w-48 h-48 md:w-56 md:h-56 lg:w-64 lg:h-64">
                   <div className="absolute inset-1 rounded-full bg-gradient-to-br from-emerald-400/80 to-blue-600/80 p-0.5">
                     <div className="w-full h-full rounded-full overflow-hidden bg-slate-900 border-2 border-white/10 shadow-2xl">
                       <img 
                         src="/brVJ2rO0_400x400.jpg" 
                         alt="Sebastian - VCOP Protocol Founder" 
                         className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                       />
                     </div>
                   </div>
                   
                   {/* Clean geometric accent elements */}
                   <div className="absolute -top-2 -right-2 w-4 h-4 bg-emerald-400/80 rotate-45 rounded-sm"></div>
                   <div className="absolute -bottom-2 -left-2 w-3 h-3 bg-blue-400/80 rounded-full"></div>
                   <div className="absolute top-1/4 -left-3 w-2 h-2 bg-white/60 rotate-45"></div>
                   <div className="absolute bottom-1/4 -right-3 w-2 h-2 bg-emerald-300/60 rounded-full"></div>
                 </div>
                 
                 {/* Subtle accent lines */}
                 <div className="absolute top-1/2 -left-16 w-12 h-0.5 bg-gradient-to-r from-transparent to-emerald-400/40 transform -rotate-12"></div>
                 <div className="absolute top-1/2 -right-16 w-12 h-0.5 bg-gradient-to-l from-transparent to-blue-400/40 transform rotate-12"></div>
               </div>
             </div>

            {/* Name and Title */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-4 leading-tight">
              Hi, I'm <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-blue-400 to-purple-400 animate-gradient">
                Sebastian
              </span>
            </h1>
            
            <div className="text-xl md:text-2xl lg:text-3xl text-blue-200 mb-6 font-light">
              Blockchain Developer & <span className="text-emerald-400 font-semibold">VCOP Protocol Founder</span>
            </div>
            
            <p className="text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed mb-8">
              Passionate about creating innovative DeFi solutions for Latin America. 
              Building the future of decentralized finance, one protocol at a time.
            </p>

            {/* Contact buttons */}
            <div className="flex flex-wrap justify-center gap-4">
              <button className="group bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-semibold py-3 px-6 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Contact Me
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="border-2 border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-white font-semibold py-3 px-6 rounded-full transition-all duration-300 flex items-center gap-2">
                <Github className="w-5 h-5" />
                GitHub
              </button>
              <button className="border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white font-semibold py-3 px-6 rounded-full transition-all duration-300 flex items-center gap-2">
                <Linkedin className="w-5 h-5" />
                LinkedIn
              </button>
            </div>
          </div>

          {/* Skills Section */}
          <div className="mb-20">
            <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-12">
              My <span className="text-emerald-400">Expertise</span>
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Skills List */}
              <div className="space-y-6">
                {skills.map((skill, index) => (
                  <div 
                    key={index}
                    className={`transition-all duration-500 ${
                      currentSkill === index ? 'scale-105 opacity-100' : 'opacity-70'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-white font-semibold">{skill.name}</span>
                      <span className="text-blue-200">{skill.level}%</span>
                    </div>
                                         <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                       <div 
                         className={`h-full rounded-full transition-all duration-1000 relative ${
                           skill.color === 'emerald' ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' :
                           skill.color === 'blue' ? 'bg-gradient-to-r from-blue-400 to-blue-600' :
                           skill.color === 'purple' ? 'bg-gradient-to-r from-purple-400 to-purple-600' :
                           skill.color === 'yellow' ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                           skill.color === 'red' ? 'bg-gradient-to-r from-red-400 to-red-600' :
                           'bg-gradient-to-r from-green-400 to-green-600'
                         }`}
                         style={{ 
                           width: currentSkill === index ? `${skill.level}%` : '0%',
                           boxShadow: currentSkill === index ? `0 0 20px rgba(34, 197, 94, 0.5)` : 'none'
                         }}
                       >
                         <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                       </div>
                     </div>
                  </div>
                ))}
              </div>

                             {/* Current Skill Highlight - VCOP Style */}
               <div className={`bg-slate-800/30 backdrop-blur-xl rounded-2xl p-8 border border-blue-500/20 transition-all duration-500 relative overflow-hidden ${isAnimating ? 'scale-95 opacity-70' : 'scale-100 opacity-100'}`}>
                 {/* Subtle diagonal accent */}
                 <div className="absolute top-0 right-0 w-full h-0.5 bg-gradient-to-l from-emerald-400/30 to-transparent transform -rotate-12"></div>
                 
                 <div className="text-center relative z-10">
                   <div className={`text-5xl md:text-6xl font-bold text-white mb-4 ${
                     skills[currentSkill].color === 'emerald' ? '' :
                     skills[currentSkill].color === 'blue' ? 'text-blue-400' :
                     skills[currentSkill].color === 'purple' ? 'text-purple-400' :
                     skills[currentSkill].color === 'yellow' ? 'text-yellow-400' :
                     skills[currentSkill].color === 'red' ? 'text-red-400' :
                     'text-green-400'
                   } ${currentSkill === 0 ? 'text-emerald-400' : ''}`}>
                     {skills[currentSkill].level}%
                   </div>
                   <h3 className="text-xl md:text-2xl font-semibold text-white mb-6 tracking-wide">
                     {skills[currentSkill].name}
                   </h3>
                   
                   {/* Clean indicator dots */}
                   <div className="flex justify-center space-x-3">
                     {skills.map((_, index) => (
                       <button
                         key={index}
                         onClick={() => setCurrentSkill(index)}
                         className={`h-2 rounded-full transition-all duration-300 ${
                           index === currentSkill 
                             ? 'bg-emerald-400 w-8 shadow-lg shadow-emerald-400/30' 
                             : 'bg-slate-500/50 w-2 hover:bg-slate-400'
                         }`}
                       />
                     ))}
                   </div>
                 </div>
               </div>
            </div>
          </div>

          {/* Experience Section */}
          <div className="mb-20">
            <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-12">
              My <span className="text-blue-400">Journey</span>
            </h2>
            
            <div className="space-y-8">
              {experiences.map((exp, index) => (
                                 <div 
                   key={index}
                   className="group bg-slate-800/20 backdrop-blur-xl rounded-2xl p-6 border border-blue-500/20 hover:border-emerald-400/40 transition-all duration-300 hover:transform hover:scale-[1.02] relative overflow-hidden"
                 >
                   {/* Subtle diagonal accent line */}
                   <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-emerald-400/30 to-transparent transform rotate-3 group-hover:from-emerald-400/50 transition-all duration-300"></div>
                  <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors">
                        {exp.role}
                      </h3>
                      <p className="text-blue-200">{exp.company}</p>
                    </div>
                    <div className="flex items-center text-slate-400 mt-2 md:mt-0">
                      <Calendar className="w-4 h-4 mr-2" />
                      {exp.period}
                    </div>
                  </div>
                  <p className="text-slate-300 leading-relaxed">{exp.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Achievements */}
          <div className="mb-20">
            <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-12">
              Key <span className="text-purple-400">Achievements</span>
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {achievements.map((achievement, index) => (
                                 <div 
                   key={index}
                   className="bg-slate-800/20 backdrop-blur-xl rounded-2xl p-6 border border-blue-500/20 hover:border-emerald-400/40 transition-all duration-300 hover:transform hover:-translate-y-2 text-center group relative overflow-hidden"
                 >
                   {/* Subtle diagonal accent */}
                   <div className="absolute top-0 right-0 w-full h-0.5 bg-gradient-to-l from-blue-400/20 to-transparent transform -rotate-6 group-hover:from-emerald-400/40 transition-all duration-300"></div>
                  <div className="text-purple-400 mb-4 flex justify-center group-hover:scale-110 transition-transform duration-300">
                    {achievement.icon}
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-purple-400 transition-colors">
                    {achievement.title}
                  </h3>
                  <p className="text-slate-300 text-sm">{achievement.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* VCOP Protocol Highlight */}
          <div className="bg-gradient-to-r from-emerald-900/50 to-blue-900/50 backdrop-blur-lg rounded-3xl p-8 md:p-12 border border-emerald-400/30 mb-20">
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <img 
                  src="/logovcop.png" 
                  alt="VCOP Protocol" 
                  className="w-16 h-16 md:w-20 md:h-20 animate-pulse"
                />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Building <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-400">VCOP Protocol</span>
              </h2>
              <p className="text-xl text-slate-200 max-w-3xl mx-auto leading-relaxed mb-8">
                VCOP Protocol represents my vision for the future of DeFi in Latin America. 
                A peso-pegged protocol that allows users to hedge against currency devaluation 
                while maintaining exposure to crypto upside.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <a 
                  href="https://vcop-lime.vercel.app/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-3 px-6 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center gap-2"
                >
                  <Rocket className="w-5 h-5" />
                  Try VCOP App
                  <ArrowRight className="w-4 h-4" />
                </a>
                <a 
                  href="https://saritus-organization.gitbook.io/docs-vcop-protocol" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="border-2 border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-white font-semibold py-3 px-6 rounded-full transition-all duration-300 flex items-center gap-2"
                >
                  <BookOpen className="w-5 h-5" />
                  Documentation
                </a>
              </div>
            </div>
          </div>

          {/* Contact Section */}
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-8">
              Let's <span className="text-yellow-400">Connect</span>
            </h2>
            <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
              Interested in collaborating or learning more about VCOP Protocol? 
              I'd love to hear from you!
            </p>
            
            <div className="flex flex-wrap justify-center gap-6">
              <button className="group bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white font-semibold py-4 px-8 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center gap-3">
                <Mail className="w-6 h-6" />
                <span>sebastian@vcop.protocol</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Scroll to top button */}
      <div className="fixed bottom-8 right-8 z-50">
        <button 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="bg-emerald-500 hover:bg-emerald-400 text-white p-3 rounded-full shadow-lg transition-all duration-300 transform hover:scale-110"
        >
          <ChevronDown className="w-6 h-6 rotate-180" />
        </button>
      </div>
    </div>
  );
};

export default AboutMe;