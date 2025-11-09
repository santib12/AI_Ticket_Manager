"""
Initialize the database - create all tables and optionally load initial data.
Run this script once to set up the database.
"""
from database import init_db, engine, Base
from database_service import sync_developers_from_csv, sync_tickets_from_csv
import sys

def main():
    print("Initializing database...")
    
    # Create all tables
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("✓ Tables created successfully")
    
    # Optionally load initial data from CSV
    if len(sys.argv) > 1 and sys.argv[1] == "--load-data":
        print("\nLoading developers from CSV...")
        from database import SessionLocal
        db = SessionLocal()
        try:
            count = sync_developers_from_csv(db)
            print(f"✓ Loaded {count} developers")
            
            print("\nLoading tickets from CSV...")
            count = sync_tickets_from_csv(db)
            print(f"✓ Loaded {count} tickets")
        finally:
            db.close()
    
    print("\n✓ Database initialization complete!")

if __name__ == "__main__":
    main()

