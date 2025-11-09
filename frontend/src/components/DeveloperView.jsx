import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import LoadingSpinner from './LoadingSpinner'

function DeveloperView() {
  const [developers, setDevelopers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load developer data from API
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
    fetch(`${API_URL}/developers/`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to fetch developers')
        }
        return response.json()
      })
      .then(data => {
        if (data.status === 'success' && data.developers) {
          setDevelopers(data.developers)
        } else {
          throw new Error('Invalid response format')
        }
        setLoading(false)
      })
      .catch(error => {
        console.error('Error loading developers:', error)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="card fade-in">
        <LoadingSpinner 
          message="Loading developer data..." 
          size="lg"
        />
      </div>
    )
  }

  if (developers.length === 0) {
    return (
      <div className="card">
        <p className="text-pnc-blue">No developer data available. Make sure developers.csv exists in backend/data/</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-2xl font-bold text-pnc-blue mb-4">👥 Developer Information</h2>
        <p className="text-pnc-blue mb-6">
          Developer data is loaded from the backend API endpoint
        </p>

        {/* Developers Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Availability</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Workload</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Capacity</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Skills</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Experience</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {developers.map((dev, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-pnc-blue">{dev.name}</td>
                  <td className="px-4 py-3 text-sm text-pnc-blue">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${parseFloat(dev.availability_pct || 0)}%` }}
                        ></div>
                      </div>
                      <span>{parseFloat(dev.availability_pct || 0).toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-pnc-blue">{dev.current_workload} pts</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="px-2 py-1 bg-blue-100 text-pnc-blue rounded-full text-xs font-medium">
                      {parseFloat(dev.capacity || 0).toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-pnc-blue max-w-md">{dev.skills}</td>
                  <td className="px-4 py-3 text-sm text-pnc-blue">{dev.experience_years} years</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-pnc-blue mb-4">📊 Developer Availability</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={developers}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="availability_pct" 
                name="Availability %"
                stroke="#4472C4" 
                strokeWidth={3}
                dot={{ fill: '#4472C4', r: 5 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-pnc-blue mb-4">⚡ Developer Capacity Score</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={developers}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="capacity" 
                stroke="#4472C4" 
                strokeWidth={3}
                dot={{ fill: '#4472C4', r: 5 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

export default DeveloperView

