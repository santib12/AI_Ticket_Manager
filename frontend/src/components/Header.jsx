function Header({ onToggleSidebar }) {
  return (
    <header className="bg-white shadow-lg border-b-4 border-pnc-orange sticky top-0 z-50">
      <div className="w-full max-w-[95%] mx-auto px-6 py-3">
        <div className="flex items-center justify-between relative">
          {/* PNC Logo - Far Left */}
          <div className="flex-shrink-0">
            <img 
              src="/PNC_LOGO.png" 
              alt="PNC Bank Logo" 
              className="h-28 w-auto"
              style={{ maxWidth: '350px' }}
              onError={(e) => {
                // Fallback if image doesn't load
                e.target.style.display = 'none'
              }}
            />
          </div>

          {/* Centered Header Content */}
          <div className="flex-1 flex justify-center">
            <div className="fade-in text-center">
              <h1 className="text-4xl font-bold" style={{ color: '#003087' }}>
                PM Ticket Manager
              </h1>
            </div>
          </div>

          {/* Right Side - Status and Developers Button */}
          <div className="flex-shrink-0 flex items-center space-x-4" style={{ marginLeft: 'auto', paddingLeft: '2rem' }}>
            <div className="hidden md:flex items-center space-x-2 text-sm" style={{ color: '#003087' }}>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>System Ready</span>
            </div>
            <button
              onClick={onToggleSidebar}
              className="flex items-center space-x-2 px-4 py-2 text-white rounded-lg transition-colors font-semibold hover:opacity-90"
              style={{ backgroundColor: '#003087' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span>Developers</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header

