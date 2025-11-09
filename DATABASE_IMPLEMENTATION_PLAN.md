# SQL Database Implementation Plan
## Persisting Ticket Assignments and Changes

### Overview
Currently, all ticket assignments and modifications (reassignments, removals) are stored only in React state and are lost on page refresh. This plan outlines adding a SQL database to persist all changes permanently.

---

## 1. Database Schema Design

### 1.1 Core Tables

#### `developers` Table
```sql
CREATE TABLE developers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    title VARCHAR(255),
    experience_years INTEGER,
    current_workload INTEGER DEFAULT 0,
    availability DECIMAL(3,2) CHECK (availability >= 0 AND availability <= 1),
    skills TEXT,
    capacity DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `tickets` Table
```sql
CREATE TABLE tickets (
    id INTEGER PRIMARY KEY,
    title VARCHAR(500),
    description TEXT,
    story_points INTEGER,
    required_skill VARCHAR(255),
    priority VARCHAR(50),
    due_date DATE,
    status VARCHAR(50) DEFAULT 'pending', -- pending, assigned, completed, rejected
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `assignments` Table (Core Assignment Tracking)
```sql
CREATE TABLE assignments (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    assigned_to VARCHAR(255) NOT NULL REFERENCES developers(name) ON DELETE CASCADE,
    assigned_by VARCHAR(255), -- Could be 'AI' or user name
    assignment_type VARCHAR(50) DEFAULT 'ai', -- 'ai', 'manual', 'reassigned'
    original_assigned_to VARCHAR(255), -- For tracking reassignments
    reason TEXT, -- AI reasoning or manual note
    status VARCHAR(50) DEFAULT 'active', -- active, rejected, removed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ticket_id, assigned_to, status) -- Prevent duplicate active assignments
);
```

#### `assignment_history` Table (Audit Trail)
```sql
CREATE TABLE assignment_history (
    id SERIAL PRIMARY KEY,
    assignment_id INTEGER REFERENCES assignments(id) ON DELETE CASCADE,
    ticket_id INTEGER NOT NULL,
    previous_developer VARCHAR(255),
    new_developer VARCHAR(255),
    action VARCHAR(50), -- 'created', 'reassigned', 'removed', 'rejected'
    reason TEXT,
    changed_by VARCHAR(255),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 1.2 Indexes for Performance
```sql
CREATE INDEX idx_assignments_ticket_id ON assignments(ticket_id);
CREATE INDEX idx_assignments_developer ON assignments(assigned_to);
CREATE INDEX idx_assignments_status ON assignments(status);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_required_skill ON tickets(required_skill);
```

---

## 2. Technology Stack

### Recommended: PostgreSQL with SQLAlchemy (Python) + Prisma/TypeORM (if needed)

**Why PostgreSQL:**
- Robust, production-ready
- Excellent JSON support (if we need flexible fields)
- Strong foreign key constraints
- Good performance
- Free and open-source

**Alternative: SQLite (for simplicity)**
- No server setup required
- Good for development/small deployments
- File-based database
- Limited concurrent writes

**ORM Choice: SQLAlchemy (Python)**
- Mature ORM for Python
- Works well with FastAPI
- Good migration support (Alembic)

---

## 3. Backend Implementation Steps

### 3.1 Database Setup & Configuration

#### Step 1: Add Dependencies
```bash
pip install sqlalchemy alembic psycopg2-binary  # PostgreSQL
# OR
pip install sqlalchemy alembic  # SQLite (built-in)
```

#### Step 2: Create Database Configuration
**File: `backend/database.py`**
```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

# Database URL from environment
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://user:password@localhost/ticket_manager"  # PostgreSQL
    # OR "sqlite:///./ticket_manager.db"  # SQLite
)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """Dependency for FastAPI to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

#### Step 3: Create Models
**File: `backend/models/database_models.py`**
```python
from sqlalchemy import Column, Integer, String, Text, DECIMAL, Date, TIMESTAMP, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class Developer(Base):
    __tablename__ = "developers"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, nullable=False, index=True)
    title = Column(String(255))
    experience_years = Column(Integer)
    current_workload = Column(Integer, default=0)
    availability = Column(DECIMAL(3,2))
    skills = Column(Text)
    capacity = Column(DECIMAL(10,2))
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    
    assignments = relationship("Assignment", back_populates="developer")

class Ticket(Base):
    __tablename__ = "tickets"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500))
    description = Column(Text)
    story_points = Column(Integer)
    required_skill = Column(String(255), index=True)
    priority = Column(String(50))
    due_date = Column(Date)
    status = Column(String(50), default='pending')
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    
    assignments = relationship("Assignment", back_populates="ticket")

class Assignment(Base):
    __tablename__ = "assignments"
    
    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False, index=True)
    assigned_to = Column(String(255), ForeignKey("developers.name", ondelete="CASCADE"), nullable=False, index=True)
    assigned_by = Column(String(255))
    assignment_type = Column(String(50), default='ai')
    original_assigned_to = Column(String(255))
    reason = Column(Text)
    status = Column(String(50), default='active', index=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    
    ticket = relationship("Ticket", back_populates="assignments")
    developer = relationship("Developer", back_populates="assignments")
    history = relationship("AssignmentHistory", back_populates="assignment")

class AssignmentHistory(Base):
    __tablename__ = "assignment_history"
    
    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id", ondelete="CASCADE"))
    ticket_id = Column(Integer, nullable=False)
    previous_developer = Column(String(255))
    new_developer = Column(String(255))
    action = Column(String(50))
    reason = Column(Text)
    changed_by = Column(String(255))
    changed_at = Column(TIMESTAMP, server_default=func.now())
    
    assignment = relationship("Assignment", back_populates="history")
```

### 3.2 Database Migration Setup (Alembic)

#### Step 1: Initialize Alembic
```bash
cd backend
alembic init alembic
```

#### Step 2: Configure Alembic
**File: `backend/alembic/env.py`** - Update to use our models
```python
from models.database_models import Base
target_metadata = Base.metadata
```

#### Step 3: Create Initial Migration
```bash
alembic revision --autogenerate -m "Initial schema"
alembic upgrade head
```

### 3.3 New API Endpoints

#### File: `backend/main.py` - Add new endpoints

```python
from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.database_models import Developer, Ticket, Assignment, AssignmentHistory

# 1. Save assignments after AI assignment
@app.post("/assignments/save/")
async def save_assignments(
    assignments_data: dict,
    db: Session = Depends(get_db)
):
    """Save AI-generated assignments to database"""
    # Implementation: Create Assignment records
    
# 2. Get all assignments
@app.get("/assignments/")
async def get_assignments(
    status: str = "active",
    db: Session = Depends(get_db)
):
    """Get all assignments, optionally filtered by status"""
    
# 3. Reassign ticket
@app.put("/assignments/{assignment_id}/reassign/")
async def reassign_ticket(
    assignment_id: int,
    new_developer: str,
    reason: str = None,
    db: Session = Depends(get_db)
):
    """Reassign a ticket to a different developer"""
    # Implementation:
    # 1. Get current assignment
    # 2. Create history record
    # 3. Update assignment
    # 4. Create new assignment record if needed
    
# 4. Remove assignment
@app.delete("/assignments/{assignment_id}/")
async def remove_assignment(
    assignment_id: int,
    reason: str = None,
    db: Session = Depends(get_db)
):
    """Remove an assignment (soft delete - set status to 'removed')"""
    
# 5. Get assignment history
@app.get("/assignments/{assignment_id}/history/")
async def get_assignment_history(
    assignment_id: int,
    db: Session = Depends(get_db)
):
    """Get history of changes for an assignment"""
    
# 6. Sync developers from CSV to database
@app.post("/developers/sync/")
async def sync_developers_from_csv(db: Session = Depends(get_db)):
    """Load developers from CSV and sync with database"""
    
# 7. Sync tickets from CSV to database
@app.post("/tickets/sync/")
async def sync_tickets_from_csv(db: Session = Depends(get_db)):
    """Load tickets from CSV and sync with database"""
```

### 3.4 Update Existing Endpoints

#### Modify `/assign-tickets/` endpoint:
- After AI assignment, save to database
- Return assignment IDs for frontend tracking

#### Modify `/developers/` endpoint:
- Load from database instead of CSV
- Fallback to CSV if database empty

#### Modify `/tickets/` endpoint:
- Load from database instead of CSV
- Fallback to CSV if database empty

---

## 4. Frontend Implementation Steps

### 4.1 Update API Service
**File: `frontend/src/services/api.js`**

Add new API calls:
```javascript
export const saveAssignments = async (assignments) => {
  // POST /assignments/save/
}

export const getAssignments = async (status = 'active') => {
  // GET /assignments/?status=active
}

export const reassignTicket = async (assignmentId, newDeveloper, reason) => {
  // PUT /assignments/{assignmentId}/reassign/
}

export const removeAssignment = async (assignmentId, reason) => {
  // DELETE /assignments/{assignmentId}/
}

export const getAssignmentHistory = async (assignmentId) => {
  // GET /assignments/{assignmentId}/history/
}
```

### 4.2 Update App.jsx

#### On Component Mount:
```javascript
useEffect(() => {
  loadTickets()      // Load from database
  loadDevelopers()    // Load from database
  loadAssignments()   // NEW: Load saved assignments
}, [])
```

#### Update `handleReassignTicket`:
```javascript
const handleReassignTicket = async (ticketId, newDeveloperName) => {
  // 1. Call API to reassign in database
  await reassignTicket(assignmentId, newDeveloperName, 'Manual reassignment')
  
  // 2. Update local state
  // 3. Refresh assignments from database
}
```

#### Update `handleRemoveTicket`:
```javascript
const handleRemoveTicket = async (ticketId) => {
  // 1. Call API to remove in database
  await removeAssignment(assignmentId, 'Removed by user')
  
  // 2. Update local state
  // 3. Refresh assignments from database
}
```

#### Update `handleApproveSelected`:
```javascript
const handleApproveSelected = async (approvedTickets, rejectedTicketsData) => {
  // 1. Save approved assignments to database
  await saveAssignments(approvedAssignments)
  
  // 2. Save rejected tickets (status = 'rejected')
  // 3. Update local state
}
```

### 4.3 Add Loading States
- Show loading spinner while syncing with database
- Handle errors gracefully
- Show success/error notifications

---

## 5. Data Migration Strategy

### 5.1 Initial Data Load

**Option A: One-time CSV Import Script**
```python
# backend/scripts/import_csv_data.py
def import_developers_from_csv():
    # Read developers_roles.csv
    # Insert into database
    
def import_tickets_from_csv():
    # Read tickets_40.csv
    # Insert into database
```

**Option B: API Endpoint for Import**
- `/developers/sync/` - Import developers from CSV
- `/tickets/sync/` - Import tickets from CSV
- Run once on first setup

### 5.2 Ongoing Sync
- Keep CSV files as backup/reference
- Database is source of truth
- CSV can be regenerated from database if needed

---

## 6. Implementation Phases

### Phase 1: Database Setup (Week 1)
- [ ] Set up database (PostgreSQL or SQLite)
- [ ] Create SQLAlchemy models
- [ ] Set up Alembic migrations
- [ ] Create initial migration
- [ ] Test database connection

### Phase 2: Backend API (Week 1-2)
- [ ] Implement database CRUD operations
- [ ] Create new API endpoints for assignments
- [ ] Update existing endpoints to use database
- [ ] Add error handling and validation
- [ ] Write unit tests

### Phase 3: Data Migration (Week 2)
- [ ] Create CSV import scripts
- [ ] Import existing developers
- [ ] Import existing tickets
- [ ] Verify data integrity

### Phase 4: Frontend Integration (Week 2-3)
- [ ] Update API service with new endpoints
- [ ] Modify App.jsx to load from database
- [ ] Update reassignment/removal handlers
- [ ] Add loading states and error handling
- [ ] Test persistence across refreshes

### Phase 5: Testing & Polish (Week 3)
- [ ] End-to-end testing
- [ ] Test edge cases (concurrent updates, etc.)
- [ ] Performance testing
- [ ] Documentation
- [ ] Deploy and verify

---

## 7. Environment Variables

Add to `.env`:
```env
# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/ticket_manager
# OR for SQLite:
# DATABASE_URL=sqlite:///./ticket_manager.db

# Optional: Database connection pool settings
DB_POOL_SIZE=10
DB_MAX_OVERFLOW=20
```

---

## 8. Testing Checklist

### Backend Tests
- [ ] Test database connection
- [ ] Test CRUD operations
- [ ] Test assignment creation
- [ ] Test reassignment
- [ ] Test removal
- [ ] Test history tracking
- [ ] Test concurrent updates
- [ ] Test data validation

### Frontend Tests
- [ ] Test loading assignments on mount
- [ ] Test reassignment persistence
- [ ] Test removal persistence
- [ ] Test refresh persistence
- [ ] Test error handling
- [ ] Test loading states

### Integration Tests
- [ ] Full assignment flow (AI → Approve → Save)
- [ ] Reassignment flow
- [ ] Removal flow
- [ ] History tracking
- [ ] Data sync from CSV

---

## 9. Future Enhancements

1. **Real-time Updates**: WebSocket support for live updates
2. **User Authentication**: Track who made changes
3. **Advanced Filtering**: Query assignments by date, developer, status
4. **Analytics**: Dashboard with assignment statistics
5. **Export**: Generate reports from database
6. **Backup**: Automated database backups
7. **Audit Log**: Enhanced history tracking with user info

---

## 10. Rollback Plan

If issues arise:
1. Keep CSV-based system as fallback
2. Add feature flag to switch between DB and CSV
3. Maintain backward compatibility
4. Database can be disabled via environment variable

---

## 11. Estimated Timeline

- **Total Time**: 2-3 weeks
- **Database Setup**: 1-2 days
- **Backend Implementation**: 5-7 days
- **Frontend Integration**: 3-5 days
- **Testing & Bug Fixes**: 3-5 days

---

## 12. Dependencies to Add

### Backend (`requirements.txt`)
```
sqlalchemy>=2.0.0
alembic>=1.12.0
psycopg2-binary>=2.9.0  # For PostgreSQL
# OR no extra package needed for SQLite
```

---

## Notes

- Start with SQLite for development (easier setup)
- Migrate to PostgreSQL for production
- Keep CSV files as backup/reference
- Implement soft deletes (status flags) instead of hard deletes
- Add database indexes for performance
- Consider connection pooling for production

