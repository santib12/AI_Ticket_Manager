"""
Simple script to test database setup
"""
import sys
import os

# Add current directory to path
sys.path.insert(0, os.path.dirname(__file__))

try:
    print("Testing imports...")
    from database import Base, engine, init_db
    from models.database_models import Developer, Ticket, Assignment, AssignmentHistory
    print("✓ All imports successful")
    
    print("\nInitializing database...")
    init_db()
    print("✓ Database initialized successfully!")
    
    print("\nDatabase file created at: ticket_manager.db")
    
except Exception as e:
    print(f"✗ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

