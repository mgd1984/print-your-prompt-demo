import fs from 'fs';
import path from 'path';
import type { PrintParams } from 'node-cups';
import { exec } from 'child_process';

// Types
export interface PrinterConfig {
  name: string;
  displayName: string;
  options: Record<string, string>;
  priority: number; // Higher number = higher priority
}

export interface PrinterConfigFile {
  version: string;
  lastUpdated: string;
  defaultPrinterName?: string;
  printers: PrinterConfig[];
}

// Default configuration
const defaultConfig: PrinterConfigFile = {
  version: '1.0',
  lastUpdated: new Date().toISOString(),
  defaultPrinterName: "Canon_PRO_1000_USB",
  printers: [
    {
      name: "Canon_PRO_1000_USB",
      displayName: "Canon Pro 1000 (Direct USB)",
      priority: 200,
      options: {
        "PageSize": "13x19",
        "InputSlot": "by-pass-tray",
        "MediaType": "photographic",
        "ColorModel": "RGB",
        "cupsPrintQuality": "High",
        "CNIJInkWarning": "0",
        "CNIJInkCartridgeSettings": "0"
      }
    },
    {
      name: "Canon_PRO_1000_series_3",
      displayName: "Canon Pro 1000 (USB Fallback)",
      priority: 100,
      options: {
        "PageSize": "13x19", 
        "InputSlot": "by-pass-tray",
        "MediaType": "photographic",
        "ColorModel": "RGB",
        "cupsPrintQuality": "High",
        "CNIJInkWarning": "0"
      }
    },
    {
      name: "default",
      displayName: "Default Printer",
      priority: 10,
      options: {
        "PageSize": "Letter",
        "InputSlot": "Auto",
        "MediaType": "Auto",
        "ColorModel": "RGB",
        "cupsPrintQuality": "Normal"
      }
    }
  ]
};

// File paths - use absolute paths and the main config file
const CONFIG_DIR = path.join(process.cwd(), 'config');
const CONFIG_FILE = path.join(CONFIG_DIR, 'printers.json');

console.log('Using config file:', CONFIG_FILE);

// Ensure config directory exists
if (!fs.existsSync(CONFIG_DIR)) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

// Create default config if it doesn't exist
if (!fs.existsSync(CONFIG_FILE)) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2));
  console.log(`Created default printer configuration at ${CONFIG_FILE}`);
}

// Load configuration
export function loadPrinterConfig(): PrinterConfigFile {
  try {
    const configStr = fs.readFileSync(CONFIG_FILE, 'utf-8');
    return JSON.parse(configStr) as PrinterConfigFile;
  } catch (error) {
    console.error('Error loading printer configuration:', error);
    console.log('Using default configuration');
    return defaultConfig;
  }
}

// Save configuration
export function savePrinterConfig(config: PrinterConfigFile): void {
  try {
    config.lastUpdated = new Date().toISOString();
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    console.log(`Saved printer configuration to ${CONFIG_FILE}`);
  } catch (error) {
    console.error('Error saving printer configuration:', error);
  }
}

// Find the best matching printer from available printers
export function findBestPrinter(
  availablePrinters: string[], 
  config: PrinterConfigFile = loadPrinterConfig()
): { printer: string; options: Record<string, string> } | null {
  console.log('Available printers:', availablePrinters);
  console.log('Configured printers:', config.printers.map(p => p.name));
  
  // If the default printer is available, use it
  if (config.defaultPrinterName && availablePrinters.includes(config.defaultPrinterName)) {
    const printerConfig = config.printers.find(p => p.name === config.defaultPrinterName);
    if (printerConfig) {
      console.log(`Using default printer: ${config.defaultPrinterName}`);
      return {
        printer: config.defaultPrinterName,
        options: printerConfig.options
      };
    }
  }
  
  // Try to find an exact match
  for (const printer of availablePrinters) {
    const printerConfig = config.printers.find(p => p.name === printer);
    if (printerConfig) {
      console.log(`Found exact match for printer: ${printer}`);
      return {
        printer: printer,
        options: printerConfig.options
      };
    }
  }
  
  // If we have printers but no matches in our config, use the first available
  if (availablePrinters.length > 0) {
    console.log(`No configured printers found. Using first available: ${availablePrinters[0]}`);
    
    // Try to find a generic configuration
    const genericConfig = config.printers.find(p => p.name === 'default' || p.name === 'generic');
    
    return {
      printer: availablePrinters[0],
      options: genericConfig ? genericConfig.options : {}
    };
  }
  
  // No printers available
  console.error('No printers available on the system');
  return null;
}

// Get print params for a printer
export function getPrintParams(printerName: string, config: PrinterConfigFile = loadPrinterConfig()): PrintParams | null {
  const printerConfig = config.printers.find(p => p.name === printerName);
  
  if (!printerConfig) {
    console.log(`No configuration found for printer: ${printerName}`);
    return null;
  }
  
  return {
    printer: printerName,
    printerOptions: printerConfig.options
  };
}

// Add a new printer configuration or update an existing one
export function updatePrinterConfig(printerConfig: PrinterConfig): void {
  const config = loadPrinterConfig();
  
  // Find if this printer already exists
  const existingIndex = config.printers.findIndex(p => p.name === printerConfig.name);
  
  if (existingIndex >= 0) {
    // Update existing
    config.printers[existingIndex] = printerConfig;
  } else {
    // Add new
    config.printers.push(printerConfig);
  }
  
  savePrinterConfig(config);
}

// Export the default configuration for use in initialization
export const defaultPrinterConfig = defaultConfig;

// Discover available printers
export function discoverPrinters(): Promise<string[]> {
  return new Promise((resolve, reject) => {
    console.log('Discovering printers...');
    exec('lpstat -v', (err, stdout, stderr) => {
      if (err) {
        console.error('Error running lpstat -v:', err);
        return resolve([]);
      }
      
      if (!stdout.trim()) {
        console.log('No printers found via lpstat -v');
        return resolve([]);
      }
      
      // Parse lpstat -v output to get printer names
      const printers = stdout
        .trim()
        .split('\n')
        .map(line => {
          const match = line.match(/device for ([^:]+):/);
          return match ? match[1].trim() : null;
        })
        .filter(Boolean) as string[];
      
      console.log('Found printers:', printers);
      return resolve(printers);
    });
  });
}

// Add a printer to the system (requires root/admin privileges)
export function addNetworkPrinter(name: string, uri: string, model: string = 'generic'): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const command = `lpadmin -p ${name} -E -v ${uri} -m ${model}`;
    console.log(`Attempting to add printer with command: ${command}`);
    
    exec(command, (err, stdout, stderr) => {
      if (err) {
        console.error('Error adding printer:', stderr);
        reject(new Error(`Failed to add printer: ${stderr}`));
        return;
      }
      
      console.log(`Printer ${name} added successfully`);
      resolve(true);
    });
  });
}

// Helper function to check if CUPS is installed and running
export function checkCupsStatus(): Promise<{ installed: boolean; running: boolean }> {
  return new Promise((resolve) => {
    exec('which cupsd && systemctl status cups 2>/dev/null || launchctl list | grep cups', (err, stdout) => {
      const installed = !err;
      const running = installed && stdout.includes('running');
      
      resolve({ installed, running });
    });
  });
} 