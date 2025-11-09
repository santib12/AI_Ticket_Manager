import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

function DeveloperDetail({ developer, assignments, tickets, rejectedTickets = [], onBack }) {
  if (!developer) return null

  // Get assigned tickets for this developer
  const assignedTickets = assignments?.assignments?.filter(
    a => a.assigned_to === developer.name
  ) || []

  // Merge with ticket data
  const assignedTicketData = assignedTickets.map(assignment => {
    const ticket = tickets?.find(t => parseInt(t.id) === assignment.ticket_id)
    return {
      ...ticket,
      ...assignment,
      ticket_id: assignment.ticket_id
    }
  }).filter(Boolean)

  // Calculate statistics
  const totalAssigned = assignedTicketData.length
  const totalStoryPoints = assignedTicketData.reduce((sum, t) => sum + (parseInt(t.story_points) || 0), 0)
  const avgStoryPoints = totalAssigned > 0 ? (totalStoryPoints / totalAssigned).toFixed(1) : 0

  // Skill breakdown
  const skillBreakdown = assignedTicketData.reduce((acc, ticket) => {
    const skill = ticket.required_skill || 'Unknown'
    acc[skill] = (acc[skill] || 0) + 1
    return acc
  }, {})

  const skillData = Object.entries(skillBreakdown).map(([skill, count]) => ({
    skill,
    count
  }))

  // Priority breakdown
  const priorityBreakdown = assignedTicketData.reduce((acc, ticket) => {
    const priority = ticket.priority || 'Not Set'
    acc[priority] = (acc[priority] || 0) + 1
    return acc
  }, {})

  const priorityData = Object.entries(priorityBreakdown).map(([priority, count]) => ({
    priority,
    count
  }))

  const mutedColors = ['#94a3b8', '#64748b', '#475569', '#334155', '#1e293b', '#cbd5e1', '#f1f5f9']

  const downloadCSV = () => {
    const headers = ['id', 'title', 'description', 'story_points', 'required_skill', 'priority', 'assigned_to', 'reason']
    const csvContent = [
      headers.join(','),
      ...assignedTicketData.map(row => 
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
    a.download = `${developer.name.replace(/\s+/g, '_')}_assignments_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">{developer.name}</h1>
              <p className="text-gray-600 mt-1">Developer Assignment Details</p>
            </div>
          </div>
          {totalAssigned > 0 && (
            <button
              onClick={downloadCSV}
              className="btn-secondary flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Download CSV</span>
            </button>
          )}
        </div>

        {/* Developer Info */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Availability</div>
            <div className="text-2xl font-bold text-slate-700">
              {developer.availability_pct || (parseFloat(developer.availability || 0) * 100).toFixed(1)}%
            </div>
          </div>
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Current Workload</div>
            <div className="text-2xl font-bold text-slate-700">{developer.current_workload} pts</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Capacity Score</div>
            <div className="text-2xl font-bold text-slate-700">
              {parseFloat(developer.capacity || 0).toFixed(2)}
            </div>
          </div>
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Experience</div>
            <div className="text-2xl font-bold text-slate-700">{developer.experience_years} years</div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm font-semibold text-blue-800 mb-1">Skills</div>
          <div className="text-blue-700">{developer.skills}</div>
        </div>
      </div>

      {/* Assignment Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card bg-gradient-to-br from-slate-400 to-slate-500 text-white">
          <div className="text-3xl font-bold">{totalAssigned}</div>
          <div className="text-slate-100 mt-1">Assigned Tickets</div>
        </div>
        <div className="card bg-gradient-to-br from-slate-500 to-slate-600 text-white">
          <div className="text-3xl font-bold">{totalStoryPoints}</div>
          <div className="text-slate-100 mt-1">Total Story Points</div>
        </div>
        <div className="card bg-gradient-to-br from-slate-400 to-slate-500 text-white">
          <div className="text-3xl font-bold">{avgStoryPoints}</div>
          <div className="text-slate-100 mt-1">Avg Points/Ticket</div>
        </div>
      </div>

      {/* Charts */}
      {totalAssigned > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {skillData.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Skills Distribution</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={skillData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="skill" angle={-45} textAnchor="end" height={80} stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {skillData.map((entry, index) => {
                      // Excel-like professional colors
                      const colors = ['#4472C4', '#70AD47', '#FFC000', '#ED7D31', '#5B9BD5', '#A5A5A5', '#7030A0', '#C55A11']
                      return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {priorityData.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Priority Distribution</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={priorityData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ priority, percent }) => `${priority}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {priorityData.map((entry, index) => {
                      // Excel-like professional colors by priority
                      const priorityColors = {
                        'High': '#C55A11',      // Dark orange/red
                        'Medium': '#FFC000',    // Yellow/amber
                        'Low': '#70AD47',       // Green
                        'Not Set': '#A5A5A5'    // Gray
                      }
                      const color = priorityColors[entry.priority] || '#4472C4'
                      return <Cell key={`cell-${index}`} fill={color} />
                    })}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Assigned Tickets List */}
      <div className="card">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          📋 Assigned Tickets ({totalAssigned})
        </h2>
        
        {totalAssigned === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">No tickets assigned to {developer.name} yet</p>
            <p className="text-sm mt-2">Assignments will appear here after approval</p>
          </div>
        ) : (
          <div className="space-y-3">
            {assignedTicketData.map((ticket, idx) => (
              <div
                key={idx}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="font-bold text-lg text-gray-800">#{ticket.id}</span>
                      {ticket.title && (
                        <span className="text-gray-700 font-medium">{ticket.title}</span>
                      )}
                      <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">
                        {ticket.required_skill}
                      </span>
                      {ticket.priority && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          ticket.priority === 'High' ? 'bg-red-100 text-red-700' :
                          ticket.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {ticket.priority}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm mb-2">{ticket.description}</p>
                    <div className="flex items-center space-x-4 text-sm">
                      {ticket.story_points && (
                        <span className="text-gray-500">{ticket.story_points} story points</span>
                      )}
                    </div>
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>🤔 AI Reasoning:</strong> {ticket.reason}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rejected Tickets Section */}
      <div className="card bg-red-50 border-red-200">
        <h2 className="text-xl font-bold text-red-800 mb-4">
          ✗ Rejected Tickets ({rejectedTickets.length})
        </h2>
        {rejectedTickets.length === 0 ? (
          <div className="text-center py-8 text-red-600">
            <p>No tickets were rejected for {developer.name}</p>
            <p className="text-sm mt-2">All suggested assignments were approved</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rejectedTickets.map((ticket, idx) => (
              <div
                key={idx}
                className="bg-white border border-red-200 rounded-lg p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="font-bold text-lg text-gray-800">#{ticket.id || ticket.ticket_id}</span>
                      {ticket.title && (
                        <span className="text-gray-700 font-medium">{ticket.title}</span>
                      )}
                      <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">
                        {ticket.required_skill}
                      </span>
                      {ticket.priority && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          ticket.priority === 'High' ? 'bg-red-100 text-red-700' :
                          ticket.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {ticket.priority}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm mb-2">{ticket.description}</p>
                    {ticket.reason && (
                      <div className="mt-2 p-3 bg-red-100 border border-red-300 rounded-lg">
                        <p className="text-sm text-red-800">
                          <strong>Original AI Suggestion:</strong> {ticket.reason}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default DeveloperDetail

