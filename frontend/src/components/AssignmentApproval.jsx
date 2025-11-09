import { useState } from 'react'
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

function AssignmentApproval({ assignments, tickets, onApproveSelected }) {
  const [approvedTickets, setApprovedTickets] = useState(new Set())
  const [rejectedTickets, setRejectedTickets] = useState(new Set())
  const [showRejected, setShowRejected] = useState(false)

  const assignmentsData = assignments.assignments || []
  const totalTickets = assignments.total_tickets || 0

  // Only include tickets that were actually assigned (filtered tickets)
  // Get the list of assigned ticket IDs - this should already be limited by the filter
  const assignedTicketIds = new Set(assignmentsData.map(a => a.ticket_id))
  
  // Merge tickets with assignments - ONLY include assigned tickets (respects filter limit)
  // The assignmentsData array already contains only the filtered/limited tickets
  const mergedData = assignmentsData.map(assignment => {
    const ticket = tickets.find(t => parseInt(t.id) === assignment.ticket_id)
    if (!ticket) return null
    return {
      ...ticket,
      assigned_to: assignment.assigned_to,
      reason: assignment.reason || 'No assignment',
      ticket_id: assignment.ticket_id,
    }
  }).filter(Boolean) // Remove any null entries

  const handleApprove = (ticketId) => {
    setApprovedTickets(prev => new Set([...prev, ticketId]))
    setRejectedTickets(prev => {
      const newSet = new Set(prev)
      newSet.delete(ticketId)
      return newSet
    })
  }

  const handleReject = (ticketId) => {
    setRejectedTickets(prev => new Set([...prev, ticketId]))
    setApprovedTickets(prev => {
      const newSet = new Set(prev)
      newSet.delete(ticketId)
      return newSet
    })
  }

  const handleApproveAll = () => {
    const allTicketIds = mergedData.map(t => t.ticket_id)
    setApprovedTickets(new Set(allTicketIds))
    setRejectedTickets(new Set())
  }

  const handleFinalizeApproved = () => {
    console.log('Finalize button clicked!')
    console.log('Approved tickets:', approvedTickets)
    console.log('Rejected tickets:', rejectedTickets)
    const approved = mergedData.filter(t => approvedTickets.has(t.ticket_id))
    const rejected = mergedData.filter(t => rejectedTickets.has(t.ticket_id))
    console.log('Approved data:', approved)
    console.log('Rejected data:', rejected)
    if (onApproveSelected) {
      onApproveSelected(approved, rejected)
    } else {
      console.error('onApproveSelected is not defined!')
    }
  }

  const approvedCount = approvedTickets.size
  const rejectedCount = rejectedTickets.size
  const pendingCount = totalTickets - approvedCount - rejectedCount

  // Filter data
  const pendingTickets = mergedData.filter(t => !approvedTickets.has(t.ticket_id) && !rejectedTickets.has(t.ticket_id))
  const approvedTicketsList = mergedData.filter(t => approvedTickets.has(t.ticket_id))
  const rejectedTicketsList = mergedData.filter(t => rejectedTickets.has(t.ticket_id))

  // Developer workload statistics for approved tickets
  const developerStats = approvedTicketsList.reduce((acc, item) => {
    const dev = item.assigned_to
    if (!acc[dev]) {
      acc[dev] = { name: dev, tickets: 0, storyPoints: 0 }
    }
    acc[dev].tickets += 1
    if (item.story_points) {
      acc[dev].storyPoints += parseInt(item.story_points) || 0
    }
    return acc
  }, {})

  const developerData = Object.values(developerStats)
  const uniqueDevelopers = developerData.length

  const totalPoints = approvedTicketsList.reduce((sum, t) => sum + (parseInt(t.story_points) || 0), 0)
  const avgWorkload = uniqueDevelopers > 0 ? (totalPoints / uniqueDevelopers).toFixed(1) : 0

  const mutedColors = ['#94a3b8', '#64748b', '#475569', '#334155', '#1e293b', '#cbd5e1', '#f1f5f9']

  return (
    <div className="space-y-6">
      {/* Approval Status Banner */}
      <div className="card bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div>
              <div className="text-2xl font-bold text-pnc-blue">{approvedCount}</div>
              <div className="text-sm text-pnc-blue">Approved</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-pnc-blue">{pendingCount}</div>
              <div className="text-sm text-pnc-blue">Pending</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-pnc-blue">{rejectedCount}</div>
              <div className="text-sm text-pnc-blue">Rejected</div>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleApproveAll}
              className="btn-secondary text-sm"
              disabled={approvedCount === totalTickets}
            >
              ✓ Approve All
            </button>
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                console.log('Button clicked, approvedCount:', approvedCount)
                if (approvedCount > 0) {
                  handleFinalizeApproved()
                }
              }}
              className={`btn-primary text-sm relative z-10 ${
                approvedCount === 0 
                  ? 'cursor-not-allowed' 
                  : 'cursor-pointer'
              }`}
              disabled={approvedCount === 0}
            >
              Finalize {approvedCount} Approved
            </button>
          </div>
        </div>
      </div>

      {/* Pending Approvals */}
      <div className="card fade-in">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-pnc-blue">📋 Pending Approvals</h2>
            <p className="text-pnc-blue text-sm mt-1 opacity-70">
              Review and approve each AI-suggested assignment ({pendingTickets.length} remaining)
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {pendingTickets.map((item, idx) => (
            <div
              key={idx}
              className="border-2 border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-all duration-200 slide-in"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="font-bold text-lg text-pnc-blue">#{item.id}</span>
                    {item.title && (
                      <span className="text-pnc-blue font-medium">{item.title}</span>
                    )}
                    <span className="px-2 py-1 bg-blue-100 text-pnc-blue rounded-full text-xs font-medium">
                      {item.required_skill}
                    </span>
                    {item.priority && (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        item.priority === 'High' ? 'bg-red-100 text-red-700' :
                        item.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {item.priority}
                      </span>
                    )}
                  </div>
                  <p className="text-pnc-blue text-sm mb-2">{item.description}</p>
                  <div className="flex items-center space-x-4 text-sm">
                    <span className="text-pnc-blue opacity-70">AI Suggests:</span>
                    <span className="font-semibold text-pnc-blue">{item.assigned_to}</span>
                    {item.story_points && (
                      <>
                        <span className="text-pnc-blue opacity-70">•</span>
                        <span className="text-pnc-blue opacity-70">{item.story_points} story points</span>
                      </>
                    )}
                  </div>
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>🤔 AI Reasoning:</strong> {item.reason}
                    </p>
                  </div>
                </div>
                <div className="ml-4 flex flex-col space-y-2">
                  <button
                    onClick={() => handleApprove(item.ticket_id)}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    ✓ Approve
                  </button>
                  <button
                    onClick={() => handleReject(item.ticket_id)}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    ✗ Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Approved Tickets Preview */}
      {approvedTicketsList.length > 0 && (
        <div className="card fade-in">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-pnc-blue">✓ Approved Assignments ({approvedCount})</h2>
            <button
              onClick={() => setShowRejected(!showRejected)}
              className="text-sm text-pnc-blue hover:text-pnc-blue-dark"
            >
              {showRejected ? 'Hide' : 'Show'} Rejected ({rejectedCount})
            </button>
          </div>

          {/* Summary Metrics for Approved */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="rounded-lg p-3 border border-blue-200" style={{ backgroundColor: '#E6F2F8' }}>
              <div className="text-2xl font-bold" style={{ color: '#003087' }}>{approvedCount}</div>
              <div className="text-sm" style={{ color: '#003087' }}>Approved Tickets</div>
            </div>
            <div className="rounded-lg p-3 border border-blue-200" style={{ backgroundColor: '#E6F2F8' }}>
              <div className="text-2xl font-bold" style={{ color: '#003087' }}>{uniqueDevelopers}</div>
              <div className="text-sm" style={{ color: '#003087' }}>Developers</div>
            </div>
            <div className="rounded-lg p-3 border border-blue-200" style={{ backgroundColor: '#E6F2F8' }}>
              <div className="text-2xl font-bold" style={{ color: '#003087' }}>{avgWorkload}</div>
              <div className="text-sm" style={{ color: '#003087' }}>Avg Workload</div>
            </div>
            <div className="rounded-lg p-3 border border-blue-200" style={{ backgroundColor: '#E6F2F8' }}>
              <div className="text-2xl font-bold" style={{ color: '#003087' }}>{totalPoints}</div>
              <div className="text-sm" style={{ color: '#003087' }}>Total Points</div>
            </div>
          </div>

          {/* Developer Workload Charts */}
          {developerData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-lg font-semibold text-pnc-blue mb-4">Tickets per Developer</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={developerData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="tickets" 
                      stroke="#4472C4" 
                      strokeWidth={3}
                      dot={{ fill: '#4472C4', r: 5 }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-pnc-blue mb-4">Story Points per Developer</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={developerData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="storyPoints" 
                      stroke="#4472C4" 
                      strokeWidth={3}
                      dot={{ fill: '#4472C4', r: 5 }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Rejected Tickets (if shown) */}
          {showRejected && rejectedTicketsList.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-pnc-blue mb-4">✗ Rejected Assignments ({rejectedCount})</h3>
              <div className="space-y-2">
                {rejectedTicketsList.map((item, idx) => (
                  <div key={idx} className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-pnc-blue">#{item.id}</span>
                        {item.title && <span className="ml-2 text-pnc-blue">{item.title}</span>}
                        <span className="ml-2 text-sm text-pnc-blue opacity-70">→ {item.assigned_to}</span>
                      </div>
                      <button
                        onClick={() => handleApprove(item.ticket_id)}
                        className="text-sm text-green-600 hover:text-green-800 underline"
                      >
                        Undo Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default AssignmentApproval

