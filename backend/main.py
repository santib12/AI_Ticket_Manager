from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
import pandas as pd
import io
import os
from pathlib import Path
from dotenv import load_dotenv
from ai_engine.assigner import assign_ticket_from_csv
from database import get_db
from models.schemas import ResetAssignmentsRequest
from database_service import (
    get_all_developers, sync_developers_from_csv,
    get_all_tickets, sync_tickets_from_csv,
    get_assignments, create_assignment, save_assignments_batch,
    reassign_ticket, remove_assignment, get_assignment_history,
    update_developer_workload, refresh_all_developer_workloads,
    reset_all_assignments
)

# Load environment variables from .env file (look in project root)
env_path = Path(__file__).parent.parent.parent / '.env'
load_dotenv(dotenv_path=env_path)
# Also try loading from current directory as fallback
load_dotenv()

app = FastAPI(title="AI Ticket Orchestrator", version="1.0.0")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"message": "AI Ticket Orchestrator API", "status": "running"}


@app.get("/developers/")
async def get_developers(db: Session = Depends(get_db), use_db: bool = Query(False, description="Use database instead of CSV")):
    """
    Returns developer data from database (if use_db=true) or CSV file.
    """
    try:
        if use_db:
            # Load from database
            developers = get_all_developers(db)
            result = []
            for dev in developers:
                dev_dict = {
                    "name": dev.name,
                    "title": dev.title,
                    "experience_years": dev.experience_years,
                    "current_workload": dev.current_workload,
                    "availability": float(dev.availability) if dev.availability else 0.0,
                    "skills": dev.skills,
                    "capacity": float(dev.capacity) if dev.capacity else 0.0,
                    "availability_pct": float(dev.availability * 100) if dev.availability else 0.0
                }
                result.append(dev_dict)
            return {"status": "success", "developers": result}
        else:
            # Fallback to CSV
            from ai_engine.utils import load_developers_csv
            developers_df = load_developers_csv()
            developers_df['capacity'] = developers_df['availability'] * (20 - developers_df['current_workload'])
            developers_df['availability_pct'] = (developers_df['availability'] * 100).round(1)
            developers = developers_df.to_dict('records')
            return {"status": "success", "developers": developers}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading developers: {str(e)}")


@app.get("/tickets/")
async def get_tickets(db: Session = Depends(get_db), use_db: bool = Query(False, description="Use database instead of CSV")):
    """
    Returns ticket data from database (if use_db=true) or CSV file.
    """
    try:
        if use_db:
            # Load from database
            tickets_list = get_all_tickets(db)
            result = []
            for ticket in tickets_list:
                ticket_dict = {
                    "id": ticket.id,
                    "title": ticket.title,
                    "description": ticket.description,
                    "story_points": ticket.story_points,
                    "required_skill": ticket.required_skill,
                    "priority": ticket.priority,
                    "due_date": str(ticket.due_date) if ticket.due_date else None,
                    "status": ticket.status
                }
                result.append(ticket_dict)
            return {"status": "success", "tickets": result, "total": len(result)}
        else:
            # Fallback to CSV
            current_dir = Path(__file__).parent
            tickets_path = os.path.join(current_dir, "data", "tickets_40.csv")
            if not os.path.exists(tickets_path):
                raise HTTPException(status_code=404, detail="Tickets CSV file not found")
            tickets_df = pd.read_csv(tickets_path)
            tickets = tickets_df.to_dict('records')
            return {"status": "success", "tickets": tickets, "total": len(tickets)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading tickets: {str(e)}")


@app.post("/assign-tickets/")
async def assign_tickets(file: UploadFile = File(...)):
    """
    Accepts a CSV file upload, reads it into pandas,
    and returns AI assignments with reasoning.
    """
    try:
        # Validate file type
        if not file.filename.endswith('.csv'):
            raise HTTPException(status_code=400, detail="File must be a CSV file")
        
        # Read uploaded file
        contents = await file.read()
        df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        
        # Validate required columns
        required_columns = ['id', 'description', 'story_points', 'required_skill']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            raise HTTPException(
                status_code=400,
                detail=f"Missing required columns: {', '.join(missing_columns)}"
            )
        
        # Process assignments
        try:
            assignments = assign_ticket_from_csv(df)
        except ValueError as e:
            # Handle API key or configuration errors
            raise HTTPException(status_code=500, detail=f"Configuration error: {str(e)}")
        except Exception as e:
            # Handle API errors
            error_msg = str(e)
            if "rate limit" in error_msg.lower() or "429" in error_msg:
                raise HTTPException(
                    status_code=429, 
                    detail="OpenAI API rate limit exceeded. Please wait a moment and try again."
                )
            elif "authentication" in error_msg.lower() or "401" in error_msg or "403" in error_msg:
                raise HTTPException(
                    status_code=401,
                    detail="OpenAI API authentication failed. Please check your API key in the .env file."
                )
            else:
                raise HTTPException(
                    status_code=500, 
                    detail=f"Error assigning tickets: {error_msg}"
                )
        
        return {
            "status": "success",
            "total_tickets": len(df),
            "assignments": assignments
        }
    
    except pd.errors.EmptyDataError:
        raise HTTPException(status_code=400, detail="CSV file is empty")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")


# ==================== Database API Endpoints ====================

@app.post("/assignments/save/")
async def save_assignments(
    assignments_data: dict,
    db: Session = Depends(get_db)
):
    """
    Save AI-generated assignments to database.
    Expected format: {"assignments": [{"ticket_id": int, "assigned_to": str, "reason": str}]}
    """
    try:
        assignments_list = assignments_data.get("assignments", [])
        if not assignments_list:
            raise HTTPException(status_code=400, detail="No assignments provided")
        
        saved_assignments = save_assignments_batch(db, assignments_list, assigned_by='AI')
        
        return {
            "status": "success",
            "message": f"Saved {len(saved_assignments)} assignments",
            "assignments": [{"id": a.id, "ticket_id": a.ticket_id, "assigned_to": a.assigned_to} for a in saved_assignments]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving assignments: {str(e)}")


@app.get("/assignments/")
async def get_assignments_endpoint(
    status: Optional[str] = Query("active", description="Filter by status: active, rejected, removed"),
    developer_name: Optional[str] = Query(None, description="Filter by developer name"),
    ticket_id: Optional[int] = Query(None, description="Filter by ticket ID"),
    db: Session = Depends(get_db)
):
    """Get all assignments with optional filters."""
    try:
        assignments = get_assignments(db, status=status, developer_name=developer_name, ticket_id=ticket_id)
        
        result = []
        for a in assignments:
            assignment_dict = {
                "id": a.id,
                "ticket_id": a.ticket_id,
                "assigned_to": a.assigned_to,
                "assigned_by": a.assigned_by,
                "assignment_type": a.assignment_type,
                "reason": a.reason,
                "status": a.status,
                "created_at": str(a.created_at),
                "updated_at": str(a.updated_at)
            }
            result.append(assignment_dict)
        
        return {"status": "success", "assignments": result, "total": len(result)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting assignments: {str(e)}")


@app.put("/assignments/{assignment_id}/reassign/")
async def reassign_ticket_endpoint(
    assignment_id: int,
    new_developer: str = Query(..., description="Name of the new developer"),
    reason: Optional[str] = Query(None, description="Reason for reassignment"),
    db: Session = Depends(get_db)
):
    """Reassign a ticket to a different developer."""
    try:
        assignment = reassign_ticket(db, assignment_id, new_developer, reason, changed_by='User')
        if not assignment:
            raise HTTPException(status_code=404, detail="Assignment not found")
        
        return {
            "status": "success",
            "message": f"Ticket reassigned to {new_developer}",
            "assignment": {
                "id": assignment.id,
                "ticket_id": assignment.ticket_id,
                "assigned_to": assignment.assigned_to,
                "status": assignment.status
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reassigning ticket: {str(e)}")


@app.delete("/assignments/{assignment_id}/")
async def remove_assignment_endpoint(
    assignment_id: int,
    reason: Optional[str] = Query(None, description="Reason for removal"),
    db: Session = Depends(get_db)
):
    """Remove an assignment (soft delete - sets status to 'removed')."""
    try:
        assignment = remove_assignment(db, assignment_id, reason, changed_by='User')
        if not assignment:
            raise HTTPException(status_code=404, detail="Assignment not found")
        
        return {
            "status": "success",
            "message": "Assignment removed successfully",
            "assignment": {
                "id": assignment.id,
                "ticket_id": assignment.ticket_id,
                "status": assignment.status
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error removing assignment: {str(e)}")


@app.get("/assignments/{assignment_id}/history/")
async def get_assignment_history_endpoint(
    assignment_id: int,
    db: Session = Depends(get_db)
):
    """Get history of changes for an assignment."""
    try:
        history = get_assignment_history(db, assignment_id=assignment_id)
        
        result = []
        for h in history:
            history_dict = {
                "id": h.id,
                "ticket_id": h.ticket_id,
                "previous_developer": h.previous_developer,
                "new_developer": h.new_developer,
                "action": h.action,
                "reason": h.reason,
                "changed_by": h.changed_by,
                "changed_at": str(h.changed_at)
            }
            result.append(history_dict)
        
        return {"status": "success", "history": result, "total": len(result)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting assignment history: {str(e)}")


@app.post("/developers/sync/")
async def sync_developers(db: Session = Depends(get_db)):
    """Sync developers from CSV file to database."""
    try:
        count = sync_developers_from_csv(db)
        return {
            "status": "success",
            "message": f"Synced {count} developers from CSV to database"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error syncing developers: {str(e)}")


@app.post("/tickets/sync/")
async def sync_tickets(db: Session = Depends(get_db)):
    """Sync tickets from CSV file to database."""
    try:
        count = sync_tickets_from_csv(db)
        return {
            "status": "success",
            "message": f"Synced {count} tickets from CSV to database"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error syncing tickets: {str(e)}")


@app.post("/developers/refresh-workloads/")
async def refresh_workloads(db: Session = Depends(get_db)):
    """Refresh workload for all developers based on their active assignments."""
    try:
        count = refresh_all_developer_workloads(db)
        return {
            "status": "success",
            "message": f"Refreshed workload for {count} developers"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error refreshing workloads: {str(e)}")


@app.post("/assignments/reset-all")
async def reset_all_assignments_endpoint(
    request: ResetAssignmentsRequest = ResetAssignmentsRequest(),
    db: Session = Depends(get_db)
):
    """Reset all active assignments (removes all ticket assignments from developers)."""
    try:
        count = reset_all_assignments(db, reason=request.reason or "Reset all assignments by user", changed_by='User')
        return {
            "status": "success",
            "message": f"Reset {count} assignments. All tickets are now available for assignment.",
            "count": count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error resetting assignments: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

