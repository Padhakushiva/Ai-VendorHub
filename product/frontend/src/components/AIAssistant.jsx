import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Sparkles, Search, TrendingUp, Heart, Settings, Zap, Gauge, BarChart3, MessageCircle } from 'lucide-react';
import { io } from 'socket.io-client';

export default function AIAssistant({ isOpen, onClose, clickX = 0, clickY = 0 }) {
  const [activeTab, setActiveTab] = useState('chat'); // chat, search, recommendations, analytics, settings
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Welcome to AI Control Center! I'm your intelligent shopping assistant. Explore recommendations, search smarter, or chat with me anytime. What can I help you with?",
      sender: 'ai',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  // AI Search & Recommendations State
  const [searchQuery, setSearchQuery] = useState('');
  const [recommendations, setRecommendations] = useState([
    { id: 1, title: 'Budget Smartphones Under ₹30,000', reason: 'Trending with similar users', badge: 'TRENDING' },
    { id: 2, title: '4K Monitors for Professional Work', reason: '95% match based on your activity', badge: 'RECOMMENDED' },
    { id: 3, title: 'Gaming Laptops with RTX 4080', reason: 'Top rated in your interest area', badge: 'POPULAR' },
  ]);

  // Settings State
  const [settings, setSettings] = useState({
    notifications: true,
    priceAlerts: true,
    personalizedSearch: true,
    darkMode: true,
  });

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, messages]);

  useEffect(() => {
    if (!isOpen) return;

    const token = localStorage.getItem('vendorhub_access_token');
    
    socketRef.current = io('http://localhost:3005', {
      auth: { token },
      transports: ['websocket', 'polling'], // Fallback to polling if websocket fails
    });

    socketRef.current.on('connect', () => setIsConnected(true));
    socketRef.current.on('disconnect', () => setIsConnected(false));

    socketRef.current.on('response', (data) => {
      if (data.success) {
        setMessages((prev) => [...prev, {
          id: Date.now() + Math.random(),
          text: data.message,
          sender: 'ai',
          timestamp: new Date()
        }]);
      }
    });

    socketRef.current.on('typing', (data) => {
      setIsLoading(data.isTyping);
    });

    socketRef.current.on('error', (data) => {
      setIsLoading(false);
      setMessages((prev) => [...prev, {
        id: Date.now() + Math.random(),
        text: "I'm having trouble connecting right now: " + (data.message || 'Unknown error'),
        sender: 'ai',
        timestamp: new Date()
      }]);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [isOpen]);

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const userMessage = {
      id: Date.now() + Math.random(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    if (socketRef.current && isConnected) {
      socketRef.current.emit('message', inputValue);
    } else {
      setIsLoading(false);
      setMessages((prev) => [...prev, {
        id: Date.now() + Math.random(),
        text: "I'm currently offline. Please check your connection.",
        sender: 'ai',
        timestamp: new Date()
      }]);
    }
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    console.log('Searching for:', searchQuery);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Ripple Animation Container */}
      <div 
        className="fixed inset-0 z-30 pointer-events-none"
        style={{
          width: '100vw',
          height: '100vh',
          top: 0,
          left: 0,
          overflow: 'visible',
        }}
      >
        {/* Primary Ripple */}
        <div
          style={{
            position: 'absolute',
            left: `${clickX}px`,
            top: `${clickY}px`,
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99,91,255,0.6) 0%, rgba(141,135,255,0.3) 50%, transparent 70%)',
            transform: 'translate(-50%, -50%)',
            animation: 'airdropRipple 1.5s ease-out forwards',
            filter: 'blur(0px)',
          }}
        />
        {/* Secondary Ripple - Delayed */}
        <div
          style={{
            position: 'absolute',
            left: `${clickX}px`,
            top: `${clickY}px`,
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99,145,255,0.5) 0%, rgba(100,180,255,0.2) 50%, transparent 70%)',
            transform: 'translate(-50%, -50%)',
            animation: 'airdropRipple 1.5s ease-out 0.2s forwards',
            filter: 'blur(0px)',
          }}
        />
      </div>

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/75 backdrop-blur-2xl"
        onClick={onClose}
        style={{ animation: 'fadeIn 1s ease-out 0.3s both' }}
      />

      {/* Main Modal Container - Perfectly Centered */}
      <div
        className="fixed z-50 flex items-center justify-center pointer-events-none"
        style={{
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          animation: 'slideUp 0.9s cubic-bezier(0.13, 0.27, 0.36, 1.13) 0.6s both',
        }}
      >
        {/* Modal Content */}
        <div className="w-11/12 max-w-5xl h-auto max-h-[90vh] pointer-events-auto flex flex-col">
          <div className="relative flex flex-col h-full overflow-hidden rounded-3xl border-2 border-[#635bff]/50 bg-gradient-to-b from-[#1a1a2e] via-[#16171f] to-[#0f1119] shadow-[0_30px_90px_rgba(99,91,255,0.3)]">
            
            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between border-b border-white/10 bg-[#0f0f1e]/60 px-6 py-4 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#635bff] to-[#8d87ff] animate-pulse">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white">AI Control Center</h2>
                  <p className="text-xs text-[#aaa6ba]">Your intelligent shopping hub</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-2 hover:bg-white/10 transition-colors"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex-shrink-0 flex border-b border-white/10 bg-[#0f0f1e]/40 px-6 overflow-x-auto">
              <button
                onClick={() => setActiveTab('chat')}
                className={`px-4 py-3 text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
                  activeTab === 'chat'
                    ? 'text-[#635bff] border-[#635bff]'
                    : 'text-[#aaa6ba] border-transparent hover:text-white'
                }`}
              >
                <MessageCircle className="inline h-4 w-4 mr-2" />
                Chat
              </button>
              <button
                onClick={() => setActiveTab('search')}
                className={`px-4 py-3 text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
                  activeTab === 'search'
                    ? 'text-[#635bff] border-[#635bff]'
                    : 'text-[#aaa6ba] border-transparent hover:text-white'
                }`}
              >
                <Search className="inline h-4 w-4 mr-2" />
                Smart Search
              </button>
              <button
                onClick={() => setActiveTab('recommendations')}
                className={`px-4 py-3 text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
                  activeTab === 'recommendations'
                    ? 'text-[#635bff] border-[#635bff]'
                    : 'text-[#aaa6ba] border-transparent hover:text-white'
                }`}
              >
                <TrendingUp className="inline h-4 w-4 mr-2" />
                Recommendations
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`px-4 py-3 text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
                  activeTab === 'analytics'
                    ? 'text-[#635bff] border-[#635bff]'
                    : 'text-[#aaa6ba] border-transparent hover:text-white'
                }`}
              >
                <BarChart3 className="inline h-4 w-4 mr-2" />
                Analytics
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-4 py-3 text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
                  activeTab === 'settings'
                    ? 'text-[#635bff] border-[#635bff]'
                    : 'text-[#aaa6ba] border-transparent hover:text-white'
                }`}
              >
                <Settings className="inline h-4 w-4 mr-2" />
                Settings
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden flex flex-col">
              
              {/* Chat Tab */}
              {activeTab === 'chat' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                    {messages.map((message, index) => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                        style={{
                          animation: `fadeInMessage 0.4s ease-out ${index * 0.1}s both`,
                        }}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md rounded-2xl px-4 py-3 ${
                            message.sender === 'user'
                              ? 'bg-gradient-to-r from-[#635bff] to-[#8d87ff] text-white'
                              : 'bg-[#16171f] text-[#f1efff] border border-white/10'
                          }`}
                        >
                          <p className="text-sm">{message.text}</p>
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="bg-[#16171f] rounded-2xl px-4 py-3 border border-white/10">
                          <div className="flex gap-2">
                            <div className="w-2 h-2 bg-[#635bff] rounded-full animate-bounce" />
                            <div className="w-2 h-2 bg-[#635bff] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                            <div className="w-2 h-2 bg-[#635bff] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                  
                  {/* Chat Input */}
                  <div className="flex-shrink-0 border-t border-white/10 bg-[#0f0f1e]/60 px-6 py-4 backdrop-blur-xl">
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Ask me anything..."
                        className="flex-1 rounded-full bg-[#16171f] border border-white/10 px-4 py-2 text-sm text-white placeholder-[#aaa6ba] focus:outline-none focus:border-[#635bff]"
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={!inputValue.trim() || isLoading}
                        className="rounded-full bg-gradient-to-r from-[#635bff] to-[#8d87ff] p-3 text-white transition-all hover:shadow-lg hover:shadow-[#635bff]/50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Smart Search Tab */}
              {activeTab === 'search' && (
                <div className="flex-1 overflow-y-auto px-6 py-4">
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Describe what you're looking for..."
                        className="flex-1 rounded-lg bg-[#16171f] border border-white/10 px-4 py-3 text-sm text-white placeholder-[#aaa6ba] focus:outline-none focus:border-[#635bff]"
                      />
                      <button
                        onClick={handleSearch}
                        className="rounded-lg bg-gradient-to-r from-[#635bff] to-[#8d87ff] px-4 py-3 text-white font-semibold transition-all hover:shadow-lg"
                      >
                        <Search className="h-5 w-5" />
                      </button>
                    </div>
                    
                    <div className="bg-[#16171f] border border-white/10 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-[#f1efff] mb-3">AI Search Tips:</h3>
                      <ul className="text-xs text-[#aaa6ba] space-y-2">
                        <li>✨ "budget gaming laptop under 60k"</li>
                        <li>✨ "best 4k monitors for productivity"</li>
                        <li>✨ "trending smartphones 2024"</li>
                        <li>✨ "affordable DSLR cameras for beginners"</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Recommendations Tab */}
              {activeTab === 'recommendations' && (
                <div className="flex-1 overflow-y-auto px-6 py-4">
                  <div className="space-y-3">
                    {recommendations.map((rec) => (
                      <div key={rec.id} className="bg-[#16171f] border border-white/10 rounded-lg p-4 hover:border-[#635bff]/30 transition-colors cursor-pointer group">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <h4 className="text-sm font-semibold text-white group-hover:text-[#635bff] transition-colors">{rec.title}</h4>
                            <p className="text-xs text-[#aaa6ba] mt-1">{rec.reason}</p>
                          </div>
                          <span className="px-2 py-1 bg-gradient-to-r from-[#635bff]/20 to-[#8d87ff]/20 text-[#635bff] text-xs font-semibold rounded-full whitespace-nowrap">{rec.badge}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Analytics Tab */}
              {activeTab === 'analytics' && (
                <div className="flex-1 overflow-y-auto px-6 py-4">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gradient-to-br from-[#635bff]/10 to-[#8d87ff]/10 border border-[#635bff]/20 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-[#aaa6ba]">Views Today</p>
                            <p className="text-2xl font-black text-[#635bff] mt-1">24</p>
                          </div>
                          <Gauge className="h-8 w-8 text-[#635bff]/30" />
                        </div>
                      </div>
                      <div className="bg-gradient-to-br from-[#8d87ff]/10 to-[#635bff]/10 border border-[#635bff]/20 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-[#aaa6ba]">Saved Items</p>
                            <p className="text-2xl font-black text-[#8d87ff] mt-1">12</p>
                          </div>
                          <Heart className="h-8 w-8 text-[#8d87ff]/30" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-[#16171f] border border-white/10 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-[#f1efff] mb-3">Your Activity</h3>
                      <div className="space-y-2 text-xs text-[#aaa6ba]">
                        <p>• Most viewed category: Electronics</p>
                        <p>• Average price range: ₹30,000 - ₹60,000</p>
                        <p>• Preferred brands: Apple, Samsung, Sony</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Settings Tab */}
              {activeTab === 'settings' && (
                <div className="flex-1 overflow-y-auto px-6 py-4">
                  <div className="space-y-3">
                    {Object.entries(settings).map(([key, value]) => (
                      <div key={key} className="bg-[#16171f] border border-white/10 rounded-lg p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {key === 'notifications' && <Zap className="h-5 w-5 text-[#635bff]" />}
                          {key === 'priceAlerts' && <TrendingUp className="h-5 w-5 text-[#635bff]" />}
                          {key === 'personalizedSearch' && <Search className="h-5 w-5 text-[#635bff]" />}
                          {key === 'darkMode' && <Settings className="h-5 w-5 text-[#635bff]" />}
                          <div>
                            <p className="text-sm font-semibold text-white capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                            <p className="text-xs text-[#aaa6ba]">
                              {key === 'notifications' && 'Get updates on new products'}
                              {key === 'priceAlerts' && 'Alert on price drops'}
                              {key === 'personalizedSearch' && 'AI-powered search results'}
                              {key === 'darkMode' && 'Dark theme enabled'}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setSettings({ ...settings, [key]: !value })}
                          className={`relative h-6 w-11 rounded-full transition-colors ${value ? 'bg-[#635bff]' : 'bg-[#2a2a3e]'}`}
                        >
                          <div
                            className={`absolute h-5 w-5 rounded-full bg-white top-0.5 transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes airdropRipple {
          0% {
            transform: translate(-50%, -50%) scale(0.02);
            opacity: 1;
            filter: blur(0px);
          }
          100% {
            transform: translate(-50%, -50%) scale(5);
            opacity: 0;
            filter: blur(50px);
          }
        }

        @keyframes slideUp {
          0% {
            transform: translateY(120px);
            opacity: 0;
            filter: blur(15px);
          }
          100% {
            transform: translateY(0);
            opacity: 1;
            filter: blur(0px);
          }
        }

        @keyframes fadeIn {
          0% {
            opacity: 0;
            filter: blur(15px);
          }
          100% {
            opacity: 1;
            filter: blur(0px);
          }
        }

        @keyframes fadeInMessage {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}
