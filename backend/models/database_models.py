from sqlalchemy import Column, Integer, String, Text, DECIMAL, Date, TIMESTAMP, ForeignKey, UniqueConstraint
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
    availability = Column(DECIMAL(3, 2))
    skills = Column(Text)
    capacity = Column(DECIMAL(10, 2))
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    
    assignments = relationship("Assignment", back_populates="developer", cascade="all, delete-orphan")


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
    
    assignments = relationship("Assignment", back_populates="ticket", cascade="all, delete-orphan")


class Assignment(Base):
    __tablename__ = "assignments"
    
    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False, index=True)
    assigned_to = Column(String(255), ForeignKey("developers.name", ondelete="CASCADE"), nullable=False, index=True)
    assigned_by = Column(String(255))  # 'AI' or user name
    assignment_type = Column(String(50), default='ai')  # 'ai', 'manual', 'reassigned'
    original_assigned_to = Column(String(255))  # For tracking reassignments
    reason = Column(Text)  # AI reasoning or manual note
    status = Column(String(50), default='active', index=True)  # 'active', 'rejected', 'removed'
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    
    # Unique constraint: one active assignment per ticket
    __table_args__ = (
        UniqueConstraint('ticket_id', 'status', name='unique_active_ticket_assignment'),
    )
    
    ticket = relationship("Ticket", back_populates="assignments")
    developer = relationship("Developer", back_populates="assignments")
    history = relationship("AssignmentHistory", back_populates="assignment", cascade="all, delete-orphan")


class AssignmentHistory(Base):
    __tablename__ = "assignment_history"
    
    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id", ondelete="CASCADE"), nullable=True)
    ticket_id = Column(Integer, nullable=False, index=True)
    previous_developer = Column(String(255))
    new_developer = Column(String(255))
    action = Column(String(50))  # 'created', 'reassigned', 'removed', 'rejected'
    reason = Column(Text)
    changed_by = Column(String(255))  # 'AI' or user name
    changed_at = Column(TIMESTAMP, server_default=func.now())
    
    assignment = relationship("Assignment", back_populates="history")

