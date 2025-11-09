from pydantic import BaseModel, Field
from typing import Optional


class Ticket(BaseModel):
    """Ticket model for validation."""
    id: int = Field(..., description="Unique ticket identifier")
    description: str = Field(..., description="Ticket description")
    story_points: int = Field(..., ge=1, description="Story points estimate")
    required_skill: str = Field(..., description="Required skill for this ticket")


class Assignment(BaseModel):
    """Assignment result model."""
    assigned_to: str = Field(..., description="Name of assigned developer")
    reason: str = Field(..., description="Explanation of assignment decision")


class TicketAssignment(BaseModel):
    """Complete ticket assignment with ticket info."""
    ticket_id: int
    assigned_to: str
    reason: str
    ticket_description: Optional[str] = None
    story_points: Optional[int] = None


class ResetAssignmentsRequest(BaseModel):
    """Request model for resetting all assignments."""
    reason: Optional[str] = None
