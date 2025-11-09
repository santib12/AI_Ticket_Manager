# AI Ticket Orchestrator - React Frontend

Modern React frontend for the AI Ticket Orchestrator application.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file (optional):
```env
VITE_API_URL=http://localhost:8000
```

3. Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── Header.jsx
│   │   ├── FileUpload.jsx
│   │   ├── TicketPreview.jsx
│   │   ├── AssignmentResults.jsx
│   │   └── DeveloperView.jsx
│   ├── services/
│   │   └── api.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── index.html
├── package.json
├── vite.config.js
└── tailwind.config.js
```

## 🎨 Features

- **Modern UI**: Built with Tailwind CSS
- **Interactive Charts**: Using Recharts for data visualization
- **File Upload**: CSV file upload with validation
- **Real-time Updates**: Live assignment results
- **Responsive Design**: Works on all screen sizes

## 🔧 Technologies

- React 18
- Vite
- Tailwind CSS
- Recharts
- Axios
- PapaParse (CSV parsing)
