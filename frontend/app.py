import streamlit as st
import requests
import pandas as pd
import io
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime

# Page configuration
st.set_page_config(
    page_title="AI Ticket Orchestrator",
    page_icon="🎫",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for better styling
st.markdown("""
    <style>
    .main-header {
        font-size: 3rem;
        font-weight: bold;
        background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        text-align: center;
        margin-bottom: 0.5rem;
    }
    .sub-header {
        text-align: center;
        color: #666;
        margin-bottom: 2rem;
    }
    .metric-card {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 1rem;
        border-radius: 10px;
        color: white;
    }
    .stButton>button {
        width: 100%;
        background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 8px;
        padding: 0.5rem 1rem;
        font-weight: bold;
    }
    .stButton>button:hover {
        background: linear-gradient(90deg, #764ba2 0%, #667eea 100%);
        transform: scale(1.02);
    }
    </style>
""", unsafe_allow_html=True)

# Header
st.markdown('<h1 class="main-header">🎫 AI Ticket Orchestrator</h1>', unsafe_allow_html=True)
st.markdown('<p class="sub-header"><strong>AI-powered ticket assignment assistant for Product Managers</strong></p>', unsafe_allow_html=True)

# Sidebar configuration
with st.sidebar:
    st.header("⚙️ Configuration")
    api_url = st.text_input(
        "API URL",
        value="http://localhost:8000",
        help="URL of the FastAPI backend server"
    )
    
    st.markdown("---")
    st.header("ℹ️ About")
    st.markdown("""
    **How it works:**
    1. Upload a CSV file with tickets
    2. AI analyzes each ticket
    3. Assigns tickets based on:
       - Developer workload & availability
       - Skill match
       - Experience level
    4. Get transparent reasoning for each assignment
    """)
    
    st.markdown("---")
    st.markdown("**Required CSV columns:**")
    st.code("""
id
description
story_points
required_skill
    """)
    
    st.markdown("---")
    st.markdown("**Powered by:**")
    st.markdown("🤖 OpenAI GPT-4o-mini")

# Main content area
tab1, tab2 = st.tabs(["📤 Upload & Assign", "📊 View Developers"])

with tab1:
    st.markdown("### 📁 Upload Ticket CSV File")
    
    uploaded_file = st.file_uploader(
        "Choose a CSV file",
        type=['csv'],
        help="CSV file containing tickets to assign",
        label_visibility="collapsed"
    )
    
    if uploaded_file is not None:
        try:
            # Display preview
            df_preview = pd.read_csv(uploaded_file)
            
            # Show file info
            col1, col2, col3 = st.columns(3)
            with col1:
                st.metric("📄 Total Tickets", len(df_preview))
            with col2:
                total_points = df_preview['story_points'].sum() if 'story_points' in df_preview.columns else 0
                st.metric("📊 Total Story Points", total_points)
            with col3:
                unique_skills = df_preview['required_skill'].nunique() if 'required_skill' in df_preview.columns else 0
                st.metric("🛠️ Unique Skills", unique_skills)
            
            st.markdown("### 👀 File Preview")
            
            # Enhanced dataframe display
            st.dataframe(
                df_preview,
                use_container_width=True,
                hide_index=True
            )
            
            # Show skill distribution if available
            if 'required_skill' in df_preview.columns:
                st.markdown("#### 📈 Skill Distribution")
                skill_counts = df_preview['required_skill'].value_counts()
                fig_skills = px.bar(
                    x=skill_counts.index,
                    y=skill_counts.values,
                    labels={'x': 'Required Skill', 'y': 'Number of Tickets'},
                    color=skill_counts.values,
                    color_continuous_scale='viridis'
                )
                fig_skills.update_layout(showlegend=False, height=300)
                st.plotly_chart(fig_skills, use_container_width=True)
            
            # Assign button
            st.markdown("---")
            if st.button("🚀 Assign Tickets with AI", type="primary", use_container_width=True):
                with st.spinner("🤖 AI is analyzing tickets and assigning them to developers..."):
                    try:
                        # Reset file pointer
                        uploaded_file.seek(0)
                        
                        # Send request to backend
                        files = {'file': (uploaded_file.name, uploaded_file, 'text/csv')}
                        response = requests.post(f"{api_url}/assign-tickets/", files=files, timeout=300)
                        
                        if response.status_code == 200:
                            result = response.json()
                            st.success(f"✅ Successfully assigned {result['total_tickets']} tickets!")
                            
                            # Store results in session state
                            st.session_state['assignments'] = result['assignments']
                            st.session_state['tickets_df'] = df_preview
                            
                            # Display assignments
                            st.markdown("### 📋 Assignment Results")
                            
                            assignments_df = pd.DataFrame(result['assignments'])
                            
                            # Merge with original ticket data for better display
                            display_df = df_preview.merge(
                                assignments_df,
                                left_on='id',
                                right_on='ticket_id',
                                how='left'
                            )
                            
                            # Select columns to display (handle missing columns gracefully)
                            display_columns = ['id', 'assigned_to', 'reason']
                            if 'title' in display_df.columns:
                                display_columns.insert(1, 'title')
                            if 'description' in display_df.columns:
                                display_columns.append('description')
                            if 'story_points' in display_df.columns:
                                display_columns.append('story_points')
                            if 'required_skill' in display_df.columns:
                                display_columns.append('required_skill')
                            if 'priority' in display_df.columns:
                                display_columns.append('priority')
                            
                            # Filter to only existing columns
                            display_columns = [col for col in display_columns if col in display_df.columns]
                            
                            # Enhanced dataframe with expandable rows for reasons
                            for idx, row in display_df.iterrows():
                                with st.expander(f"Ticket #{int(row['id'])}: {row.get('title', row.get('description', 'N/A'))[:50]}...", expanded=False):
                                    col1, col2, col3 = st.columns(3)
                                    with col1:
                                        st.markdown(f"**Assigned To:** {row['assigned_to']}")
                                    with col2:
                                        if 'story_points' in row:
                                            st.markdown(f"**Story Points:** {int(row['story_points'])}")
                                    with col3:
                                        if 'required_skill' in row:
                                            st.markdown(f"**Skill:** {row['required_skill']}")
                                    
                                    st.markdown("**🤔 AI Reasoning:**")
                                    st.info(row['reason'])
                            
                            # Compact table view
                            st.markdown("#### 📊 Compact View")
                            st.dataframe(
                                display_df[display_columns],
                                use_container_width=True,
                                hide_index=True
                            )
                            
                            # Download results
                            csv_buffer = io.StringIO()
                            display_df.to_csv(csv_buffer, index=False)
                            st.download_button(
                                label="📥 Download Assignment Results (CSV)",
                                data=csv_buffer.getvalue(),
                                file_name=f"ticket_assignments_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
                                mime="text/csv",
                                use_container_width=True
                            )
                            
                            # Summary statistics
                            st.markdown("---")
                            st.markdown("### 📊 Assignment Summary")
                            
                            col1, col2, col3, col4 = st.columns(4)
                            
                            with col1:
                                st.metric("Total Tickets", result['total_tickets'])
                            
                            with col2:
                                unique_assignees = assignments_df['assigned_to'].nunique()
                                st.metric("Developers Assigned", unique_assignees)
                            
                            with col3:
                                if 'story_points' in df_preview.columns:
                                    total_points = df_preview['story_points'].sum()
                                    avg_workload = total_points / unique_assignees if unique_assignees > 0 else 0
                                    st.metric("Avg Workload per Dev", f"{avg_workload:.1f} pts")
                                else:
                                    avg_tickets = result['total_tickets'] / unique_assignees if unique_assignees > 0 else 0
                                    st.metric("Avg Tickets per Dev", f"{avg_tickets:.1f}")
                            
                            with col4:
                                if 'story_points' in df_preview.columns:
                                    total_points = df_preview['story_points'].sum()
                                    st.metric("Total Story Points", total_points)
                            
                            # Developer workload breakdown
                            st.markdown("#### 👥 Developer Workload Breakdown")
                            
                            # Calculate workload per developer
                            workload_data = []
                            for dev in assignments_df['assigned_to'].unique():
                                dev_tickets = assignments_df[assignments_df['assigned_to'] == dev]
                                ticket_ids = dev_tickets['ticket_id'].tolist()
                                dev_ticket_data = df_preview[df_preview['id'].isin(ticket_ids)]
                                
                                if 'story_points' in dev_ticket_data.columns:
                                    total_points = dev_ticket_data['story_points'].sum()
                                    ticket_count = len(dev_tickets)
                                    workload_data.append({
                                        'Developer': dev,
                                        'Tickets Assigned': ticket_count,
                                        'Total Story Points': total_points
                                    })
                                else:
                                    ticket_count = len(dev_tickets)
                                    workload_data.append({
                                        'Developer': dev,
                                        'Tickets Assigned': ticket_count,
                                        'Total Story Points': 0
                                    })
                            
                            workload_df = pd.DataFrame(workload_data)
                            
                            # Create visualizations
                            col1, col2 = st.columns(2)
                            
                            with col1:
                                # Tickets per developer
                                fig_tickets = px.bar(
                                    workload_df,
                                    x='Developer',
                                    y='Tickets Assigned',
                                    title='Tickets Assigned per Developer',
                                    color='Tickets Assigned',
                                    color_continuous_scale='blues'
                                )
                                fig_tickets.update_layout(showlegend=False, height=400)
                                fig_tickets.update_xaxes(tickangle=45)
                                st.plotly_chart(fig_tickets, use_container_width=True)
                            
                            with col2:
                                if workload_df['Total Story Points'].sum() > 0:
                                    # Story points per developer
                                    fig_points = px.bar(
                                        workload_df,
                                        x='Developer',
                                        y='Total Story Points',
                                        title='Story Points per Developer',
                                        color='Total Story Points',
                                        color_continuous_scale='greens'
                                    )
                                    fig_points.update_layout(showlegend=False, height=400)
                                    fig_points.update_xaxes(tickangle=45)
                                    st.plotly_chart(fig_points, use_container_width=True)
                                else:
                                    # Pie chart of ticket distribution
                                    fig_pie = px.pie(
                                        workload_df,
                                        values='Tickets Assigned',
                                        names='Developer',
                                        title='Ticket Distribution'
                                    )
                                    fig_pie.update_layout(height=400)
                                    st.plotly_chart(fig_pie, use_container_width=True)
                            
                            # Skill assignment analysis
                            if 'required_skill' in df_preview.columns:
                                st.markdown("#### 🛠️ Skill Assignment Analysis")
                                skill_assignment = display_df.groupby(['required_skill', 'assigned_to']).size().reset_index(name='count')
                                fig_skill = px.sunburst(
                                    skill_assignment,
                                    path=['required_skill', 'assigned_to'],
                                    values='count',
                                    title='Skill-to-Developer Assignment Flow'
                                )
                                fig_skill.update_layout(height=500)
                                st.plotly_chart(fig_skill, use_container_width=True)
                        
                        else:
                            error_detail = response.json().get('detail', 'Unknown error')
                            st.error(f"❌ Error: {error_detail}")
                            st.info("💡 Make sure your CSV has the required columns: id, description, story_points, required_skill")
                    
                    except requests.exceptions.ConnectionError:
                        st.error("❌ Could not connect to the API. Make sure the backend server is running.")
                        st.info(f"💡 Backend should be running at: {api_url}")
                    except requests.exceptions.Timeout:
                        st.error("⏱️ Request timed out. The AI is processing many tickets. Please try with fewer tickets or wait longer.")
                    except Exception as e:
                        st.error(f"❌ An error occurred: {str(e)}")
                        st.exception(e)
        
        except Exception as e:
            st.error(f"❌ Error reading CSV file: {str(e)}")
            st.info("💡 Make sure your file is a valid CSV with the required columns.")

    else:
        # Show sample format and instructions
        st.info("👆 **Please upload a CSV file to get started**")
        
        st.markdown("### 📝 Expected CSV Format")
        
        sample_data = {
            'id': [1, 2, 3],
            'description': [
                'Implement user authentication with JWT tokens',
                'Create responsive dashboard UI with React components',
                'Optimize database queries for user search functionality'
            ],
            'story_points': [5, 8, 3],
            'required_skill': ['Python', 'JavaScript', 'Python']
        }
        sample_df = pd.DataFrame(sample_data)
        st.dataframe(sample_df, use_container_width=True, hide_index=True)
        
        st.markdown("""
        ### 📋 CSV Requirements
        
        Your CSV file must include these columns:
        - **id**: Unique ticket identifier (integer)
        - **description**: Ticket description (text)
        - **story_points**: Story points estimate (integer)
        - **required_skill**: Required skill for this ticket (text)
        
        Optional columns (will be displayed if present):
        - **title**: Ticket title
        - **priority**: Priority level (High/Medium/Low)
        - **deadline**: Deadline date
        """)

with tab2:
    st.markdown("### 👥 Developer Information")
    st.info("💡 Developer data is loaded from `backend/data/developers.csv`")
    
    try:
        # Try to load developer data
        import sys
        from pathlib import Path
        backend_path = Path(__file__).parent.parent / 'backend'
        developers_path = backend_path / 'data' / 'developers.csv'
        
        if developers_path.exists():
            dev_df = pd.read_csv(developers_path)
            
            # Calculate capacity for each developer
            dev_df['capacity'] = dev_df['availability'] * (20 - dev_df['current_workload'])
            dev_df['availability_pct'] = (dev_df['availability'] * 100).round(1)
            
            st.dataframe(
                dev_df[['name', 'availability_pct', 'current_workload', 'capacity', 'skills', 'experience_years']],
                use_container_width=True,
                hide_index=True
            )
            
            # Visualizations
            col1, col2 = st.columns(2)
            
            with col1:
                fig_availability = px.bar(
                    dev_df,
                    x='name',
                    y='availability_pct',
                    title='Developer Availability (%)',
                    labels={'availability_pct': 'Availability %', 'name': 'Developer'},
                    color='availability_pct',
                    color_continuous_scale='greens'
                )
                fig_availability.update_layout(showlegend=False, height=400)
                fig_availability.update_xaxes(tickangle=45)
                st.plotly_chart(fig_availability, use_container_width=True)
            
            with col2:
                fig_capacity = px.bar(
                    dev_df,
                    x='name',
                    y='capacity',
                    title='Developer Capacity Score',
                    labels={'capacity': 'Capacity', 'name': 'Developer'},
                    color='capacity',
                    color_continuous_scale='blues'
                )
                fig_capacity.update_layout(showlegend=False, height=400)
                fig_capacity.update_xaxes(tickangle=45)
                st.plotly_chart(fig_capacity, use_container_width=True)
        else:
            st.warning(f"Developer CSV not found at: {developers_path}")
    except Exception as e:
        st.error(f"Could not load developer data: {str(e)}")

# Footer
st.markdown("---")
st.markdown(
    '<div style="text-align: center; color: #666;">'
    '<strong>AI Ticket Orchestrator</strong> - Powered by OpenAI GPT-4o-mini 🤖'
    '</div>',
    unsafe_allow_html=True
)
