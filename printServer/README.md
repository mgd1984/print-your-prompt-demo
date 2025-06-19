# Print Server for Print Your Prompt

A local print server that bridges your deployed Print Your Prompt app with a locally connected printer.

## Why This Exists

When your main app is deployed to **Vercel** (or any cloud platform) but your **Canon PRO-1000 printer is local**, you need a way to connect them. This print server runs locally and creates a secure tunnel (via ngrok) that your cloud app can send print jobs to.

**Architecture**: `Vercel App → ngrok tunnel → Local Print Server → USB → Canon PRO-1000`

## Quick Setup

1. **Install dependencies**:
   ```bash
   cd printServer
   pnpm install
   ```

2. **Start the server**:
   ```bash
   pnpm start
   ```
   Server runs on `http://localhost:3001`

3. **Create ngrok tunnel** (for production):
   ```bash
   # Install ngrok if you haven't already
   npm install -g ngrok
   
   # Create tunnel to your print server
   ngrok http 3001
   ```

4. **Update your main app's environment variables**:
   ```env
   PRINT_SERVER_URL=https://your-ngrok-url.ngrok.io
   PRINT_SERVER_TOKEN=your-secret-token
   ```

## API Endpoints

### `GET /`
Health check - returns server status

### `GET /printers`
List all available printers detected by CUPS

### `GET /media-settings`
Get available media types, page sizes, and print profiles

### `POST /print-url`
Print an image from a URL
```json
{
  "imageUrl": "https://example.com/image.jpg",
  "profile": "photo_glossy"  // optional
}
```

### `POST /print-with-settings`
Print with custom settings
```json
{
  "imageUrl": "https://example.com/image.jpg",
  "customSettings": {
    "CNIJMediaType": "51",
    "PageSize": "13x19",
    "CNIJPrintQuality": "15"
  }
}
```

### `POST /print-upload`
Print an uploaded image file (multipart/form-data)

## Configuration

The print server uses `config/printers.json` for printer settings. This file includes:

- **Media Types**: Different paper types (glossy, matte, fine art)
- **Print Profiles**: Pre-configured settings for common use cases
- **Printer Priorities**: Which printer to use first
- **Canon PRO-1000 CIS Settings**: Special options for Continuous Ink Systems

### Canon PRO-1000 CIS Configuration

The server includes special handling for Canon PRO-1000 printers with CIS (Continuous Ink System):

```json
{
  "CNIJInkWarning": "0",           // Disable ink level warnings
  "CNIJInkCartridgeSettings": "0", // Bypass cartridge detection
  "PageSize": "13x19",             // Optimal large format
  "CNIJPrintQuality": "10"         // High quality default
}
```

## Environment Variables

Create a `.env` file in the `printServer` directory:

```env
PORT=3001                    # Port to run the server on
AUTH_TOKEN=your_secret_token # Optional: Secure your print server
CUPS_USER=your_cups_user     # Optional: CUPS authentication
CUPS_PASSWORD=your_cups_pass # Optional: CUPS authentication
```

## Security Considerations

Since this server accepts connections from the internet via ngrok:

1. **Use authentication**: Set `AUTH_TOKEN` in your `.env` file
2. **Firewall**: Consider restricting incoming connections
3. **ngrok auth**: Use ngrok's built-in authentication features
4. **Monitor logs**: Keep an eye on print server logs for suspicious activity

## Troubleshooting

### "Printer in Use" Errors
Common with Canon printers + CIS systems. The server includes automatic workarounds:
- Job queue clearing
- Retry logic with minimal settings
- Force completion commands

### Printer Not Detected
```bash
# Check CUPS configuration
lpstat -p

# Verify USB connection
system_profiler SPUSBDataType | grep -i canon

# Test direct printing
lp -d Canon_PRO_1000_USB /path/to/test/image.jpg
```

### ngrok Connection Issues
```bash
# Check ngrok status
curl https://your-ngrok-url.ngrok.io/

# Verify tunnel is active
ngrok http 3001 --log stdout
```

## Development

The print server is built with:
- **Node.js + TypeScript**
- **Express.js** for HTTP server
- **node-cups** for CUPS integration
- **Sharp** for image processing

### Adding New Printer Support

1. Add printer configuration to `config/printers.json`
2. Update `src/printerConfig.ts` if needed
3. Test with your specific printer model
4. Submit a pull request!

### File Structure

```
printServer/
├── src/
│   ├── server.ts           # Main Express server
│   ├── printerConfig.ts    # Configuration management
│   ├── find-printers.ts    # Printer discovery
│   └── types/              # TypeScript definitions
├── config/
│   └── printers.json       # Printer configurations
├── uploads/                # Temporary image storage
└── package.json
```

## Contributing

Found a bug? Want to add support for other printers? PRs welcome!

1. Fork the main repo
2. Make your changes in the `printServer/` directory
3. Test with your printer setup
4. Submit a pull request

## License

MIT License - same as the main project 