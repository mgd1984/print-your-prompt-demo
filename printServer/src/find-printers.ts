import { discoverPrinters, checkCupsStatus, addNetworkPrinter } from './printerConfig';

async function main() {
  console.log('Checking CUPS status...');
  const cupsStatus = await checkCupsStatus();
  
  if (!cupsStatus.installed) {
    console.error('CUPS is not installed. Please install CUPS:');
    console.error('  macOS: Already installed but might need configuration');
    console.error('  Ubuntu/Debian: sudo apt install cups');
    console.error('  Fedora/RHEL: sudo dnf install cups');
    process.exit(1);
  }
  
  if (!cupsStatus.running) {
    console.error('CUPS is installed but not running. Please start CUPS:');
    console.error('  macOS: sudo launchctl load -w /System/Library/LaunchDaemons/org.cups.cupsd.plist');
    console.error('  Linux: sudo systemctl start cups');
    process.exit(1);
  }
  
  console.log('CUPS is installed and running. Searching for printers...');
  
  try {
    const printers = await discoverPrinters();
    
    if (printers.length === 0) {
      console.log('No printers found. You may need to add them manually.');
      console.log('Use one of these methods:');
      console.log('1. System Settings/Preferences > Printers > Add Printer');
      console.log('2. CUPS Web interface: http://localhost:631/admin');
      console.log('3. Command line:');
      console.log('   For a network printer: lpadmin -p PrinterName -E -v ipp://printer-ip/ipp/print -m everywhere');
      console.log('   For a USB printer: lpadmin -p PrinterName -E -v usb://make/model?serial=number -m everywhere');
      console.log('\nIf using a Canon PRO-1000, it may require Canon drivers to be installed first.');
    } else {
      console.log('Found printers:', printers);
      console.log('\nTo verify if these printers are working, run:');
      console.log('lpstat -v');
      console.log('\nTo print a test page to a printer:');
      console.log('lp -d PRINTER_NAME /etc/passwd');
    }
    
    // Additional help for network discovery
    console.log('\n--- Additional Network Printer Discovery ---');
    console.log('To find more network printers, try these commands:');
    console.log('1. arp -a                     # Shows all devices on local network');
    console.log('2. nmap -p 9100 192.168.1.0/24  # Scan for printers on port 9100 (replace IP range)');
    console.log('3. avahi-browse -at            # List all Bonjour/mDNS services');
    
  } catch (error) {
    console.error('Error discovering printers:', error);
  }
}

main(); 