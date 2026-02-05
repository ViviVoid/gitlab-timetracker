# GitLab Time Tracker Dashboard

A beautiful, interactive dashboard for visualizing GitLab time tracking data across your project.

## Features

### Data Visualization
- **Cumulative Time Chart** - Interactive line chart showing cumulative hours over time per team member
- **Team Member Statistics** - Sortable table showing hours and PBI count per person
- **PBI (Issue) Tracking** - Hours logged per issue with contributor information
- **Progress Bars** - Visual representation of relative time spent

### Time Entry Details
- **Time Entry Summaries** - Display comments/descriptions from time logs
- **Negative Entry Support** - Properly handles subtracted/deleted time with visual indicators (red highlighting)
- **Entry Breakdown** - Click any team member to see all their time entries with dates, issues, and comments
- **Pagination Support** - Loads all issues and all notes (no 100-item limits)

### Filtering & Search
- **Date Range Filtering** - Filter time entries by start and end date (default: last 30 days)
- **Milestone Filtering** - Filter by project milestone with automatic date range detection
- **Mutually Exclusive Filters** - Choose between date range OR milestone filtering
- **Advanced Project Browser** - Multi-criteria search for projects with filtering options:
  - Starred projects
  - Projects where you're a member
  - Projects you own
  - Archived/inactive projects
  - Text search by name or path
  - Select All / Clear All shortcuts

### User Interface
- **Modern, Responsive Design** - Works on desktop and mobile devices
- **Auto-loading Configuration** - Load credentials from .env file automatically
- **Progress Indicators** - Shows loading progress when fetching large datasets
- **Error Handling** - Clear error messages for troubleshooting
- **Single File Application** - Entire app in one HTML file for easy deployment

## Quick Start

### Option 1: Manual entry (Recommended)

1. Open `gitlab-time-dashboard.html` directly in your browser
2. Enter your GitLab URL, access token, and project ID manually
3. Click "Load Data"

### Option 2: Auto-load credentials from .env file (Debugging / Development)

1. Create a `.env` file in the project root (it's already gitignored):
   ```env
   TARGET_API_KEY=your_gitlab_access_token
   TARGET_LINK=https://gitlab.com
   TARGET_PROJECT_ID=your_project_id
   ```

2. Start the local server:
   ```bash
   python3 serve.py
   ```

3. Open your browser to: http://localhost:8000/gitlab-time-dashboard.html

4. The credentials will auto-load! Just click "Load Data"

## GitLab Access Token Setup

Your GitLab access token needs the following scopes:
- `read_api` - Read access to the API
- `read_repository` - Read access to the repository (optional but recommended)

To create a token:
1. Go to GitLab -> Preferences -> Access Tokens
2. Create a personal access token with the scopes above
3. Copy the token to your `.env` file or enter it manually

## How It Works

The dashboard fetches:
- All issues from your project
- All time tracking entries (timelogs) with their summaries
- Time statistics for each issue

Time entries include:
- Date the time was logged
- Hours spent
- Issue/PBI reference
- **Summary/description** (if provided when logging time)

## Time Entry Summaries

When team members log time in GitLab with a description, it will appear in the dashboard:

```
# In GitLab issue:
/spend 2h Fixed authentication bug
```

This description will show up when you click on the team member in the dashboard!

## Filtering Options

### Date Range Filtering
- Default range: Last 30 days
- Adjustable via the "Start Date" and "End Date" filters
- All charts and statistics update based on the selected range

### Milestone Filtering
- Filter time entries by project milestone
- Select "Milestone" from the "Filter By" dropdown
- Choose a milestone from the list
- Shows time entries that fall within the milestone's date range
- **Note:** Milestone and date range filtering are mutually exclusive

## Project Browser

Can't remember your project ID? Use the **Browse Projects** button with advanced filtering!

### Features:
1. **Multiple Filter Options** (check/uncheck combinations):
   - **Starred** - Projects you've starred
   - **My Projects** - Projects where you're a member
   - **Owned by Me** - Projects you own
   - **Archived** - Inactive/archived projects

2. **Search Bar** - Filter results by project name or path (press Enter to search)

3. **Smart Display**:
   - Shows project name with visual badges for starred and archived projects
   - Full project path
   - Project ID
   - Results count
   - Sorted by last activity

### How to Use:
1. Enter your GitLab URL and Access Token
2. Click "Browse Projects"
3. Select your filter options (multiple can be selected)
4. Optionally, type in the search bar
5. Click "Search Projects" or press Enter
6. Click on a project to auto-fill the Project ID field

## Project Structure

```
gitlab-timetracker/
├── gitlab-time-dashboard.html  # Main application (single file)
├── serve.py                     # Python server for local development
├── .env                         # Your credentials (gitignored)
├── .gitignore                   # Protects .env from being committed
└── README.md                    # This file
```

## Troubleshooting

### "No .env file found or could not be loaded"
- This is normal if opening the HTML file directly
- Use `python3 serve.py` to enable .env auto-loading

### "Failed to fetch issues: 401"
- Check that your access token is correct
- Verify the token has `read_api` scope

### "Failed to fetch issues: 404"
- Verify your project ID is correct
- Ensure you have access to the project

## License

See [LICENSE.md](LICENSE.md) for details.
