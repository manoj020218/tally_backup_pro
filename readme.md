# TallyBackup Pro

A comprehensive backup solution for Tally.ERP 9 that provides automated backups, Google Drive synchronization, and a modern Electron-based interface.

## Features

- **Automated Backups**: Schedule full and incremental backups
- **Google Drive Integration**: Sync backups to cloud storage
- **Real-time Monitoring**: Live status updates and progress tracking
- **Compression**: Optional ZIP compression for efficient storage
- **Modern UI**: Clean, responsive interface built with React
- **Cross-platform**: Works on Windows, macOS, and Linux

## Prerequisites

- Node.js 16.x or higher
- Tally.ERP 9 installed and running
- Google Cloud Console project with Drive API enabled (for cloud sync)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/tally-backup-pro.git
cd tally-backup-pro
```

2. Install dependencies:
```bash
npm install
```

3. Build the application:
```bash
npm run build
```

4. Start the application:
```bash
npm start
```

## Configuration

### Tally Connection
- Ensure Tally.ERP 9 is running with HTTP server enabled
- Default port: 9000 (configurable in settings)
- Company name must match exactly as in Tally

### Google Drive Setup
1. Create a Google Cloud Console project
2. Enable Google Drive API
3. Create OAuth 2.0 credentials
4. Download `credentials.json` and place in project root
5. Run initial authentication to generate tokens

### Backup Profiles
Create backup profiles with:
- Profile name and Tally company
- Backup type (Full/Incremental)
- Schedule (Hourly/Daily/Weekly/Manual)
- Local storage path
- Compression settings

## Usage

### Creating Backup Profiles
1. Navigate to "Backup Profiles" section
2. Click "Add Profile"
3. Fill in profile details
4. Save and activate the profile

### Running Backups
- **Manual**: Click "Run Backup" on any profile
- **Scheduled**: Backups run automatically based on schedule
- **Monitor**: View progress in real-time dashboard

### Google Drive Sync
- Enable auto-sync in settings
- Authenticate with Google account
- Specify target folder ID
- Backups automatically upload after completion

## Development

### Project Structure
```
tally-backup-pro/
├── main/                 # Electron main process
│   ├── index.js         # Main entry point
│   ├── preload.js       # Preload script
│   ├── ipc-handlers.js  # IPC communication
│   ├── db/              # Database layer
│   ├── backup/          # Backup engine
│   ├── tally/           # Tally integration
│   └── sync/            # Google Drive sync
├── renderer/            # React frontend
│   ├── components/      # Reusable components
│   ├── screens/         # Main screens
│   ├── hooks/           # Custom React hooks
│   └── store/           # State management
├── tests/               # Test suites
├── shared/              # Shared utilities
└── assets/              # Static assets
```

### Running Tests
```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# All tests
npm test
```

### Building for Production
```bash
# Development build
npm run build:dev

# Production build
npm run build

# Create distributables
npm run dist
```

## API Reference

### IPC Events

#### Main → Renderer
- `backup-progress`: Backup progress updates
- `backup-complete`: Backup completion status
- `tally-status`: Tally connection status
- `gdrive-status`: Google Drive connection status

#### Renderer → Main
- `run-backup`: Trigger manual backup
- `get-settings`: Retrieve application settings
- `update-settings`: Update application settings
- `get-profiles`: Get backup profiles
- `create-profile`: Create new backup profile

### Database Schema

#### backup_profiles
- id (INTEGER PRIMARY KEY)
- name (TEXT)
- tally_company (TEXT)
- backup_type (TEXT)
- schedule (TEXT)
- is_active (INTEGER)
- local_path (TEXT)
- compression (INTEGER)
- created_at (TEXT)

#### backup_history
- id (INTEGER PRIMARY KEY)
- profile_id (INTEGER)
- profile_name (TEXT)
- backup_type (TEXT)
- status (TEXT)
- started_at (TEXT)
- completed_at (TEXT)
- file_size (INTEGER)
- file_path (TEXT)
- log_file (TEXT)

#### settings
- key (TEXT PRIMARY KEY)
- value (TEXT)

## Troubleshooting

### Common Issues

1. **Tally Connection Failed**
   - Verify Tally is running with HTTP server
   - Check port configuration (default: 9000)
   - Ensure firewall allows connections

2. **Google Drive Authentication**
   - Verify credentials.json is present
   - Check OAuth consent screen configuration
   - Ensure Drive API is enabled

3. **Backup Failures**
   - Check file system permissions
   - Verify sufficient disk space
   - Review backup logs for detailed errors

### Logs
- Application logs: `%APPDATA%/tally-backup-pro/logs/`
- Backup logs: Stored with backup files
- Debug mode: Set `DEBUG=tally-backup-pro` environment variable

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Submit pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue on GitHub
- Check the troubleshooting section
- Review application logs

## Changelog

### v1.0.0
- Initial release
- Basic backup functionality
- Google Drive integration
- Electron UI
- Automated scheduling