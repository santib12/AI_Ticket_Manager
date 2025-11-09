function Header({ onToggleSidebar }) {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50 backdrop-blur-sm bg-white/95">
      <div className="w-full max-w-[95%] mx-auto px-6 py-6">
        <div className="flex items-center justify-between relative">
          {/* Developers Button - Far Left */}
          <div className="flex-shrink-0">
            <button
              onClick={onToggleSidebar}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span>Developers</span>
            </button>
          </div>

          {/* Centered Header Content */}
          <div className="flex-1 flex justify-center">
            <div className="fade-in text-center">
              <h1 className="text-4xl font-bold text-primary-600">
                🎯 TicketFlow AI
              </h1>
              <p className="text-gray-600 mt-1">
                Intelligent ticket assignment with transparent AI reasoning
              </p>
            </div>
          </div>

          {/* Right Side - Status Indicator */}
          <div className="flex-shrink-0 hidden md:flex items-center space-x-2 text-sm text-gray-500">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>System Ready</span>
          </div>
          
          {/* Spacer for mobile to balance layout */}
          <div className="flex-shrink-0 w-24 md:hidden"></div>
        </div>
      </div>
    </header>
  )
}

export default Header

