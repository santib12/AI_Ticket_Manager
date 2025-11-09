import { useState, useEffect } from 'react'

function Sidebar({ isOpen, onClose, onSelectDeveloper, assignments, tickets }) {
  const [developers, setDevelopers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load developers from API
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
    fetch(`${API_URL}/developers/`)
      .then(response => {
        if (!response.ok) throw new Error('Failed to fetch developers')
        return response.json()
      })
      .then(data => {
        if (data.status === 'success' && data.developers) {
          // Calculate assignment stats for each developer
          const developersWithStats = data.developers.map(dev => {
            if (assignments && assignments.assignments) {
              const devAssignments = assignments.assignments.filter(
                a => a.assigned_to === dev.name
              )
              const assignedTickets = devAssignments.length
              const assignedPoints = devAssignments.reduce((sum, a) => {
                const ticket = tickets?.find(t => parseInt(t.id) === a.ticket_id)
                return sum + (parseInt(ticket?.story_points) || 0)
              }, 0)
              
              return {
                ...dev,
                assignedTickets,
                assignedPoints
              }
            }
            return { ...dev, assignedTickets: 0, assignedPoints: 0 }
          })
          setDevelopers(developersWithStats)
        }
        setLoading(false)
      })
      .catch(error => {
        console.error('Error loading developers:', error)
        setLoading(false)
      })
  }, [assignments, tickets])

  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-80 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto">
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">👥 Developers</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close sidebar"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-500">Click a developer to view their assignments</p>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pnc-blue mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">Loading developers...</p>
            </div>
          ) : developers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No developers found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {developers.map((dev, idx) => (
                <button
                  key={idx}
                  onClick={() => onSelectDeveloper(dev)}
                  className="w-full text-left p-4 rounded-lg border border-gray-200 hover:border-pnc-blue hover:bg-blue-50 transition-all duration-200 group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-800 group-hover:text-pnc-blue">
                      {dev.name}
                    </h3>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {dev.assignedTickets || 0} tickets
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 text-xs text-gray-600">
                    <span>📊 {dev.availability_pct || (parseFloat(dev.availability || 0) * 100).toFixed(1)}% available</span>
                    <span>⚡ {parseFloat(dev.capacity || 0).toFixed(1)} capacity</span>
                  </div>
                  {dev.assignedPoints > 0 && (
                    <div className="mt-2 text-xs text-gray-500">
                      {dev.assignedPoints} story points assigned
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default Sidebar

