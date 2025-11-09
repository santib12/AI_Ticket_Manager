from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import io
import os
from pathlib import Path
from dotenv import load_dotenv
from ai_engine.assigner import assign_ticket_from_csv

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
async def get_developers():
    """
    Returns developer data from CSV file.
    """
    try:
        from ai_engine.utils import load_developers_csv
        import pandas as pd
        
        developers_df = load_developers_csv()
        
        # Calculate capacity for each developer
        developers_df['capacity'] = developers_df['availability'] * (20 - developers_df['current_workload'])
        developers_df['availability_pct'] = (developers_df['availability'] * 100).round(1)
        
        # Convert to dict format
        developers = developers_df.to_dict('records')
        
        return {
            "status": "success",
            "developers": developers
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading developers: {str(e)}")


@app.get("/tickets/")
async def get_tickets():
    """
    Returns ticket data from CSV file.
    """
    try:
        import pandas as pd
        import os
        from pathlib import Path
        
        # Get the backend directory
        current_dir = Path(__file__).parent
        tickets_path = os.path.join(current_dir, "data", "tickets_fixed.csv")
        
        if not os.path.exists(tickets_path):
            raise HTTPException(status_code=404, detail="Tickets CSV file not found")
        
        tickets_df = pd.read_csv(tickets_path)
        
        # Convert to dict format
        tickets = tickets_df.to_dict('records')
        
        return {
            "status": "success",
            "tickets": tickets,
            "total": len(tickets)
        }
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

