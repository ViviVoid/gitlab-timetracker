# GitLab Time Tracker Dashboard

A beautiful, interactive dashboard for visualizing GitLab time tracking data across your project.

## Features

- **Cumulative time tracking chart** showing hours over time per team member
- **Team member statistics** with detailed time entry breakdowns
- **PBI (Issue) tracking** showing hours logged per issue
- **Time entry summaries** display comments/descriptions from each time log
- **Date filtering** to view time entries for specific date ranges

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
1. Go to GitLab → Preferences → Access Tokens
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

## Date Filtering

- Default range: Last 30 days
- Adjustable via the "Start Date" and "End Date" filters
- All charts and statistics update based on the selected range

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
