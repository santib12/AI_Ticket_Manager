# Database Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

This will install:
- SQLAlchemy (ORM)
- Alembic (migrations)

### 2. Initialize Database

Run the initialization script to create all database tables:

```bash
python init_db.py
```

To also load initial data from CSV files:

```bash
python init_db.py --load-data
```

This will:
- Create all database tables
- Load developers from `data/developers_roles.csv`
- Load tickets from `data/tickets_40.csv`

### 3. Start the Backend Server

```bash
python main.py
# OR
uvicorn main:app --reload
```

## Database Configuration

### SQLite (Default - Development)

The default configuration uses SQLite, which creates a local file `ticket_manager.db` in the backend directory. No additional setup needed!

### PostgreSQL (Production)

To use PostgreSQL instead:

1. Install PostgreSQL and create a database:
```sql
CREATE DATABASE ticket_manager;
```

2. Update your `.env` file:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/ticket_manager
```

3. Install PostgreSQL driver:
```bash
pip install psycopg2-binary
```

## API Endpoints

### New Database Endpoints

- `POST /assignments/save/` - Save assignments to database
- `GET /assignments/` - Get all assignments (with filters)
- `PUT /assignments/{id}/reassign/` - Reassign a ticket
- `DELETE /assignments/{id}/` - Remove an assignment
- `GET /assignments/{id}/history/` - Get assignment history
- `POST /developers/sync/` - Sync developers from CSV
- `POST /tickets/sync/` - Sync tickets from CSV

### Updated Endpoints

- `GET /developers/?use_db=true` - Get developers from database
- `GET /tickets/?use_db=true` - Get tickets from database

## Usage Examples

### Save Assignments After AI Assignment

```python
import requests

assignments = {
    "assignments": [
        {
            "ticket_id": 1,
            "assigned_to": "Alice",
            "reason": "AI reasoning here..."
        }
    ]
}

response = requests.post("http://localhost:8000/assignments/save/", json=assignments)
```

### Reassign a Ticket

```bash
curl -X PUT "http://localhost:8000/assignments/1/reassign/?new_developer=Bob&reason=Better%20fit"
```

### Get All Active Assignments

```bash
curl "http://localhost:8000/assignments/?status=active"
```

## Database Schema

The database includes 4 main tables:

1. **developers** - Developer information
2. **tickets** - Ticket information
3. **assignments** - Active and historical assignments
4. **assignment_history** - Audit trail of all changes

## Troubleshooting

### Database file not found
- Run `python init_db.py` to create the database

### Import errors
- Make sure all dependencies are installed: `pip install -r requirements.txt`
- Check that you're in the backend directory

### SQLite locked errors
- Close any other connections to the database
- Restart the server

## Next Steps

1. Update frontend to use new database endpoints
2. Implement assignment persistence on approval
3. Add reassignment/removal persistence
4. Load assignments on page refresh

