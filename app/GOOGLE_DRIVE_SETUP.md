# Google Drive OAuth setup

OAuth client credentials must never be stored inside this project or packaged
with the application.

Provide the Google OAuth desktop-client JSON using one of these external
locations:

1. Save it as `google_oauth_credentials.json` in Electron's application
   `userData` directory.
2. Set `THABIT_GOOGLE_OAUTH_CREDENTIALS` to the absolute path of the JSON file
   before starting Thabit.

The authorization token is stored separately as `google_drive_token.json` in
the application data directory. Restrict access to both files to the Windows
user running Thabit.

If credentials were previously committed or distributed with a build, delete
that OAuth client in Google Cloud Console and create a replacement. Removing
the file from the current project does not revoke an exposed secret.
