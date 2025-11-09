import { useState } from 'react'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

function AssignmentResults({ assignments, tickets, onReset }) {
  const [expandedTicket, setExpandedTicket] = useState(null)

  const assignmentsData = assignments.assignments || []
  const totalTickets = assignments.total_tickets || 0

  // Only show approved tickets - filter to only include tickets that have assignments
  const assignedTicketIds = new Set(assignmentsData.map(a => a.ticket_id))
  
  // Merge tickets with assignments - ONLY include approved/assigned tickets
  const mergedData = assignmentsData.map(assignment => {
    const ticket = tickets.find(t => parseInt(t.id) === assignment.ticket_id)
    if (!ticket) return null
    return {
      ...ticket,
      assigned_to: assignment.assigned_to,
      reason: assignment.reason || 'No assignment',
    }
  }).filter(Boolean) // Remove any null entries

  // Developer workload statistics
  const developerStats = assignmentsData.reduce((acc, assignment) => {
    const dev = assignment.assigned_to
    if (!acc[dev]) {
      acc[dev] = { name: dev, tickets: 0, storyPoints: 0 }
    }
    acc[dev].tickets += 1
    
    const ticket = tickets.find(t => parseInt(t.id) === assignment.ticket_id)
    if (ticket && ticket.story_points) {
      acc[dev].storyPoints += parseInt(ticket.story_points) || 0
    }
    return acc
  }, {})

  const developerData = Object.values(developerStats)
  const uniqueDevelopers = developerData.length

  const totalPoints = tickets.reduce((sum, t) => sum + (parseInt(t.story_points) || 0), 0)
  const avgWorkload = uniqueDevelopers > 0 ? (totalPoints / uniqueDevelopers).toFixed(1) : 0

  // Skill assignment analysis
  const skillAssignmentData = mergedData.reduce((acc, item) => {
    const skill = item.required_skill || 'Unknown'
    const dev = item.assigned_to
    const key = `${skill}-${dev}`
    if (!acc[key]) {
      acc[key] = { skill, developer: dev, count: 0 }
    }
    acc[key].count += 1
    return acc
  }, {})

  const skillAssignmentArray = Object.values(skillAssignmentData)

  const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b', '#fa709a', '#fee140', '#30cfd0']

  const downloadCSV = () => {
    const headers = ['id', 'assigned_to', 'reason', 'description', 'story_points', 'required_skill']
    const csvContent = [
      headers.join(','),
      ...mergedData.map(row => 
        headers.map(header => {
          const value = row[header] || ''
          return `"${String(value).replace(/"/g, '""')}"`
        }).join(',')
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ticket_assignments_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div id="assignment-results" className="space-y-6">
      {/* Success Message */}
      <div className="card bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-green-500 rounded-full p-3">
              <span className="text-3xl">✅</span>
            </div>
            <div>
              <h3 className="font-semibold text-green-800 text-lg">Successfully assigned {totalTickets} tickets!</h3>
              <p className="text-green-600 text-sm mt-1">AI has analyzed and assigned all tickets to developers with transparent reasoning</p>
            </div>
          </div>
          <button onClick={onReset} className="btn-secondary text-sm">
            🔄 Reset
          </button>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 fade-in">
        <div className="rounded-lg p-6 border border-blue-200 transform hover:scale-105 transition-transform duration-200 shadow-lg" style={{ backgroundColor: '#E6F2F8' }}>
          <div className="text-4xl font-bold" style={{ color: '#003087' }}>{totalTickets}</div>
          <div className="mt-2 font-medium" style={{ color: '#003087' }}>Total Tickets</div>
        </div>
        <div className="rounded-lg p-6 border border-blue-200 transform hover:scale-105 transition-transform duration-200 shadow-lg" style={{ backgroundColor: '#E6F2F8' }}>
          <div className="text-4xl font-bold" style={{ color: '#003087' }}>{uniqueDevelopers}</div>
          <div className="mt-2 font-medium" style={{ color: '#003087' }}>Developers Assigned</div>
        </div>
        <div className="rounded-lg p-6 border border-blue-200 transform hover:scale-105 transition-transform duration-200 shadow-lg" style={{ backgroundColor: '#E6F2F8' }}>
          <div className="text-4xl font-bold" style={{ color: '#003087' }}>{avgWorkload}</div>
          <div className="mt-2 font-medium" style={{ color: '#003087' }}>Avg Workload (pts)</div>
        </div>
        <div className="rounded-lg p-6 border border-blue-200 transform hover:scale-105 transition-transform duration-200 shadow-lg" style={{ backgroundColor: '#E6F2F8' }}>
          <div className="text-4xl font-bold" style={{ color: '#003087' }}>{totalPoints}</div>
          <div className="mt-2 font-medium" style={{ color: '#003087' }}>Total Story Points</div>
        </div>
      </div>

      {/* Assignments List */}
      <div className="card fade-in">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-pnc-blue">📋 Assignment Results</h2>
            <p className="text-pnc-blue text-sm mt-1 opacity-70">Click on any ticket to view AI reasoning</p>
          </div>
          <button onClick={downloadCSV} className="btn-secondary text-sm">
            📥 Download CSV
          </button>
        </div>

        <div className="space-y-3">
          {mergedData.map((item, idx) => (
            <div
              key={idx}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200 hover:border-pnc-blue slide-in"
              style={{ animationDelay: `${idx * 0.05}s` }}
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
                    <span className="text-pnc-blue opacity-70">Assigned to:</span>
                    <span className="font-semibold text-pnc-blue">{item.assigned_to}</span>
                    {item.story_points && (
                      <>
                        <span className="text-pnc-blue opacity-70">•</span>
                        <span className="text-pnc-blue opacity-70">{item.story_points} story points</span>
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setExpandedTicket(expandedTicket === idx ? null : idx)}
                  className="ml-4 text-pnc-blue hover:text-pnc-blue-dark text-sm font-medium"
                >
                  {expandedTicket === idx ? 'Hide' : 'Show'} Reasoning
                </button>
              </div>
              {expandedTicket === idx && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>🤔 AI Reasoning:</strong> {item.reason}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Developer Workload - Tickets */}
        <div className="card">
          <h3 className="text-lg font-semibold text-pnc-blue mb-4">👥 Tickets per Developer</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={developerData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#f9fafb', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="tickets" radius={[4, 4, 0, 0]} fill="#4472C4" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Ticket Distribution Pie Chart */}
        <div className="card">
          <h3 className="text-lg font-semibold text-pnc-blue mb-4">🥧 Ticket Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={developerData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="tickets"
              >
                {developerData.map((entry, index) => {
                  // Excel-like professional colors
                  const colors = ['#4472C4', '#70AD47', '#FFC000', '#ED7D31', '#5B9BD5', '#A5A5A5', '#7030A0', '#C55A11', '#70AD47', '#FFC000']
                  return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                })}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

export default AssignmentResults

