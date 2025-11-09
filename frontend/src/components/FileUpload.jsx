import { useState } from 'react'
import Papa from 'papaparse'

function FileUpload({ onFileUpload, onAssign, loading, hidePreview = false }) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState(null)

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (!selectedFile) return

    if (!selectedFile.name.endsWith('.csv')) {
      setError('Please upload a CSV file')
      return
    }

    setFile(selectedFile)
    setError(null)

    // Parse CSV for preview
    Papa.parse(selectedFile, {
      header: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setError('Error parsing CSV: ' + results.errors[0].message)
          return
        }

        // Validate required columns
        const requiredColumns = ['id', 'description', 'story_points', 'required_skill']
        const missingColumns = requiredColumns.filter(
          col => !results.meta.fields.includes(col)
        )

        if (missingColumns.length > 0) {
          setError(`Missing required columns: ${missingColumns.join(', ')}`)
          return
        }

        setPreview(results.data)
        if (onFileUpload) {
          onFileUpload(results.data)
        }
      },
      error: (error) => {
        setError('Error reading file: ' + error.message)
      },
    })
  }

  const handleAssign = () => {
    if (file && onAssign) {
      onAssign(file)
    }
  }

  if (hidePreview) {
    return (
      <div>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
          id="file-upload-input"
          disabled={loading}
        />
        <label
          htmlFor="file-upload-input"
          className="btn-primary inline-block cursor-pointer text-center"
        >
          {file ? 'Change File' : 'Choose CSV File'}
        </label>
        {file && (
          <button
            onClick={handleAssign}
            disabled={loading}
            className="btn-primary ml-4"
          >
            {loading ? '🔄 Processing...' : '🚀 Assign Tickets with AI'}
          </button>
        )}
        {error && (
          <p className="mt-2 text-red-600 text-sm">{error}</p>
        )}
      </div>
    )
  }

  return (
    <div className="card">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">📁 Upload Ticket CSV File</h2>
      
      <div className="mb-6">
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
          id="file-upload"
          disabled={loading}
        />
        <label
          htmlFor="file-upload"
          className="btn-primary inline-block cursor-pointer text-center"
        >
          {file ? 'Change File' : 'Choose CSV File'}
        </label>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {preview && preview.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">File Preview</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {Object.keys(preview[0]).map((key) => (
                    <th
                      key={key}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {preview.slice(0, 5).map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    {Object.values(row).map((value, i) => (
                      <td key={i} className="px-4 py-3 text-sm text-gray-700">
                        {String(value).substring(0, 50)}
                        {String(value).length > 50 ? '...' : ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.length > 5 && (
              <p className="mt-2 text-sm text-gray-500 text-center">
                Showing 5 of {preview.length} rows
              </p>
            )}
          </div>
        </div>
      )}

      {file && preview && !error && (
        <div className="mt-6">
          <button
            onClick={handleAssign}
            disabled={loading}
            className="btn-primary w-full text-lg py-3"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing tickets with AI...
              </span>
            ) : (
              '🚀 Assign Tickets with AI'
            )}
          </button>
        </div>
      )}

      {!file && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-800 mb-2">📝 Expected CSV Format</h4>
          <p className="text-sm text-blue-700 mb-2">Your CSV file must include these columns:</p>
          <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
            <li><strong>id</strong>: Unique ticket identifier (integer)</li>
            <li><strong>description</strong>: Ticket description (text)</li>
            <li><strong>story_points</strong>: Story points estimate (integer)</li>
            <li><strong>required_skill</strong>: Required skill for this ticket (text)</li>
          </ul>
        </div>
      )}
    </div>
  )
}

export default FileUpload

