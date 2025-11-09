import { useState, useEffect } from 'react'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import TicketPreview from './components/TicketPreview'
import AssignmentResults from './components/AssignmentResults'
import AssignmentApproval from './components/AssignmentApproval'
import DeveloperDetail from './components/DeveloperDetail'
import DeveloperView from './components/DeveloperView'
import LoadingSpinner from './components/LoadingSpinner'
import { assignTickets, getTickets } from './services/api'


function App() {
  const [tickets, setTickets] = useState(null)
  const [assignments, setAssignments] = useState(null)
  const [finalizedAssignments, setFinalizedAssignments] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingTickets, setLoadingTickets] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('upload')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedDeveloper, setSelectedDeveloper] = useState(null)
  const [rejectedTickets, setRejectedTickets] = useState({}) // Track rejected tickets per developer
  const [ticketLimit, setTicketLimit] = useState('all') // Number of tickets to assign
  const [storyPointsFilter, setStoryPointsFilter] = useState('all') // Filter by story points
  const [difficultyFilter, setDifficultyFilter] = useState('all') // Filter by priority (difficulty)

  // Load tickets on component mount
  useEffect(() => {
    loadTickets()
  }, [])

  const loadTickets = async () => {
    setLoadingTickets(true)
    setError(null)
    try {
      const result = await getTickets()
      if (result && result.tickets) {
        setTickets(result.tickets)
      }
    } catch (err) {
      setError(err.message || 'Failed to load tickets')
    } finally {
      setLoadingTickets(false)
    }
  }

  const getFilteredTickets = () => {
    if (!tickets || tickets.length === 0) return []
    
    let filtered = [...tickets]
    
    // Filter by story points
    if (storyPointsFilter !== 'all') {
      const [min, max] = storyPointsFilter.split('-').map(Number)
      filtered = filtered.filter(ticket => {
        const points = parseInt(ticket.story_points) || 0
        return points >= min && points <= max
      })
    }
    
    // Filter by difficulty (priority)
    if (difficultyFilter !== 'all') {
      filtered = filtered.filter(ticket => {
        const priority = (ticket.priority || '').toLowerCase()
        return priority === difficultyFilter.toLowerCase()
      })
    }
    
    // Limit number of tickets
    if (ticketLimit !== 'all' && ticketLimit !== '20+') {
      const limit = parseInt(ticketLimit)
      filtered = filtered.slice(0, limit)
    } else if (ticketLimit === '20+') {
      // For 20+, ensure at least 20 tickets (or all if less than 20 available)
      if (filtered.length >= 20) {
        // Keep all tickets (no limit)
      } else {
        // If less than 20, keep all available
      }
    }
    
    return filtered
  }

  const handleAssign = async () => {
    const filteredTickets = getFilteredTickets()
    
    if (!filteredTickets || filteredTickets.length === 0) {
      setError('No tickets match the selected filters')
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      // Convert filtered tickets array to CSV format for the API
      const csvContent = convertTicketsToCSV(filteredTickets)
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const file = new File([blob], 'tickets.csv', { type: 'text/csv' })
      
      const result = await assignTickets(file)
      setAssignments(result)
    } catch (err) {
      setError(err.message || 'An error occurred while assigning tickets')
    } finally {
      setLoading(false)
    }
  }

  const convertTicketsToCSV = (ticketsData) => {
    if (!ticketsData || ticketsData.length === 0) return ''
    
    // Get all unique keys from tickets
    const headers = Object.keys(ticketsData[0])
    
    // Create CSV content
    const csvRows = [
      headers.join(','), // Header row
      ...ticketsData.map(ticket => 
        headers.map(header => {
          const value = ticket[header] || ''
          // Escape quotes and wrap in quotes if contains comma or quote
          const stringValue = String(value).replace(/"/g, '""')
          return `"${stringValue}"`
        }).join(',')
      )
    ]
    
    return csvRows.join('\n')
  }

  const handleApproveSelected = (approvedTickets, rejectedTicketsData) => {
    // Convert approved tickets to assignment format
    const approvedAssignments = approvedTickets.map(ticket => ({
      ticket_id: ticket.ticket_id,
      assigned_to: ticket.assigned_to,
      reason: ticket.reason
    }))
    
    // Store rejected tickets grouped by developer
    const rejectedByDeveloper = {}
    rejectedTicketsData.forEach(ticket => {
      const dev = ticket.assigned_to
      if (!rejectedByDeveloper[dev]) {
        rejectedByDeveloper[dev] = []
      }
      rejectedByDeveloper[dev].push(ticket)
    })
    setRejectedTickets(rejectedByDeveloper)
    
    setFinalizedAssignments({
      status: "success",
      total_tickets: approvedTickets.length,
      assignments: approvedAssignments
    })
    setAssignments(null) // Clear pending approvals
  }

  const handleReset = () => {
    setAssignments(null)
    setFinalizedAssignments(null)
    setError(null)
    setSelectedDeveloper(null)
  }

  const handleSelectDeveloper = (developer) => {
    setSelectedDeveloper(developer)
    setSidebarOpen(false)
    setActiveTab('upload') // Ensure we're on the right tab
  }

  const handleBackFromDeveloper = () => {
    setSelectedDeveloper(null)
  }

  return (
    <div className="min-h-screen relative z-10 bg-gray-50">
      <Header 
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />
      
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSelectDeveloper={handleSelectDeveloper}
        assignments={finalizedAssignments || assignments}
        tickets={tickets}
      />
      
      <div className="w-full max-w-[95%] mx-auto px-6 py-8 relative z-10">
        {/* Tabs */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-white rounded-lg p-1 shadow-sm border border-gray-200">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
                activeTab === 'upload'
                  ? 'bg-pnc-orange text-black shadow-md'
                  : 'text-pnc-blue opacity-70 hover:text-pnc-blue hover:bg-blue-50'
              }`}
            >
              📤 Assign Tickets
            </button>
            <button
              onClick={() => setActiveTab('developers')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
                activeTab === 'developers'
                  ? 'bg-pnc-orange text-black shadow-md'
                  : 'text-pnc-blue opacity-70 hover:text-pnc-blue hover:bg-blue-50'
              }`}
            >
              👥 View Developers
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'upload' && (
          <div className="space-y-6">
            {/* Developer Detail View */}
            {selectedDeveloper && (
              <DeveloperDetail
                developer={selectedDeveloper}
                assignments={finalizedAssignments || assignments}
                tickets={tickets}
                rejectedTickets={rejectedTickets[selectedDeveloper.name] || []}
                onBack={handleBackFromDeveloper}
              />
            )}

            {/* Regular Ticket Assignment Flow */}
            {!selectedDeveloper && (
              <>
            {loadingTickets && (
              <div className="card fade-in">
                <LoadingSpinner 
                  message="Loading tickets from CSV file..." 
                  size="lg"
                />
                <div className="mt-6 space-y-2">
                  <div className="skeleton h-4 w-3/4 mx-auto"></div>
                  <div className="skeleton h-4 w-1/2 mx-auto"></div>
                </div>
              </div>
            )}

            {error && !loadingTickets && (
              <div className="card bg-red-50 border-red-200 fade-in">
                <div className="flex items-start space-x-3">
                  <span className="text-3xl">❌</span>
                  <div className="flex-1">
                    <h3 className="font-semibold text-red-800 text-lg mb-1">Error Loading Tickets</h3>
                    <p className="text-red-600 mb-4">{error}</p>
                    <div className="flex space-x-2">
                      <button
                        onClick={loadTickets}
                        className="btn-secondary text-sm"
                      >
                        🔄 Retry
                      </button>
                      <button
                        onClick={() => setError(null)}
                        className="text-sm text-red-600 hover:text-red-800 underline"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tickets && !assignments && !loadingTickets && (
              <div className="space-y-6 fade-in">
                <div className="card bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 slide-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="bg-blue-500 rounded-full p-2">
                        <span className="text-2xl">📋</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-blue-800 text-lg">Tickets Loaded Successfully</h3>
                      </div>
                    </div>
                    <button
                      onClick={loadTickets}
                      className="btn-secondary text-sm"
                      title="Reload tickets from CSV"
                    >
                      🔄 Refresh
                    </button>
                  </div>
                </div>

                <div className="slide-in">
                  <TicketPreview tickets={tickets} />
                </div>
                
                <div className="card slide-in">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-pnc-blue mb-2">Ready to Assign</h2>
                    <p className="text-pnc-blue mb-4">
                      Select filters and click the button below to assign tickets to developers using AI.
                    </p>
                    
                    {/* Filter Controls */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      {/* Number of Tickets */}
                      <div>
                        <label className="block text-sm font-medium text-pnc-blue mb-2">
                          Number of Tickets
                        </label>
                        <select
                          value={ticketLimit}
                          onChange={(e) => setTicketLimit(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pnc-blue focus:border-pnc-blue text-pnc-blue"
                        >
                          <option value="all">All Tickets</option>
                          <option value="5">5 Tickets</option>
                          <option value="10">10 Tickets</option>
                          <option value="15">15 Tickets</option>
                          <option value="20+">20+ Tickets</option>
                        </select>
                      </div>
                      
                      {/* Story Points Filter */}
                      <div>
                        <label className="block text-sm font-medium text-pnc-blue mb-2">
                          Story Points
                        </label>
                        <select
                          value={storyPointsFilter}
                          onChange={(e) => setStoryPointsFilter(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pnc-blue focus:border-pnc-blue text-pnc-blue"
                        >
                          <option value="all">All Story Points</option>
                          <option value="1-2">1-2 Points (Easy)</option>
                          <option value="3-4">3-4 Points (Medium)</option>
                          <option value="5-6">5-6 Points (Hard)</option>
                          <option value="7-8">7-8 Points (Very Hard)</option>
                        </select>
                      </div>
                      
                      {/* Difficulty Filter (Priority) */}
                      <div>
                        <label className="block text-sm font-medium text-pnc-blue mb-2">
                          Difficulty (Priority)
                        </label>
                        <select
                          value={difficultyFilter}
                          onChange={(e) => setDifficultyFilter(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pnc-blue focus:border-pnc-blue text-pnc-blue"
                        >
                          <option value="all">All Priorities</option>
                          <option value="high">High Priority</option>
                          <option value="medium">Medium Priority</option>
                          <option value="low">Low Priority</option>
                        </select>
                      </div>
                    </div>
                    
                    {/* Filter Summary */}
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-pnc-blue">
                        <strong>📊 Filter Summary:</strong> {getFilteredTickets().length} ticket(s) will be assigned
                        {ticketLimit !== 'all' && ticketLimit !== '20+' && ` (limited to ${ticketLimit})`}
                        {ticketLimit === '20+' && ` (20 or more)`}
                        {storyPointsFilter !== 'all' && ` • Story Points: ${storyPointsFilter}`}
                        {difficultyFilter !== 'all' && ` • Priority: ${difficultyFilter.charAt(0).toUpperCase() + difficultyFilter.slice(1)}`}
                      </p>
                    </div>
                    
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-pnc-blue">
                      <p className="text-sm text-pnc-blue">
                        <strong>💡 What happens:</strong> The AI will analyze each ticket's requirements, match them with developer skills, 
                        consider workload and availability, then provide transparent reasoning for each assignment.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleAssign}
                    disabled={loading}
                    className="btn-primary w-full text-lg py-4 relative overflow-hidden group"
                  >
                    <span className="relative z-10 flex items-center justify-center">
                      {loading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Processing tickets with AI...</span>
                        </>
                      ) : (
                        <>
                          <span className="mr-2">🚀</span>
                          <span>Assign Tickets with AI</span>
                        </>
                      )}
                    </span>
                    {!loading && (
                      <div className="absolute inset-0 bg-gradient-to-r from-pnc-orange-dark to-pnc-orange opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                    )}
                  </button>
                  {loading && (
                    <div className="mt-4 text-center">
                      <p className="text-sm text-gray-500">
                        This may take a minute for {tickets.length} tickets...
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {assignments && !finalizedAssignments && (
              <AssignmentApproval 
                assignments={assignments} 
                tickets={tickets}
                onApproveSelected={handleApproveSelected}
              />
            )}

            {finalizedAssignments && (
              <AssignmentResults 
                assignments={finalizedAssignments} 
                tickets={tickets}
                onReset={handleReset}
              />
            )}
              </>
            )}
          </div>
        )}

        {activeTab === 'developers' && (
          <DeveloperView />
        )}
      </div>

      <footer className="mt-12 py-6 text-center text-gray-600 border-t border-gray-200">
        <p className="text-sm">
          <strong>AI Ticket Orchestrator</strong> - Powered by OpenAI GPT-4o-mini 🤖
        </p>
      </footer>
    </div>
  )
}

export default App
