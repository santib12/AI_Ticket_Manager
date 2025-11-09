# PM Ticket Manager

An AI-powered ticket assignment system that automatically matches development tickets to developers based on workload, skills, experience, job title, and availability. Built for Product Managers to streamline ticket assignment with transparent AI reasoning and full control.

## 🎯 Features

### Core Functionality
- **AI-Powered Assignment**: Uses OpenAI GPT-4o-mini to intelligently assign tickets to developers
- **Workload Balancing**: Automatically distributes tickets evenly across team members
- **Multi-Parameter Matching**: Considers skills, experience, job title, availability, and current workload
- **Transparent Reasoning**: Every assignment includes detailed AI explanation
- **Approval Workflow**: Review and approve/deny AI-suggested assignments before finalizing
- **Persistent Storage**: SQLite database for all assignments, developers, and tickets
- **Developer Profiles**: View assigned and rejected tickets per developer
- **Ticket Filtering**: Filter by story points, priority, and ticket count
- **Reassignment**: Manually reassign tickets to different developers
- **Reset Functionality**: Clear all assignments to start fresh

### UI Features
- **Modern React Interface**: Built with React, Vite, and Tailwind CSS
- **PNC Bank Branding**: Customized with PNC colors and logo
- **Interactive Charts**: Visualize ticket distribution, workload, and trends
- **Real-time Updates**: Dynamic updates as assignments are made
- **Responsive Design**: Works on desktop and tablet devices

## 🏗️ Architecture

### Backend (FastAPI)
- **Framework**: FastAPI with Python 3.8+
- **AI Engine**: OpenAI GPT-4o-mini for ticket assignment
- **Database**: SQLite (development) with SQLAlchemy ORM
- **API**: RESTful API with automatic OpenAPI documentation
- **Parallel Processing**: ThreadPoolExecutor for faster ticket assignments

### Frontend (React)
- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS for responsive design
- **Charts**: Recharts for data visualization
- **State Management**: React Hooks (useState, useEffect)
- **API Client**: Axios for backend communication

### Database Schema
- **Developers**: Name, title, experience, workload, availability, skills, capacity
- **Tickets**: Title, description, story points, required skill, priority, due date, status
- **Assignments**: Ticket ID, assigned developer, reason, assignment type, status
- **Assignment History**: Complete audit trail of all assignment changes

## 📋 Prerequisites

- Python 3.8 or higher
- Node.js 18+ and npm
- OpenAI API key
- Git (for cloning the repository)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd AI_Ticket_Manager
```

### 2. Set Up Environment Variables

Create a `.env` file in the root directory:

```env
OPENAI_API_KEY=sk-your-actual-api-key-here
DATABASE_URL=sqlite:///./backend/ticket_manager.db
```

### 3. Install Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 4. Initialize Database

```bash
cd backend
python init_db.py --load-data
```

This will:
- Create all database tables
- Load developers from `data/developers_roles.csv`
- Load tickets from `data/tickets_40.csv`

### 5. Start Backend Server

```bash
cd backend
python main.py
# OR
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at: **http://localhost:8000**

### 6. Install Frontend Dependencies

Open a **new terminal**:

```bash
cd frontend
npm install
```

### 7. Start Frontend

```bash
cd frontend
npm run dev
```

Frontend will be available at: **http://localhost:3000**

## 📖 Usage Guide

### Loading Tickets

1. Tickets are automatically loaded from the database on startup
2. View ticket preview with charts showing priority distribution and due date trends
3. See available ticket count and already assigned tickets

### Assigning Tickets

1. **Set Filters** (optional):
   - Number of tickets (5, 10, 15, 20+, or All)
   - Story points range (1-2, 3-4, 5-6, 7-8, or All)
   - Priority/Difficulty (High, Medium, Low, or All)

2. **Click "Assign Tickets"**:
   - AI processes tickets in parallel for speed
   - Each ticket is matched to the best developer
   - Processing time depends on ticket count

3. **Review Assignments**:
   - View all AI-suggested assignments
   - Read detailed reasoning for each assignment
   - Approve or deny individual tickets

4. **Finalize**:
   - Click "Finalize Approved" to save assignments
   - View assignment results with charts and metrics
   - All assignments are saved to the database

### Managing Assignments

- **View Developer Details**: Click "Developers" button → Select a developer
- **Reassign Tickets**: Use dropdown in developer profile to reassign
- **Remove Tickets**: Click "Remove" button to unassign a ticket
- **Reset All**: Click "Reset All Assignments" to clear all assignments

### Developer Profiles

- View all assigned tickets for a developer
- See rejected tickets
- View developer statistics (total tickets, story points, average)
- Reassign or remove tickets from developer profile

## 🔧 API Endpoints

### Ticket Management
- `GET /tickets/` - Get all tickets (from CSV or database)
- `POST /tickets/sync/` - Sync tickets from CSV to database

### Developer Management
- `GET /developers/` - Get all developers (from CSV or database)
- `POST /developers/sync/` - Sync developers from CSV to database
- `POST /developers/refresh-workloads/` - Refresh all developer workloads

### Assignment Management
- `POST /assign-tickets/` - AI-powered ticket assignment
- `POST /assignments/save/` - Save assignments to database
- `GET /assignments/` - Get assignments with filters
- `PUT /assignments/{id}/reassign/` - Reassign a ticket
- `DELETE /assignments/{id}/` - Remove an assignment
- `POST /assignments/reset-all/` - Reset all active assignments
- `GET /assignments/{id}/history/` - Get assignment history

### API Documentation
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 📁 Project Structure

```
AI_Ticket_Manager/
├── backend/
│   ├── ai_engine/
│   │   ├── assigner.py          # AI assignment logic
│   │   └── utils.py             # Helper functions
│   ├── data/
│   │   ├── developers_roles.csv   # Developer data
│   │   └── tickets_40.csv        # Ticket data
│   ├── models/
│   │   ├── database_models.py   # SQLAlchemy models
│   │   └── schemas.py            # Pydantic schemas
│   ├── database.py               # Database setup
│   ├── database_service.py       # Database operations
│   ├── init_db.py                # Database initialization
│   ├── main.py                   # FastAPI application
│   └── requirements.txt          # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AssignmentApproval.jsx
│   │   │   ├── AssignmentResults.jsx
│   │   │   ├── DeveloperDetail.jsx
│   │   │   ├── DeveloperView.jsx
│   │   │   ├── Header.jsx
│   │   │   ├── TicketPreview.jsx
│   │   │   └── ...
│   │   ├── services/
│   │   │   └── api.js            # API client
│   │   ├── App.jsx               # Main application
│   │   └── main.jsx              # Entry point
│   ├── public/
│   │   └── PNC_LOGO.png          # PNC logo
│   └── package.json              # Node dependencies
├── .env                          # Environment variables (create this)
└── README.md                     # This file
```

## 🧠 AI Assignment Logic

The AI assignment system uses GPT-4o-mini with the following considerations:

1. **Workload Balance**: Distributes tickets evenly across all developers
2. **Skill Matching**: Matches required skills with developer expertise
3. **Job Title Relevance**: Considers role alignment (e.g., Frontend Developer for frontend tickets)
4. **Capacity Analysis**: Ensures developers can handle the story points
5. **Experience**: Considers years of experience for complex tickets
6. **Availability**: Factors in developer availability percentage

### AI Prompt Structure

- **System Message**: Defines the AI's role and output format
- **User Prompt**: Includes developer info, ticket details, and current distribution
- **Response Format**: JSON with `assigned_to` and `reason` fields
- **Reasoning**: 1-2 sentence explanations with specific parameters

## 🗄️ Database Models

### Developer
- `id`: Primary key
- `name`: Unique developer name
- `title`: Job title (e.g., "Frontend Developer")
- `experience_years`: Years of experience
- `current_workload`: Current story points assigned
- `availability`: Availability percentage (0-1)
- `skills`: Comma-separated skills
- `capacity`: Calculated capacity based on availability and workload

### Ticket
- `id`: Primary key
- `title`: Ticket title
- `description`: Ticket description
- `story_points`: Story point estimate
- `required_skill`: Required skill for the ticket
- `priority`: Priority level (High, Medium, Low)
- `due_date`: Due date
- `status`: Ticket status (open, in-progress, closed)

### Assignment
- `id`: Primary key
- `ticket_id`: Foreign key to Ticket
- `assigned_to`: Foreign key to Developer name
- `reason`: AI reasoning for assignment
- `assigned_by`: Who assigned it (AI, User)
- `assignment_type`: Type (ai, manual, reassigned)
- `status`: Status (active, rejected, removed)
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp

### AssignmentHistory
- `id`: Primary key
- `assignment_id`: Foreign key to Assignment
- `ticket_id`: Ticket ID
- `previous_developer`: Previous developer name
- `new_developer`: New developer name
- `action`: Action type (created, reassigned, removed, rejected)
- `reason`: Reason for change
- `changed_by`: Who made the change
- `changed_at`: Timestamp of change

## 🔐 Environment Variables

```env
# Required
OPENAI_API_KEY=sk-your-api-key-here

# Optional
DATABASE_URL=sqlite:///./backend/ticket_manager.db
VITE_API_URL=http://localhost:8000
```

## 🛠️ Development

### Backend Development

```bash
cd backend
# Install dependencies
pip install -r requirements.txt

# Run with auto-reload
uvicorn main:app --reload

# Run tests (if available)
pytest
```

### Frontend Development

```bash
cd frontend
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## 📊 Data Files

### Developers CSV Format
```csv
name,title,experience_years,current_workload,availability,skills
Alice,Frontend Developer,5,10,0.85,"React, JavaScript, TypeScript"
```

### Tickets CSV Format
```csv
id,description,story_points,required_skill,priority,due_date
1,"Fix login bug",3,React,High,2024-12-31
```

## 🐛 Troubleshooting

### Backend Issues

**Port 8000 already in use:**
```bash
uvicorn main:app --reload --port 8001
```

**Module not found:**
```bash
pip install -r requirements.txt
```

**Database errors:**
```bash
# Reinitialize database
python init_db.py --load-data
```

**OpenAI API errors:**
- Check API key in `.env` file
- Verify API key is valid and has credits
- Check rate limits

### Frontend Issues

**Port 3000 already in use:**
- Vite will automatically use next available port

**Can't connect to backend:**
- Ensure backend is running on port 8000
- Check CORS settings in `main.py`
- Verify `VITE_API_URL` in environment

**Build errors:**
```bash
npm cache clean --force
rm -rf node_modules
npm install
```

## 🚀 Production Deployment

### Backend
1. Use PostgreSQL instead of SQLite
2. Set `DATABASE_URL` environment variable
3. Use production ASGI server (Gunicorn + Uvicorn)
4. Set up proper CORS origins
5. Use environment variables for secrets

### Frontend
1. Build production bundle:
   ```bash
   npm run build
   ```
2. Serve `dist/` folder with a web server (Nginx, Apache)
3. Configure API URL for production backend

## 📝 License

This project was built for the PNC Bank Hackathon.

## 👥 Contributors

Built for Product Managers to streamline ticket assignment workflows.

## 🔮 Future Enhancements

- [ ] Support for multiple projects/teams
- [ ] Email notifications for assignments
- [ ] Integration with Jira/GitHub Issues
- [ ] Advanced analytics and reporting
- [ ] Machine learning model training on historical data
- [ ] Multi-user support with authentication
- [ ] Real-time collaboration features

## 📞 Support

For issues or questions, please check:
- API Documentation: http://localhost:8000/docs
- Database Setup: See `backend/DATABASE_SETUP.md`
- Quick Start: See `START_HERE.md`

---

**Built with ❤️ for efficient ticket management**

