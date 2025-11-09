import pandas as pd
import os
from pathlib import Path


def load_developers_csv(file_path: str = None) -> pd.DataFrame:
    """
    Load developer data from CSV file.
    
    Args:
        file_path: Path to developers CSV. If None, uses default data/developers.csv
    
    Returns:
        DataFrame with developer information
    """
    if file_path is None:
        # Get the backend directory (utils.py is in backend/ai_engine/)
        current_dir = Path(__file__).parent
        backend_dir = current_dir.parent
        file_path = os.path.join(backend_dir, "data", "developers_expanded.csv")
    
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Developers CSV not found at: {file_path}")
    
    df = pd.read_csv(file_path)
    
    # Map column names from expanded CSV to expected format
    column_mapping = {
        'experience': 'experience_years',
        'workload': 'current_workload'
    }
    df = df.rename(columns=column_mapping)
    
    # Validate required columns
    required_columns = ['name', 'availability', 'current_workload', 'skills', 'experience_years']
    missing_columns = [col for col in required_columns if col not in df.columns]
    if missing_columns:
        raise ValueError(f"Missing required columns in developers CSV: {', '.join(missing_columns)}")
    
    return df


def calculate_developer_capacity(availability: float, current_workload: int) -> float:
    """
    Calculate developer capacity: availability × (20 − current workload).
    
    Args:
        availability: Developer availability (0.0 to 1.0)
        current_workload: Current workload in story points
    
    Returns:
        Capacity score
    """
    return availability * (20 - current_workload)


def get_developer_info(developers_df: pd.DataFrame) -> str:
    """
    Format developer information as a string for GPT prompt.
    
    Args:
        developers_df: DataFrame with developer data
    
    Returns:
        Formatted string with developer information
    """
    info_lines = []
    for _, dev in developers_df.iterrows():
        capacity = calculate_developer_capacity(
            dev['availability'],
            dev['current_workload']
        )
        info_lines.append(
            f"- {dev['name']}: "
            f"Availability={dev['availability']:.1%}, "
            f"Current Workload={dev['current_workload']} story points, "
            f"Capacity={capacity:.2f}, "
            f"Skills={dev['skills']}, "
            f"Experience={dev['experience_years']} years"
        )
    return "\n".join(info_lines)

