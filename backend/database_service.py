"""
Database service layer for CRUD operations on tickets, developers, and assignments.
"""
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from typing import List, Optional, Dict
from datetime import datetime
from models.database_models import Developer, Ticket, Assignment, AssignmentHistory
import pandas as pd


# ==================== Developer Operations ====================

def get_developer_by_name(db: Session, name: str) -> Optional[Developer]:
    """Get a developer by name."""
    return db.query(Developer).filter(Developer.name == name).first()


def get_all_developers(db: Session) -> List[Developer]:
    """Get all developers."""
    return db.query(Developer).all()


def create_developer(db: Session, developer_data: dict) -> Developer:
    """Create a new developer."""
    developer = Developer(**developer_data)
    db.add(developer)
    db.commit()
    db.refresh(developer)
    return developer


def update_developer(db: Session, name: str, developer_data: dict) -> Optional[Developer]:
    """Update a developer."""
    developer = get_developer_by_name(db, name)
    if developer:
        for key, value in developer_data.items():
            setattr(developer, key, value)
        db.commit()
        db.refresh(developer)
    return developer


def sync_developers_from_csv(db: Session, csv_path: str = None) -> int:
    """
    Sync developers from CSV file to database.
    Returns number of developers synced.
    """
    from ai_engine.utils import load_developers_csv
    
    developers_df = load_developers_csv(csv_path)
    count = 0
    
    for _, row in developers_df.iterrows():
        developer_data = {
            'name': row['name'],
            'title': row.get('title', 'Software Engineer'),
            'experience_years': int(row.get('experience_years', 0)),
            'current_workload': int(row.get('current_workload', 0)),
            'availability': float(row.get('availability', 0)),
            'skills': str(row.get('skills', '')),
        }
        
        # Calculate capacity
        from ai_engine.utils import calculate_developer_capacity
        developer_data['capacity'] = calculate_developer_capacity(
            developer_data['availability'],
            developer_data['current_workload']
        )
        
        # Check if developer exists
        existing = get_developer_by_name(db, developer_data['name'])
        if existing:
            update_developer(db, developer_data['name'], developer_data)
        else:
            create_developer(db, developer_data)
        count += 1
    
    return count


# ==================== Ticket Operations ====================

def get_ticket_by_id(db: Session, ticket_id: int) -> Optional[Ticket]:
    """Get a ticket by ID."""
    return db.query(Ticket).filter(Ticket.id == ticket_id).first()


def get_all_tickets(db: Session, status: Optional[str] = None) -> List[Ticket]:
    """Get all tickets, optionally filtered by status."""
    query = db.query(Ticket)
    if status:
        query = query.filter(Ticket.status == status)
    return query.all()


def create_ticket(db: Session, ticket_data: dict) -> Ticket:
    """Create a new ticket."""
    ticket = Ticket(**ticket_data)
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket


def update_ticket(db: Session, ticket_id: int, ticket_data: dict) -> Optional[Ticket]:
    """Update a ticket."""
    ticket = get_ticket_by_id(db, ticket_id)
    if ticket:
        for key, value in ticket_data.items():
            setattr(ticket, key, value)
        db.commit()
        db.refresh(ticket)
    return ticket


def sync_tickets_from_csv(db: Session, csv_path: str = None) -> int:
    """
    Sync tickets from CSV file to database.
    Returns number of tickets synced.
    """
    import os
    from pathlib import Path
    
    if csv_path is None:
        current_dir = Path(__file__).parent
        csv_path = os.path.join(current_dir, "data", "tickets_40.csv")
    
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Tickets CSV not found at: {csv_path}")
    
    tickets_df = pd.read_csv(csv_path)
    count = 0
    
    for _, row in tickets_df.iterrows():
        ticket_data = {
            'id': int(row.get('id', 0)),
            'title': str(row.get('title', '')),
            'description': str(row.get('description', '')),
            'story_points': int(row.get('story_points', 0)) if pd.notna(row.get('story_points')) else 0,
            'required_skill': str(row.get('required_skill', '')),
            'priority': str(row.get('priority', '')) if pd.notna(row.get('priority')) else None,
            'status': 'pending',
        }
        
        # Handle due_date if present
        if 'due_date' in row and pd.notna(row.get('due_date')):
            from datetime import datetime
            try:
                ticket_data['due_date'] = datetime.strptime(str(row['due_date']), '%Y-%m-%d').date()
            except:
                pass
        
        # Check if ticket exists
        existing = get_ticket_by_id(db, ticket_data['id'])
        if existing:
            update_ticket(db, ticket_data['id'], ticket_data)
        else:
            create_ticket(db, ticket_data)
        count += 1
    
    return count


# ==================== Assignment Operations ====================

def update_developer_workload(db: Session, developer_name: str):
    """
    Update a developer's current_workload based on their active assignments.
    Calculates total story points from all active assignments.
    """
    developer = get_developer_by_name(db, developer_name)
    if not developer:
        return
    
    # Get all active assignments for this developer
    active_assignments = get_assignments(db, status='active', developer_name=developer_name)
    
    # Calculate total story points from active assignments
    total_story_points = 0
    for assignment in active_assignments:
        ticket = get_ticket_by_id(db, assignment.ticket_id)
        if ticket and ticket.story_points:
            total_story_points += ticket.story_points
    
    # Update developer workload
    developer.current_workload = total_story_points
    
    # Recalculate capacity
    from ai_engine.utils import calculate_developer_capacity
    developer.capacity = calculate_developer_capacity(
        float(developer.availability) if developer.availability else 0.0,
        developer.current_workload
    )
    
    db.commit()
    db.refresh(developer)


def refresh_all_developer_workloads(db: Session):
    """
    Refresh workload for all developers based on their active assignments.
    Useful for ensuring data consistency after bulk operations.
    """
    developers = get_all_developers(db)
    for developer in developers:
        update_developer_workload(db, developer.name)
    return len(developers)


def create_assignment(
    db: Session,
    ticket_id: int,
    assigned_to: str,
    reason: str = None,
    assigned_by: str = 'AI',
    assignment_type: str = 'ai',
    update_workload: bool = True
) -> Assignment:
    """
    Create a new assignment.
    
    Args:
        update_workload: If True, update developer workload immediately. 
                        Set to False when batching assignments.
    """
    # Deactivate any existing active assignments for this ticket
    db.query(Assignment).filter(
        and_(
            Assignment.ticket_id == ticket_id,
            Assignment.status == 'active'
        )
    ).update({'status': 'removed'})
    
    assignment = Assignment(
        ticket_id=ticket_id,
        assigned_to=assigned_to,
        reason=reason,
        assigned_by=assigned_by,
        assignment_type=assignment_type,
        original_assigned_to=assigned_to,
        status='active'
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    
    # Create history record
    create_assignment_history(
        db,
        assignment_id=assignment.id,
        ticket_id=ticket_id,
        new_developer=assigned_to,
        action='created',
        reason=reason,
        changed_by=assigned_by
    )
    
    # Update developer workload if requested
    if update_workload:
        update_developer_workload(db, assigned_to)
    
    return assignment


def get_assignment_by_id(db: Session, assignment_id: int) -> Optional[Assignment]:
    """Get an assignment by ID."""
    return db.query(Assignment).filter(Assignment.id == assignment_id).first()


def get_assignments(
    db: Session,
    status: Optional[str] = 'active',
    developer_name: Optional[str] = None,
    ticket_id: Optional[int] = None
) -> List[Assignment]:
    """Get assignments with optional filters."""
    query = db.query(Assignment)
    
    if status:
        query = query.filter(Assignment.status == status)
    if developer_name:
        query = query.filter(Assignment.assigned_to == developer_name)
    if ticket_id:
        query = query.filter(Assignment.ticket_id == ticket_id)
    
    return query.all()


def reassign_ticket(
    db: Session,
    assignment_id: int,
    new_developer: str,
    reason: str = None,
    changed_by: str = 'User'
) -> Optional[Assignment]:
    """Reassign a ticket to a different developer."""
    assignment = get_assignment_by_id(db, assignment_id)
    if not assignment:
        return None
    
    previous_developer = assignment.assigned_to
    
    # Create history record before updating
    create_assignment_history(
        db,
        assignment_id=assignment.id,
        ticket_id=assignment.ticket_id,
        previous_developer=previous_developer,
        new_developer=new_developer,
        action='reassigned',
        reason=reason or f"Reassigned from {previous_developer} to {new_developer}",
        changed_by=changed_by
    )
    
    # Update assignment
    assignment.assigned_to = new_developer
    if reason:
        assignment.reason = f"Manually reassigned from {previous_developer} to {new_developer}. {assignment.reason}"
    assignment.assignment_type = 'reassigned'
    assignment.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(assignment)
    
    # Update workload for both previous and new developer
    update_developer_workload(db, previous_developer)
    update_developer_workload(db, new_developer)
    
    return assignment


def remove_assignment(
    db: Session,
    assignment_id: int,
    reason: str = None,
    changed_by: str = 'User'
) -> Optional[Assignment]:
    """Remove an assignment (soft delete)."""
    assignment = get_assignment_by_id(db, assignment_id)
    if not assignment:
        return None
    
    # Create history record
    create_assignment_history(
        db,
        assignment_id=assignment.id,
        ticket_id=assignment.ticket_id,
        previous_developer=assignment.assigned_to,
        action='removed',
        reason=reason or "Removed by user",
        changed_by=changed_by
    )
    
    # Soft delete - set status to 'removed'
    assignment.status = 'removed'
    assignment.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(assignment)
    
    # Update developer workload
    update_developer_workload(db, assignment.assigned_to)
    
    return assignment


def save_assignments_batch(
    db: Session,
    assignments_data: List[Dict],
    assigned_by: str = 'AI'
) -> List[Assignment]:
    """
    Save multiple assignments at once (e.g., after AI assignment).
    Updates developer workloads after all assignments are created.
    """
    saved_assignments = []
    developers_to_update = set()
    
    # Create all assignments without updating workload (for efficiency)
    for assignment_data in assignments_data:
        assignment = create_assignment(
            db,
            ticket_id=assignment_data['ticket_id'],
            assigned_to=assignment_data['assigned_to'],
            reason=assignment_data.get('reason'),
            assigned_by=assigned_by,
            assignment_type='ai',
            update_workload=False  # Don't update workload during batch creation
        )
        saved_assignments.append(assignment)
        developers_to_update.add(assignment_data['assigned_to'])
    
    # Update workload for all affected developers once (batch update for efficiency)
    for developer_name in developers_to_update:
        update_developer_workload(db, developer_name)
    
    return saved_assignments


# ==================== Assignment History Operations ====================

def create_assignment_history(
    db: Session,
    assignment_id: Optional[int],
    ticket_id: int,
    previous_developer: Optional[str] = None,
    new_developer: Optional[str] = None,
    action: str = 'created',
    reason: Optional[str] = None,
    changed_by: str = 'System'
) -> AssignmentHistory:
    """Create a history record for an assignment change."""
    history = AssignmentHistory(
        assignment_id=assignment_id,
        ticket_id=ticket_id,
        previous_developer=previous_developer,
        new_developer=new_developer,
        action=action,
        reason=reason,
        changed_by=changed_by
    )
    db.add(history)
    db.commit()
    db.refresh(history)
    return history


def get_assignment_history(
    db: Session,
    assignment_id: Optional[int] = None,
    ticket_id: Optional[int] = None
) -> List[AssignmentHistory]:
    """Get assignment history, optionally filtered by assignment_id or ticket_id."""
    query = db.query(AssignmentHistory)
    
    if assignment_id:
        query = query.filter(AssignmentHistory.assignment_id == assignment_id)
    if ticket_id:
        query = query.filter(AssignmentHistory.ticket_id == ticket_id)
    
    return query.order_by(AssignmentHistory.changed_at.desc()).all()


def reset_all_assignments(db: Session, reason: str = "Reset all assignments", changed_by: str = 'User') -> int:
    """
    Reset all active assignments (hard delete them).
    Updates developer workloads and creates history records.
    Returns the number of assignments reset.
    """
    # Get all active assignments
    active_assignments = get_assignments(db, status='active')
    count = len(active_assignments)
    
    # Get unique developers to update workloads
    developers_to_update = set()
    
    # Remove each assignment and create history
    for assignment in active_assignments:
        developers_to_update.add(assignment.assigned_to)
        
        # Capture assignment_id before deleting
        assignment_id = assignment.id
        ticket_id = assignment.ticket_id
        developer_name = assignment.assigned_to
        
        # Create history record before deleting
        create_assignment_history(
            db,
            assignment_id=assignment_id,
            ticket_id=ticket_id,
            previous_developer=developer_name,
            action='removed',
            reason=reason,
            changed_by=changed_by
        )
        
        # Hard delete the assignment (delete it completely)
        db.delete(assignment)
    
    db.commit()
    
    # Update workload for all affected developers
    for developer_name in developers_to_update:
        update_developer_workload(db, developer_name)
    
    return count

