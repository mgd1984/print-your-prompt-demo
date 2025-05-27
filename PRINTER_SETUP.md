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

### 3. CIS-Specific Print Options

```json
{
  "PageSize": "13x19",
  "InputSlot": "by-pass-tray",
  "MediaType": "photographic",
  "ColorModel": "RGB",
  "cupsPrintQuality": "High",
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
  "cupsPrintQuality": "Normal",
  "CNIJInkWarning": "0",
  "printer-error-policy": "retry-current-job"
}
```

### Manual Testing

```bash
# Test basic printing
echo "USB Test - $(date)" | lp -d Canon_PRO_1000_USB -o CNIJInkWarning=0

# Check queue status
lpq -P Canon_PRO_1000_USB

# Check printer status
lpstat -p Canon_PRO_1000_USB -l
```

## Configuration Files

### Main Application
- `src/server/api/routers/printer.ts` - Main printer logic with hardcoded USB priority and CIS settings

### Print Server (Single Source of Truth)
- `printServer/config/printers.json` - **Primary printer configuration file**
- `printServer/src/printerConfig.ts` - Configuration management functions
- `printServer/src/server.ts` - Print server with enhanced printer discovery

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

### Regular Maintenance
1. Check USB connection periodically
2. Monitor print queue for stuck jobs
3. Verify CIS ink levels manually (sensors disabled)
4. Test print functionality after system updates

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

# Monitor ngrok traffic
# Visit http://localhost:4040 for ngrok web interface
```

## Configuration Files

### Main Application
- `