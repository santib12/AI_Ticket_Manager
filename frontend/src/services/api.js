import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_URL,
  timeout: 300000, // 5 minutes for large ticket assignments
})

export const assignTickets = async (file) => {
  const formData = new FormData()
  formData.append('file', file)

  try {
    const response = await api.post('/assign-tickets/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.detail || 'Server error occurred')
    } else if (error.request) {
      throw new Error('Could not connect to the API. Make sure the backend server is running.')
    } else {
      throw new Error(error.message || 'An unexpected error occurred')
    }
  }
}

export const getTickets = async () => {
  try {
    const response = await api.get('/tickets/')
    return response.data
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.detail || 'Server error occurred')
    } else if (error.request) {
      throw new Error('Could not connect to the API. Make sure the backend server is running.')
    } else {
      throw new Error(error.message || 'An unexpected error occurred')
    }
  }
}

export const getDevelopers = async () => {
  try {
    const response = await api.get('/developers/')
    return response.data
  } catch (error) {
    console.error('Error fetching developers:', error)
    return null
  }
}

// Database assignment endpoints
export const saveAssignments = async (assignments) => {
  try {
    const response = await api.post('/assignments/save/', {
      assignments: assignments
    })
    return response.data
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.detail || 'Server error occurred')
    } else if (error.request) {
      throw new Error('Could not connect to the API. Make sure the backend server is running.')
    } else {
      throw new Error(error.message || 'An unexpected error occurred')
    }
  }
}

export const getAssignments = async (status = 'active', developerName = null, ticketId = null) => {
  try {
    const params = { status }
    if (developerName) params.developer_name = developerName
    if (ticketId) params.ticket_id = ticketId
    
    const response = await api.get('/assignments/', { params })
    return response.data
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.detail || 'Server error occurred')
    } else if (error.request) {
      throw new Error('Could not connect to the API. Make sure the backend server is running.')
    } else {
      throw new Error(error.message || 'An unexpected error occurred')
    }
  }
}

export const reassignTicket = async (assignmentId, newDeveloper, reason = null) => {
  try {
    const params = { new_developer: newDeveloper }
    if (reason) params.reason = reason
    
    const response = await api.put(`/assignments/${assignmentId}/reassign/`, null, { params })
    return response.data
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.detail || 'Server error occurred')
    } else if (error.request) {
      throw new Error('Could not connect to the API. Make sure the backend server is running.')
    } else {
      throw new Error(error.message || 'An unexpected error occurred')
    }
  }
}

export const removeAssignment = async (assignmentId, reason = null) => {
  try {
    const params = {}
    if (reason) params.reason = reason
    
    const response = await api.delete(`/assignments/${assignmentId}/`, { params })
    return response.data
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.detail || 'Server error occurred')
    } else if (error.request) {
      throw new Error('Could not connect to the API. Make sure the backend server is running.')
    } else {
      throw new Error(error.message || 'An unexpected error occurred')
    }
  }
}

export const getAssignmentHistory = async (assignmentId) => {
  try {
    const response = await api.get(`/assignments/${assignmentId}/history/`)
    return response.data
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.detail || 'Server error occurred')
    } else if (error.request) {
      throw new Error('Could not connect to the API. Make sure the backend server is running.')
    } else {
      throw new Error(error.message || 'An unexpected error occurred')
    }
  }
}

export const resetAllAssignments = async (reason = null) => {
  try {
    const requestBody = {}
    if (reason) {
      requestBody.reason = reason
    }
    const response = await api.post('/assignments/reset-all', requestBody)
    return response.data
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.detail || 'Server error occurred')
    } else if (error.request) {
      throw new Error('Could not connect to the API. Make sure the backend server is running.')
    } else {
      throw new Error(error.message || 'An unexpected error occurred')
    }
  }
}

export default api

