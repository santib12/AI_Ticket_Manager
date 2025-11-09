import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

function TicketPreview({ tickets }) {
  const totalTickets = tickets.length
  const totalPoints = tickets.reduce((sum, ticket) => {
    const points = parseInt(ticket.story_points) || 0
    return sum + points
  }, 0)
  
  const uniqueSkills = new Set(tickets.map(t => t.required_skill).filter(Boolean)).size

  // Skill distribution
  const skillCounts = tickets.reduce((acc, ticket) => {
    const skill = ticket.required_skill || 'Unknown'
    acc[skill] = (acc[skill] || 0) + 1
    return acc
  }, {})

  const skillData = Object.entries(skillCounts).map(([skill, count]) => ({
    skill,
    count,
  }))

  return (
    <div className="space-y-6">
      {/* Incoming Tickets Chart */}
      {skillData.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-pnc-blue mb-4">📥 Incoming Tickets</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={skillData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="skill" angle={-45} textAnchor="end" height={100} stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#f9fafb', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {skillData.map((entry, index) => {
                  // Excel-like professional colors
                  const colors = ['#4472C4', '#70AD47', '#FFC000', '#ED7D31', '#5B9BD5', '#A5A5A5', '#7030A0', '#C55A11', '#70AD47', '#FFC000']
                  return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tickets Table */}
      <div className="card">
        <h3 className="text-lg font-semibold text-pnc-blue mb-4">📋 Tickets Preview</h3>
        <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: '600px' }}>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                {tickets[0]?.title && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                )}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Story Points</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Skill</th>
                {tickets[0]?.priority && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tickets.map((ticket, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-pnc-blue">{ticket.id}</td>
                  {ticket.title && (
                    <td className="px-4 py-3 text-sm text-pnc-blue">{ticket.title}</td>
                  )}
                  <td className="px-4 py-3 text-sm text-pnc-blue max-w-md truncate">
                    {ticket.description}
                  </td>
                  <td className="px-4 py-3 text-sm text-pnc-blue">{ticket.story_points}</td>
                  <td className="px-4 py-3 text-sm">
                    {(() => {
                      // Excel-like professional colors for skills
                      const skillColors = {
                        'Python': { bg: '#E7F3FF', text: '#4472C4' },
                        'JavaScript': { bg: '#E2EFDA', text: '#70AD47' },
                        'React': { bg: '#FFF2CC', text: '#FFC000' },
                        'Java': { bg: '#FCE4D6', text: '#ED7D31' },
                        'SQL': { bg: '#D9E1F2', text: '#5B9BD5' },
                        'HTML/CSS': { bg: '#E2E2E2', text: '#A5A5A5' },
                        'Docker': { bg: '#DEEBF7', text: '#4472C4' },
                        'TypeScript': { bg: '#E2EFDA', text: '#70AD47' },
                        'Node.js': { bg: '#FFF2CC', text: '#FFC000' },
                        'Flask': { bg: '#FCE4D6', text: '#ED7D31' },
                        'Django': { bg: '#D9E1F2', text: '#5B9BD5' },
                        'FastAPI': { bg: '#E7F3FF', text: '#4472C4' },
                        'AWS': { bg: '#E2EFDA', text: '#70AD47' },
                        'Kubernetes': { bg: '#FFF2CC', text: '#FFC000' },
                        'Machine Learning': { bg: '#FCE4D6', text: '#ED7D31' },
                        'Data Science': { bg: '#D9E1F2', text: '#5B9BD5' },
                        'Microservices': { bg: '#E2E2E2', text: '#A5A5A5' },
                        'REST APIs': { bg: '#DEEBF7', text: '#4472C4' }
                      }
                      const skill = ticket.required_skill || 'Unknown'
                      const color = skillColors[skill] || { bg: '#F2F2F2', text: '#595959' }
                      return (
                        <span 
                          className="px-2 py-1 rounded-full text-xs font-medium"
                          style={{ backgroundColor: color.bg, color: color.text }}
                        >
                          {skill}
                        </span>
                      )
                    })()}
                  </td>
                  {ticket.priority && (
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        ticket.priority === 'High' ? 'bg-red-100 text-red-700' :
                        ticket.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {ticket.priority}
                      </span>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default TicketPreview

