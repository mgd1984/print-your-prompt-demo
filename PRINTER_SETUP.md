# Canon PRO-1000 USB Printer Setup Guide

This document provides comprehensive setup instructions for the Canon PRO-1000 printer with Continuous Ink System (CIS) and precision color sensors.

## Hardware Setup

### Canon PRO-1000 with CIS Configuration
- **Printer**: Canon PRO-1000 series
- **Connection**: USB (prioritized over network)
- **Ink System**: Continuous Ink System (CIS) with precision color sensors

### USB Connection Verification

```bash
# Check USB connection
system_profiler SPUSBDataType | grep -A 10 -B 5 -i canon

# Verify printer detection
lpinfo -v | grep -i usb
```

## Software Configuration

### 1. Printer Installation

The USB printer is automatically added with:

```bash
lpadmin -p Canon_PRO_1000_USB -E -v "usb://Canon/PRO-1000%20series?serial=204CBD" -m "Library/Printers/PPDs/Contents/Resources/CanonIJPRO1000series.ppd.gz"
```

### 2. Printer Priority Configuration

The system uses this priority order:

1. **Canon_PRO_1000_USB** (Direct USB - most reliable for CIS)
2. _192_168_2_240 (Auto-discovered IP)
3. Canon_PRO_1000_Ethernet (Ethernet connection)
4. Canon_PRO_1000_series (Network printer)
5. Canon_PRO_1000_series_2/3 (USB/IPP backups)

### 3. Media Settings Configuration

The system now supports detailed media settings configuration through both the web interface and the print server configuration file.

#### Available Media Types

The Canon PRO-1000 uses numeric codes for media types:

```json
{
  "photographic_glossy": {
    "displayName": "Photographic Glossy",
    "CNIJMediaType": "51",
    "description": "High-quality glossy photo paper (default)"
  },
  "photographic_semigloss": {
    "displayName": "Photographic Semi-Gloss", 
    "CNIJMediaType": "50",
    "description": "Semi-gloss photo paper"
  },
  "matte_photo": {
    "displayName": "Matte Photo Paper",
    "CNIJMediaType": "28",
    "description": "Matte finish photo paper"
  },
  "fine_art": {
    "displayName": "Fine Art Paper",
    "CNIJMediaType": "63",
    "description": "Fine art/canvas paper"
  },
  "plain_paper": {
    "displayName": "Plain Paper",
    "CNIJMediaType": "0",
    "description": "Standard plain paper"
  }
}
```

#### Print Profiles

Pre-configured profiles for common use cases:

- **Photo - Glossy Paper**: 13x19", Glossy media, Highest quality, RGB16
- **Photo - Matte Paper**: 13x19", Matte media, Highest quality, RGB16  
- **Fine Art Print**: 13x19", Fine art media, Maximum quality, RGB16, Unidirectional
- **Draft/Test Print**: Letter size, Plain paper, Draft quality, RGB

#### Paper Source Settings

Canon PRO-1000 has two paper loading options with specific CUPS codes:

- **Top Feed** (`CNIJMediaSupply: "7"`): Main paper slot, handles up to 300g/m²
- **Manual Feed Tray** (`CNIJMediaSupply: "38"`): Rear slot, handles up to 400g/m² for thick papers

#### Quality Settings

Available quality levels with Canon numeric codes:

- **Draft** (`CNIJPrintQuality: "0"`): Fast, draft quality
- **Standard** (`CNIJPrintQuality: "5"`): Standard quality
- **High** (`CNIJPrintQuality: "10"`): High quality (default)
- **Highest** (`CNIJPrintQuality: "15"`): Highest quality
- **Maximum** (`CNIJPrintQuality: "20"`): Maximum quality (slowest)

### 4. Using Media Settings

#### Web Interface

The web application now includes a Print Settings Panel that allows you to:

1. **Select Print Profiles**: Choose from pre-configured profiles optimized for different media types
2. **Custom Settings**: Manually select media type, page size, and quality
3. **File Quality**: Choose between TIFF (maximum quality) or JPEG (faster processing)

#### API Endpoints

For programmatic access:

```bash
# Get available media settings
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-ngrok-url.ngrok.io/media-settings

# Print with specific profile
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"imageUrl": "https://example.com/image.jpg", "profile": "photo_glossy"}' \
  https://your-ngrok-url.ngrok.io/print-with-settings

# Print with custom settings
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://example.com/image.jpg",
    "customSettings": {
      "CNIJMediaType": "28",
      "PageSize": "8x10",
      "CNIJPrintQuality": "20"
    }
  }' \
  https://your-ngrok-url.ngrok.io/print-with-settings
```

### 5. CIS-Specific Print Options

```json
{
  "PageSize": "13x19",
  "CNIJMediaSupply": "7",
  "CNIJMediaType": "51",
  "ColorModel": "RGB",
  "CNIJPrintQuality": "10",
  "CNIJInkWarning": "0",
  "CNIJInkCartridgeSettings": "0"
}
```

**Key CIS Options:**
- `CNIJInkWarning: "0"` - Disables ink level warnings for modified tanks
- `CNIJInkCartridgeSettings: "0"` - Bypasses cartridge detection sensors
- `PageSize: "13x19"` - Valid large format (avoids A3plus issues)
- `ColorModel: "RGB"` - Standard RGB (not RGB16 which triggers sensors)

## Troubleshooting

### "Printer in Use" Errors

This is common with CIS systems due to precision sensor conflicts. The system includes automatic workarounds:

#### 1. Automatic Job Clearing
```bash
# Check for stuck jobs
lpq -P Canon_PRO_1000_USB

# Clear if needed (done automatically)
cancel -a Canon_PRO_1000_USB
```

#### 2. Force Completion Commands
Applied automatically when Canon printers are detected:
```bash
cupsenable Canon_PRO_1000_USB
cupsaccept Canon_PRO_1000_USB
lpadmin -p Canon_PRO_1000_USB -o printer-error-policy=retry-job
```

#### 3. Force Print Mode
If normal printing fails, the system retries with minimal options:
```json
{
  "PageSize": "Letter",
  "ColorModel": "RGB",
  "CNIJPrintQuality": "5",
  "CNIJInkWarning": "0",
  "printer-error-policy": "retry-current-job"
}
```

### Manual Testing

```bash
# Test with specific media settings
echo "USB Test - $(date)" | lp -d Canon_PRO_1000_USB \
  -o CNIJMediaType=51 \
  -o CNIJPrintQuality=10 \
  -o PageSize=13x19 \
  -o CNIJInkWarning=0

# Check queue status
lpq -P Canon_PRO_1000_USB

# Check printer status
lpstat -p Canon_PRO_1000_USB -l
```

### Media Type Troubleshooting

If you're getting media-related errors:

1. **Check Available Media Types**:
   ```bash
   lpoptions -p Canon_PRO_1000_USB -l | grep CNIJMediaType
   ```

2. **Test with Plain Paper**:
   ```bash
   lp -d Canon_PRO_1000_USB -o CNIJMediaType=0 -o CNIJInkWarning=0 /etc/passwd
   ```

3. **Verify Paper is Loaded**: Ensure the correct paper type is loaded in the appropriate paper source (Top Feed or Manual Feed Tray)

## Configuration Files

### Main Application
- `src/server/api/routers/printer.ts` - Main printer logic with hardcoded USB priority and CIS settings
- `src/app/_components/print-settings-panel.tsx` - Web interface for media settings

### Print Server (Single Source of Truth)
- `printServer/config/printers.json` - **Primary printer configuration file** with media settings
- `printServer/src/printerConfig.ts` - Configuration management functions with TypeScript types
- `printServer/src/server.ts` - Print server with media settings endpoints

**Architecture Note**: The main application has printer settings hardcoded for maximum reliability with your specific CIS setup, while the print server uses the configuration file for flexibility when running as a standalone service.

## Why USB Over Network?

1. **Direct Communication**: Bypasses network protocol layers that can interfere with sensor communication
2. **Reduced Latency**: No network delays that might trigger timeout errors
3. **Stable Connection**: USB provides consistent data flow for sensor-heavy operations
4. **Less Driver Complexity**: Direct USB often has fewer Canon-specific protocol layers
5. **CIS Compatibility**: Better handling of modified ink tank sensors

## Monitoring and Maintenance

### Log Monitoring
The system logs all printer operations with detailed debugging:
- Printer selection logic
- CIS workaround application
- Job monitoring and recovery
- Fallback printer attempts
- Media settings application

### Regular Maintenance
1. Check USB connection periodically
2. Monitor print queue for stuck jobs
3. Verify CIS ink levels manually (sensors disabled)
4. Test print functionality after system updates
5. Verify media settings match loaded paper type

## Emergency Procedures

If all automatic recovery fails:

1. **Manual Job Clearing**:
   ```bash
   cancel -a Canon_PRO_1000_USB
   cupsenable Canon_PRO_1000_USB
   ```

2. **Printer Reset**:
   ```bash
   cupsdisable Canon_PRO_1000_USB
   cupsenable Canon_PRO_1000_USB
   ```

3. **USB Reconnection**:
   - Unplug USB cable
   - Wait 10 seconds
   - Reconnect USB cable
   - Check with `lpstat -p Canon_PRO_1000_USB`

4. **Last Resort - Re-add Printer**:
   ```bash
   lpadmin -x Canon_PRO_1000_USB
   lpadmin -p Canon_PRO_1000_USB -E -v "usb://Canon/PRO-1000%20series?serial=204CBD" -m "Library/Printers/PPDs/Contents/Resources/CanonIJPRO1000series.ppd.gz"
   ```

## Production Deployment with ngrok

When your app is deployed to **Vercel** but your Canon PRO-1000 is **local**, you need ngrok to bridge the connection.

### ngrok Setup

1. **Install ngrok**:
   ```bash
   npm install -g ngrok
   # or download from https://ngrok.com/download
   ```

2. **Get ngrok auth token**:
   - Sign up at https://ngrok.com
   - Copy your auth token from the dashboard

3. **Configure ngrok**:
   ```bash
   ngrok authtoken YOUR_NGROK_TOKEN
   ```

4. **Start the tunnel**:
   ```bash
   # Start your print server first
   cd printServer && pnpm start
   
   # In another terminal, create the tunnel
   ngrok http 3001
   ```

5. **Configure Vercel environment**:
   ```env
   PRINT_SERVER_URL=https://abc123.ngrok.io
   PRINT_SERVER_TOKEN=your-secret-token
   ```

### Security Considerations

- **Authentication**: Always use `PRINT_SERVER_TOKEN` for security
- **Firewall**: ngrok handles secure tunneling automatically
- **Monitoring**: Check ngrok dashboard for connection logs

### Troubleshooting ngrok

```bash
# Check ngrok status
curl https://your-ngrok-url.ngrok.io/health

# Test printer endpoint
curl https://your-ngrok-url.ngrok.io/printers \
  -H "Authorization: Bearer your-token"

# Test media settings endpoint
curl https://your-ngrok-url.ngrok.io/media-settings \
  -H "Authorization: Bearer your-token"

# Monitor ngrok traffic
# Visit http://localhost:4040 for ngrok web interface
```

## Summary

Your Canon PRO-1000 setup now supports:

✅ **USB-prioritized connection** for CIS reliability  
✅ **Automatic media type detection** with numeric codes  
✅ **Pre-configured print profiles** for common use cases  
✅ **Custom media settings** via web interface and API  
✅ **Quality level selection** from draft to maximum  
✅ **CIS-specific workarounds** for sensor conflicts  
✅ **Production deployment** via ngrok tunnel  

The system automatically handles the complexity of Canon's numeric media codes while providing an intuitive interface for selecting paper types and quality settings.