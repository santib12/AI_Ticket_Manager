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

export default api

