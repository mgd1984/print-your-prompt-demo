import { discoverPrinters, findBestPrinter, loadPrinterConfig } from './printerConfig';
import { exec } from 'child_process';

async function testPrinter() {
  console.log('Testing printer configuration...');
  
  // Load the config
  const config = loadPrinterConfig();
  console.log('Loaded configuration:');
  console.log('Default printer:', config.defaultPrinterName);
  console.log('Configured printers:', config.printers.map(p => p.name).join(', '));
  
  // Discover available printers
  console.log('\nDiscovering printers...');
  const printers = await discoverPrinters();
  
  if (printers.length === 0) {
    console.error('No printers found!');
    return;
  }
  
  console.log(`Found ${printers.length} printer(s):`, printers.join(', '));
  
  // Find the best printer
  console.log('\nFinding best printer match...');
  const bestPrinter = findBestPrinter(printers, config);
  
  if (!bestPrinter) {
    console.error('No matching printer found!');
    return;
  }
  
  console.log(`Selected printer: ${bestPrinter.printer}`);
  console.log('Options:', JSON.stringify(bestPrinter.options, null, 2));
  
  // Test printing
  console.log('\nPrinting a test page...');
  exec(`echo "Test print from config" > test.txt && lp -d ${bestPrinter.printer} test.txt`, (err, stdout, stderr) => {
    if (err) {
      console.error('Error printing test page:', err);
      return;
    }
    
    console.log('Test print sent to printer!');
    console.log(stdout);
  });
}

testPrinter().catch(console.error); 