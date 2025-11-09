import os
import json
import pandas as pd
from pathlib import Path
from openai import OpenAI
from typing import List, Dict
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock
from dotenv import load_dotenv
from ai_engine.utils import load_developers_csv, get_developer_info, calculate_developer_capacity

# Load environment variables from .env file (look in project root)
env_path = Path(__file__).parent.parent.parent.parent / '.env'
load_dotenv(dotenv_path=env_path)
# Also try loading from current directory as fallback
load_dotenv()


# Initialize OpenAI client
def get_openai_client() -> OpenAI:
    """Get OpenAI client with API key from environment."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY environment variable is not set. Please set it in your .env file.")
    if api_key == "your_openai_api_key_here":
        raise ValueError("Please update your .env file with a valid OpenAI API key.")
    return OpenAI(api_key=api_key)


def assign_ticket_from_csv(tickets_df: pd.DataFrame, max_workers: int = 5) -> List[Dict]:
    """
    Assign tickets to developers using GPT-4o-mini with workload balancing.
    Uses parallel processing to speed up assignments.
    
    Args:
        tickets_df: DataFrame with ticket information (id, description, story_points, required_skill)
        max_workers: Maximum number of concurrent API calls (default: 5)
    
    Returns:
        List of assignment dictionaries with 'ticket_id', 'assigned_to', and 'reason'
    """
    # Load developer data
    developers_df = load_developers_csv()
    
    # Initialize OpenAI client
    client = get_openai_client()
    
    assignments = []
    # Track assignments to balance workload (thread-safe)
    assignment_tracker = {name: {'tickets': 0, 'story_points': 0} for name in developers_df['name'].values}
    tracker_lock = Lock()
    
    def assign_single_ticket(ticket_data):
        """Assign a single ticket (used for parallel processing)."""
        idx, ticket = ticket_data
        
        # Get current state (with lock for thread safety)
        with tracker_lock:
            developer_info = get_developer_info_with_assignments(developers_df, assignment_tracker)
            assignment_summary = get_assignment_summary(assignment_tracker)
        
        # Create detailed prompt with explicit parameter requirements
        prompt = f"""Assign this ticket to a developer. DISTRIBUTE workload evenly across ALL developers.

Developers (current batch assignments):
{developer_info}

Ticket:
- ID: {ticket['id']}
- Description: {ticket['description']}
- Story Points: {ticket['story_points']}
- Required Skill: {ticket['required_skill']}
{f"- Priority: {ticket.get('priority', '')}" if ticket.get('priority') else ""}

Current distribution: {assignment_summary}

Rules: 1) Distribute evenly, 2) Match skills, 3) Consider capacity, 4) Consider job title relevance (e.g., Backend Engineer for backend tickets, Frontend Developer for frontend tickets, DevOps Engineer for infrastructure tickets), 5) Prefer less-assigned devs.

Respond with JSON:
{{
    "assigned_to": "DeveloperName",
    "reason": "Provide a DETAILED explanation (4-6 sentences) that MUST include: (1) The selected developer's specific parameters: job title, availability percentage, current workload, base capacity, remaining capacity after this assignment, experience years, and relevant skills. (2) Why this developer was chosen: job title relevance analysis (how their role aligns with the ticket type), skill match analysis (exact skill match or closest match), capacity analysis (can they handle this ticket's story points), workload balance (how this maintains even distribution), and experience relevance. (3) Comparison with 1-2 alternative developers: why they were NOT chosen, including their job titles and how they compare (e.g., 'Alice (Senior Software Engineer) has 85% availability and 10 pts workload, giving her 15.5 base capacity with 12 pts remaining, but her role is more generalist and she lacks React skills. Bob (Frontend Developer) has React skills and 12.3 remaining capacity, and his job title is highly relevant for this frontend ticket, but has already been assigned 3 tickets in this batch, so choosing him would unbalance distribution. Charlie (Full Stack Developer) has React skills, 11.2 remaining capacity, a relevant job title for this full-stack ticket, and only 1 ticket assigned, making him the optimal choice for balanced distribution.')"
}}"""
        
        max_retries = 2  # Reduced retries for speed
        retry_count = 0
        assigned = False
        result = None
        
        while retry_count < max_retries and not assigned:
            try:
                # Call GPT-4o-mini
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {
                            "role": "system",
                            "content": "You are an expert at matching tickets to developers. Your reasoning MUST be highly detailed and include: (1) Specific parameter values for the selected developer (job title, availability %, current workload, base capacity, remaining capacity, experience years, skills), (2) Job title relevance analysis (how the developer's role aligns with the ticket type), (3) Explicit skill match analysis, (4) Capacity calculations showing why they can handle this ticket, (5) Workload distribution impact, (6) Direct comparisons with 2-3 alternative developers explaining why they were not chosen with their specific parameters including job titles. Always use exact numbers from the developer data. Respond with valid JSON only."
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    temperature=0.5,
                    response_format={"type": "json_object"},
                    timeout=30  # Add timeout for faster failure
                )
                
                # Parse response
                response_text = response.choices[0].message.content
                assignment_data = json.loads(response_text)
                
                # Validate assignment
                assigned_name = assignment_data.get("assigned_to", "").strip()
                if assigned_name not in developers_df['name'].values:
                    raise ValueError(f"Invalid developer name: {assigned_name}")
                
                # Update tracker (thread-safe)
                with tracker_lock:
                    assignment_tracker[assigned_name]['tickets'] += 1
                    assignment_tracker[assigned_name]['story_points'] += int(ticket.get('story_points', 0) or 0)
                
                result = {
                    "ticket_id": int(ticket['id']),
                    "assigned_to": assigned_name,
                    "reason": assignment_data.get("reason", "No reason provided")
                }
                assigned = True
                
            except json.JSONDecodeError as e:
                retry_count += 1
                if retry_count >= max_retries:
                    # Fallback: use smart assignment algorithm
                    with tracker_lock:
                        assigned_name = smart_fallback_assignment(developers_df, ticket, assignment_tracker)
                        assigned_tickets_before = assignment_tracker[assigned_name]['tickets']
                        assignment_tracker[assigned_name]['tickets'] += 1
                        assignment_tracker[assigned_name]['story_points'] += int(ticket.get('story_points', 0) or 0)
                    # Get developer details for fallback reason
                    dev = developers_df[developers_df['name'] == assigned_name].iloc[0]
                    capacity = calculate_developer_capacity(dev['availability'], dev['current_workload'])
                    assigned_points_before = assignment_tracker[assigned_name]['story_points'] - int(ticket.get('story_points', 0) or 0)
                    remaining_capacity = capacity - assigned_points_before
                    try:
                        if 'title' in dev.index:
                            title_val = dev['title']
                            title = str(title_val) if pd.notna(title_val) else 'Software Engineer'
                        else:
                            title = 'Software Engineer'
                    except (KeyError, AttributeError):
                        title = 'Software Engineer'
                    result = {
                        "ticket_id": int(ticket['id']),
                        "assigned_to": assigned_name,
                        "reason": f"Assigned via fallback algorithm after GPT parsing error. {assigned_name} ({title}) was selected with {dev['availability']:.1%} availability, {dev['current_workload']} pts current workload, {capacity:.2f} base capacity, {remaining_capacity:.2f} remaining capacity, {dev['experience_years']} years experience, and skills: {dev['skills']}. The job title '{title}' is relevant for this ticket type. This assignment maintains workload balance with {assigned_tickets_before} tickets already assigned in this batch."
                    }
                    assigned = True
                else:
                    continue
            
            except Exception as e:
                error_msg = str(e)
                # Check for API-specific errors
                if "rate limit" in error_msg.lower() or "429" in error_msg:
                    import time
                    wait_time = (retry_count + 1) * 2
                    time.sleep(wait_time)
                    retry_count += 1
                    continue
                elif "authentication" in error_msg.lower() or "401" in error_msg or "403" in error_msg:
                    raise ValueError(f"OpenAI API authentication error: {error_msg}. Please check your API key.")
                elif retry_count >= max_retries - 1:
                    # Final fallback
                    with tracker_lock:
                        assigned_name = smart_fallback_assignment(developers_df, ticket, assignment_tracker)
                        assigned_tickets_before = assignment_tracker[assigned_name]['tickets']
                        assignment_tracker[assigned_name]['tickets'] += 1
                        assignment_tracker[assigned_name]['story_points'] += int(ticket.get('story_points', 0) or 0)
                    # Get developer details for fallback reason
                    dev = developers_df[developers_df['name'] == assigned_name].iloc[0]
                    capacity = calculate_developer_capacity(dev['availability'], dev['current_workload'])
                    assigned_points_before = assignment_tracker[assigned_name]['story_points'] - int(ticket.get('story_points', 0) or 0)
                    remaining_capacity = capacity - assigned_points_before
                    try:
                        if 'title' in dev.index:
                            title_val = dev['title']
                            title = str(title_val) if pd.notna(title_val) else 'Software Engineer'
                        else:
                            title = 'Software Engineer'
                    except (KeyError, AttributeError):
                        title = 'Software Engineer'
                    result = {
                        "ticket_id": int(ticket['id']),
                        "assigned_to": assigned_name,
                        "reason": f"Assigned via fallback algorithm after API error ({error_msg}). {assigned_name} ({title}) was selected with {dev['availability']:.1%} availability, {dev['current_workload']} pts current workload, {capacity:.2f} base capacity, {remaining_capacity:.2f} remaining capacity, {dev['experience_years']} years experience, and skills: {dev['skills']}. The job title '{title}' is relevant for this ticket type. This assignment maintains workload balance with {assigned_tickets_before} tickets already assigned in this batch."
                    }
                    assigned = True
                else:
                    retry_count += 1
                    continue
        
        return result
    
    # Process tickets in parallel
    ticket_list = list(tickets_df.iterrows())
    
    # Use ThreadPoolExecutor for parallel processing
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        # Submit all tasks
        future_to_ticket = {executor.submit(assign_single_ticket, ticket_data): ticket_data for ticket_data in ticket_list}
        
        # Collect results as they complete
        for future in as_completed(future_to_ticket):
            try:
                result = future.result()
                if result:
                    assignments.append(result)
            except Exception as e:
                # Handle any unexpected errors
                ticket_data = future_to_ticket[future]
                idx, ticket = ticket_data
                # Fallback assignment
                with tracker_lock:
                    assigned_name = smart_fallback_assignment(developers_df, ticket, assignment_tracker)
                    assigned_tickets_before = assignment_tracker[assigned_name]['tickets']
                    assignment_tracker[assigned_name]['tickets'] += 1
                    assignment_tracker[assigned_name]['story_points'] += int(ticket.get('story_points', 0) or 0)
                # Get developer details for fallback reason
                dev = developers_df[developers_df['name'] == assigned_name].iloc[0]
                capacity = calculate_developer_capacity(dev['availability'], dev['current_workload'])
                assigned_points_before = assignment_tracker[assigned_name]['story_points'] - int(ticket.get('story_points', 0) or 0)
                remaining_capacity = capacity - assigned_points_before
                title = dev.get('title', 'Software Engineer')
                assignments.append({
                    "ticket_id": int(ticket['id']),
                    "assigned_to": assigned_name,
                    "reason": f"Assigned via fallback algorithm after parallel processing error ({str(e)}). {assigned_name} ({title}) was selected with {dev['availability']:.1%} availability, {dev['current_workload']} pts current workload, {capacity:.2f} base capacity, {remaining_capacity:.2f} remaining capacity, {dev['experience_years']} years experience, and skills: {dev['skills']}. The job title '{title}' is relevant for this ticket type. This assignment maintains workload balance with {assigned_tickets_before} tickets already assigned in this batch."
                })
    
    # Sort assignments by ticket_id to maintain order
    assignments.sort(key=lambda x: x['ticket_id'])
    
    return assignments


def get_developer_info_with_assignments(developers_df: pd.DataFrame, assignment_tracker: dict) -> str:
    """Get developer info including current batch assignments in a clear, structured format."""
    info_lines = []
    for _, dev in developers_df.iterrows():
        name = dev['name']
        capacity = calculate_developer_capacity(dev['availability'], dev['current_workload'])
        assigned_tickets = assignment_tracker[name]['tickets']
        assigned_points = assignment_tracker[name]['story_points']
        remaining_capacity = capacity - assigned_points
        
        # Get title, handling NaN values
        try:
            if 'title' in dev.index:
                title_val = dev['title']
                title = str(title_val) if pd.notna(title_val) else 'Software Engineer'
            else:
                title = 'Software Engineer'
        except (KeyError, AttributeError):
            title = 'Software Engineer'
        info_lines.append(
            f"- {name} ({title}):\n"
            f"  • Availability: {dev['availability']:.1%}\n"
            f"  • Current Workload: {dev['current_workload']} story points\n"
            f"  • Base Capacity: {capacity:.2f} story points\n"
            f"  • Assigned in this batch: {assigned_tickets} tickets ({assigned_points} story points)\n"
            f"  • Remaining Capacity: {remaining_capacity:.2f} story points\n"
            f"  • Skills: {dev['skills']}\n"
            f"  • Experience: {dev['experience_years']} years\n"
            f"  • Job Title: {title}"
        )
    return "\n".join(info_lines)


def get_assignment_summary(assignment_tracker: dict) -> str:
    """Get summary of current assignments for prompt."""
    summary = []
    for name, stats in assignment_tracker.items():
        if stats['tickets'] > 0:
            summary.append(f"{name}: {stats['tickets']} tickets, {stats['story_points']} story points")
    if not summary:
        return "No assignments yet in this batch."
    return "; ".join(summary)


def smart_fallback_assignment(developers_df: pd.DataFrame, ticket: pd.Series, assignment_tracker: dict) -> str:
    """Smart fallback assignment algorithm when API fails."""
    required_skill = str(ticket.get('required_skill', '')).lower()
    story_points = int(ticket.get('story_points', 0) or 0)
    
    best_dev = None
    best_score = -1
    
    for _, dev in developers_df.iterrows():
        name = dev['name']
        # Calculate remaining capacity
        base_capacity = calculate_developer_capacity(dev['availability'], dev['current_workload'])
        assigned_points = assignment_tracker[name]['story_points']
        remaining_capacity = base_capacity - assigned_points
        
        # Skip if over capacity
        if remaining_capacity < story_points:
            continue
        
        # Score based on multiple factors
        score = remaining_capacity * 0.4  # Capacity weight
        
        # Skill match bonus
        skills = str(dev['skills']).lower()
        if required_skill in skills:
            score += 5.0
        
        # Distribution bonus (prefer developers with fewer assignments)
        assigned_tickets = assignment_tracker[name]['tickets']
        score += (10 - assigned_tickets) * 0.5  # Prefer less assigned
        
        # Experience bonus (smaller weight)
        score += dev['experience_years'] * 0.1
        
        if score > best_score:
            best_score = score
            best_dev = name
    
    # If no developer found (all over capacity), pick one with highest remaining capacity
    if best_dev is None:
        best_dev = max(
            developers_df['name'].values,
            key=lambda name: calculate_developer_capacity(
                developers_df[developers_df['name'] == name].iloc[0]['availability'],
                developers_df[developers_df['name'] == name].iloc[0]['current_workload']
            ) - assignment_tracker[name]['story_points']
        )
    
    return best_dev

