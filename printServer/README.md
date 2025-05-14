# Local Print Server for Print Your Prompt

This is a local print server that connects your Vercel-deployed Print Your Prompt app with your locally connected Canon Pro 1000 printer.

## Setup Instructions

1. Install dependencies:
   ```
   npm install
   ```

2. Start the server:
   ```
   npm start
   ```

3. The server will run on http://localhost:3001 by default

## How It Works

- The server exposes REST APIs for printing images
- Your Vercel-deployed app will send requests to this local server
- The local server handles printer communication using CUPS

## API Endpoints

- `GET /` - Check if the server is running
- `GET /printers` - List available printers
- `POST /print-url` - Print an image from a URL
- `POST /print-upload` - Print an uploaded image file

## Environment Variables

You can create a `.env` file to customize the server:

```
PORT=3001               # Port to run the server on
AUTH_TOKEN=your_token   # Optional security token
```

## Security Considerations

Since this server will accept connections from the internet, consider:

1. Using a reverse proxy like ngrok with basic auth
2. Implementing token-based authentication
3. Using a firewall to restrict incoming connections

## Troubleshooting

- Ensure CUPS is properly configured on your Mac
- Check that the Canon Pro 1000 is connected and powered on
- Verify printer permissions for the user running the server 