import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { printFile, getPrinterNames } from 'node-cups';
import type { PrintParams } from 'node-cups';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import sharp from 'sharp';
import dotenv from 'dotenv';
import { findBestPrinter, loadPrinterConfig, savePrinterConfig, updatePrinterConfig } from './printerConfig';

// Initialize environment variables
dotenv.config();

// Define types for the request with file
interface MulterRequest extends Request {
  file?: Express.Multer.File;
  body: any;
}

const app = express();
const PORT = process.env.PORT || 3001;
const AUTH_TOKEN = process.env.AUTH_TOKEN;

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: (_req: Request, _file: any, cb: (error: Error | null, destination: string) => void) => {
    const uploadDir = path.join(__dirname, '..', 'uploads');
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (_req: Request, file: any, cb: (error: Error | null, filename: string) => void) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// Authentication middleware
const authenticate = (req: Request, res: Response, next: NextFunction) => {
  // Skip authentication if no token is configured
  if (!AUTH_TOKEN) {
    return next();
  }
  
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const token = authHeader.split(' ')[1];
  
  if (token !== AUTH_TOKEN) {
    return res.status(403).json({ error: 'Invalid authentication token' });
  }
  
  next();
};

// Middleware
app.use(cors());
// Increase the JSON body size limit to handle larger payloads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Routes
app.get('/', (_req: Request, res: Response) => {
  res.json({ status: 'Print server running' });
});

// Get available printers (protected)
app.get('/printers', authenticate, async (_req: Request, res: Response) => {
  try {
    const printers = await getPrinterNames();
    const config = loadPrinterConfig();
    
    // Map printer names to include which ones have configurations
    const mappedPrinters = printers.map(printer => {
      const printerConfig = config.printers.find(p => p.name === printer);
      return {
        name: printer,
        hasConfiguration: !!printerConfig,
        displayName: printerConfig?.displayName || printer,
        priority: printerConfig?.priority || 0
      };
    });
    
    res.json({ 
      printers: mappedPrinters,
      configuredPrinters: config.printers.map(p => p.name),
      defaultPrinter: config.defaultPrinterName
    });
  } catch (error) {
    console.error('Error getting printers:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: `Failed to get printers: ${errorMessage}` });
  }
});

// Print an image by URL (protected)
app.post('/print-url', authenticate, async (req: Request, res: Response) => {
  try {
    const { imageUrl, useHighQuality = true } = req.body as { imageUrl?: string, useHighQuality?: boolean };
    
    if (!imageUrl) {
      return res.status(400).json({ error: 'No image URL provided' });
    }
    
    console.log(`Received print request for image: ${imageUrl}`);
    console.log(`High quality print requested: ${useHighQuality}`);
    
    // Fetch the image
    console.log("Fetching image from URL...");
    const response = await fetch(imageUrl);
    if (!response.ok) {
      return res.status(400).json({ 
        error: `Failed to fetch image: ${response.status} ${response.statusText}` 
      });
    }
    
    console.log("Image fetched successfully, processing...");
    const buffer = Buffer.from(await response.arrayBuffer());
    console.log(`Image size: ${buffer.length} bytes`);
    
    // Save as both JPEG and TIFF
    const uploadDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    const timestamp = Date.now();
    const jpegFilename = `image-${timestamp}.jpg`;
    const tiffFilename = `image-${timestamp}.tiff`;
    const jpegPath = path.join(uploadDir, jpegFilename);
    const tiffPath = path.join(uploadDir, tiffFilename);
    
    // Convert to formats
    console.log("Converting to JPEG format...");
    await sharp(buffer)
      .jpeg({ quality: 90, mozjpeg: true })
      .toFile(jpegPath);
    
    console.log("Converting to TIFF format...");
    await sharp(buffer)
      .tiff({
        quality: 100,
        compression: 'lzw',
        predictor: 'horizontal'
      })
      .toFile(tiffPath);
    
    console.log("Image conversions complete");
    
    // Get printers and find the best one from our configuration
    console.log("Getting available printers...");
    const printers = await getPrinterNames();
    console.log("Available printers:", printers);
    
    if (printers.length === 0) {
      return res.status(500).json({ error: 'No printers found' });
    }
    
    // Find the best printer based on our configuration
    const bestPrinter = findBestPrinter(printers);
    
    if (!bestPrinter) {
      return res.status(500).json({ error: 'No suitable printer found' });
    }
    
    // Use the selected printer and its options
    console.log(`Using printer: ${bestPrinter.printer} with configured options`);
    
    // Connection options
    const connectionOptions: PrintParams = {
      printer: bestPrinter.printer,
      printerOptions: bestPrinter.options
    };
    
    // Use TIFF or JPEG based on preference
    const filePath = useHighQuality ? tiffPath : jpegPath;
    console.log(`Using ${useHighQuality ? 'TIFF' : 'JPEG'} for printing: ${filePath}`);
    
    // Verify file exists before printing
    if (!fs.existsSync(filePath)) {
      console.error(`ERROR: File does not exist at path: ${filePath}`);
      return res.status(500).json({ error: 'Generated image file not found' });
    }
    
    console.log("File verified. Sending print job with options:", connectionOptions);
    
    // Set a timeout for the print operation
    const printTimeout = 30000; // 30 seconds
    
    // Print the file with timeout handling
    try {
      // Create a promise that rejects after the timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Print operation timed out')), printTimeout);
      });
      
      // Race the print operation against the timeout
      const result = await Promise.race([
        printFile(filePath, connectionOptions),
        timeoutPromise
      ]) as any;
      
      console.log(`Print job submitted: ${result.requestId}`);
      
      // Try to get more info about the job status
      console.log(`To check status, try: lpstat -l -j ${result.requestId}`);
      
      res.json({ 
        success: true, 
        printer: bestPrinter.printer,
        jobId: result.requestId,
        highQuality: useHighQuality,
        filePath: filePath // Include file path for debugging
      });
    } catch (printError) {
      console.error("Error in print operation:", printError);
      const errorMessage = printError instanceof Error ? printError.message : 'Unknown print error';
      
      // Try to cancel any stuck jobs
      try {
        const { exec } = require('child_process');
        exec(`cancel -a ${bestPrinter.printer}`, (error: any) => {
          if (error) console.error("Error canceling jobs:", error);
          else console.log(`Canceled all jobs on ${bestPrinter.printer} to prevent queue issues`);
        });
      } catch (cleanupError) {
        console.error("Error during cleanup:", cleanupError);
      }
      
      return res.status(500).json({ error: `Print operation failed: ${errorMessage}` });
    }
  } catch (error) {
    console.error('Error printing image:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: `Failed to print image: ${errorMessage}` });
  }
});

// Print an uploaded image (protected)
app.post('/print-upload', authenticate, upload.single('image'), async (req: MulterRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }
    
    const { useHighQuality = true } = req.body as { useHighQuality?: boolean };
    const imagePath = req.file.path;
    
    // Get printers and find the best one from our configuration
    const printers = await getPrinterNames();
    
    if (printers.length === 0) {
      return res.status(500).json({ error: 'No printers found' });
    }
    
    // Find the best printer based on our configuration
    const bestPrinter = findBestPrinter(printers);
    
    if (!bestPrinter) {
      return res.status(500).json({ error: 'No suitable printer found' });
    }
    
    // Use the selected printer and its options
    console.log(`Using printer: ${bestPrinter.printer} with configured options`);
    
    // Connection options
    const connectionOptions: PrintParams = {
      printer: bestPrinter.printer,
      printerOptions: bestPrinter.options
    };
    
    // Set a timeout for the print operation
    const printTimeout = 30000; // 30 seconds
    
    // Print the file with timeout handling
    try {
      // Create a promise that rejects after the timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Print operation timed out')), printTimeout);
      });
      
      // Race the print operation against the timeout
      const result = await Promise.race([
        printFile(imagePath, connectionOptions),
        timeoutPromise
      ]) as any;
      
      res.json({ 
        success: true, 
        printer: bestPrinter.printer,
        jobId: result.requestId,
        highQuality: useHighQuality
      });
    } catch (error) {
      console.error('Error printing uploaded image:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Try to cancel any stuck jobs
      try {
        const { exec } = require('child_process');
        exec(`cancel -a ${bestPrinter.printer}`, (error: any) => {
          if (error) console.error("Error canceling jobs:", error);
          else console.log(`Canceled all jobs on ${bestPrinter.printer} to prevent queue issues`);
        });
      } catch (cleanupError) {
        console.error("Error during cleanup:", cleanupError);
      }
      
      res.status(500).json({ error: `Failed to print image: ${errorMessage}` });
    }
  } catch (error) {
    console.error('Error printing uploaded image:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: `Failed to print image: ${errorMessage}` });
  }
});

// Add new API endpoint to update printer configuration
app.post('/printer-config', authenticate, async (req: Request, res: Response) => {
  try {
    const { 
      name, 
      displayName, 
      options, 
      priority = 50, 
      setAsDefault = false 
    } = req.body;
    
    if (!name || !options) {
      return res.status(400).json({ error: 'Printer name and options are required' });
    }
    
    // Update the printer configuration
    updatePrinterConfig({
      name,
      displayName: displayName || name,
      options,
      priority
    });
    
    // If this printer should be the default, update that too
    if (setAsDefault) {
      const config = loadPrinterConfig();
      config.defaultPrinterName = name;
      savePrinterConfig(config);
    }
    
    // Return the updated configuration
    const updatedConfig = loadPrinterConfig();
    
    res.json({ 
      success: true, 
      message: `Printer configuration for ${name} updated`,
      config: updatedConfig
    });
  } catch (error) {
    console.error('Error updating printer configuration:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: `Failed to update printer configuration: ${errorMessage}` });
  }
});

// Get current printer configuration
app.get('/printer-config', authenticate, async (_req: Request, res: Response) => {
  try {
    const config = loadPrinterConfig();
    res.json(config);
  } catch (error) {
    console.error('Error getting printer configuration:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: `Failed to get printer configuration: ${errorMessage}` });
  }
});

// Add simple test endpoint
app.get('/test', (_req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Test endpoint working!' });
});

// Add printer details endpoint
app.get('/printer-details', authenticate, async (_req: Request, res: Response) => {
  try {
    // Get printers
    const printers = await getPrinterNames();
    console.log("Available printers:", printers);
    
    if (printers.length === 0) {
      return res.status(500).json({ error: 'No printers found' });
    }

    // Find the best printer based on our configuration
    const bestPrinter = findBestPrinter(printers);
    
    if (!bestPrinter) {
      return res.status(500).json({ error: 'No suitable printer found' });
    }
    
    console.log(`Selected printer for details: ${bestPrinter.printer}`);
    
    // Get printer options using exec
    const { exec } = require('child_process');
    const printerDetailsPromise = new Promise((resolve, reject) => {
      exec(`lpoptions -p ${bestPrinter.printer} -l`, (error: any, stdout: string, stderr: string) => {
        if (error) {
          console.error(`Error getting printer details: ${error.message}`);
          return reject(error);
        }
        if (stderr) {
          console.error(`stderr: ${stderr}`);
          return reject(new Error(stderr));
        }
        resolve(stdout);
      });
    });
    
    const printerDetails = await printerDetailsPromise;
    
    // Return the printer details
    res.json({ 
      success: true, 
      printer: bestPrinter.printer,
      details: printerDetails,
      currentOptions: bestPrinter.options
    });
  } catch (error) {
    console.error('Error getting printer details:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: `Failed to get printer details: ${errorMessage}` });
  }
});

// Add debug printing endpoint with minimal options
app.get('/debug-print', authenticate, async (_req: Request, res: Response) => {
  try {
    // Get printers
    const printers = await getPrinterNames();
    console.log("Available printers:", printers);
    
    if (printers.length === 0) {
      return res.status(500).json({ error: 'No printers found' });
    }

    // Find the best printer based on our configuration
    const bestPrinter = findBestPrinter(printers);
    
    if (!bestPrinter) {
      return res.status(500).json({ error: 'No suitable printer found' });
    }
    
    console.log(`Selected printer for debugging: ${bestPrinter.printer}`);
    
    // Use a test image in the uploads directory
    const uploadDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // Create a simple test image
    const testImagePath = path.join(uploadDir, 'test-image.jpg');
    await sharp({
      create: {
        width: 1000,
        height: 1000,
        channels: 3,
        background: { r: 255, g: 200, b: 200 }
      }
    })
    .jpeg()
    .toFile(testImagePath);
    
    console.log(`Created test image at: ${testImagePath}`);
    
    // Use minimal options based on the printer's configuration
    // We'll use just a few key options to minimize chances of errors
    const minimalOptions = { 
      ...bestPrinter.options,
      // Keep only the essential options
      ...Object.fromEntries(
        Object.entries(bestPrinter.options)
          .filter(([key]) => 
            key === "PageSize" || 
            key === "MediaType" || 
            key === "CNIJMediaType" || 
            key === "CNIJMediaSupply" ||
            key === "ColorModel"
          )
      )
    };
    
    const minimalPrintOptions: PrintParams = {
      printer: bestPrinter.printer,
      printerOptions: minimalOptions
    };
    
    console.log("Sending minimal print job with options:", minimalPrintOptions);
    
    // Print the file with minimal options
    const result = await printFile(testImagePath, minimalPrintOptions);
    console.log(`Debug print job submitted: ${result.requestId}`);
    
    res.json({ 
      success: true, 
      printer: bestPrinter.printer,
      jobId: result.requestId,
      usedOptions: minimalOptions,
      message: "Debug print job sent with minimal options"
    });
  } catch (error) {
    console.error('Error in debug printing:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: `Failed to print debug image: ${errorMessage}` });
  }
});

// Add super minimal test print endpoint
app.get('/minimal-print', authenticate, async (_req: Request, res: Response) => {
  try {
    // Get printers
    const printers = await getPrinterNames();
    console.log("Available printers for minimal print:", printers);
    
    if (printers.length === 0) {
      return res.status(500).json({ error: 'No printers found' });
    }

    // Get the printer by name directly
    const printerName = "Gertie";
    
    console.log(`Using printer directly: ${printerName}`);
    
    // Create a simple test image
    const uploadDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // Create a super simple test image - just a small black square
    const testImagePath = path.join(uploadDir, 'minimal-test.jpg');
    await sharp({
      create: {
        width: 500,
        height: 500,
        channels: 3,
        background: { r: 0, g: 0, b: 0 }
      }
    })
    .jpeg({ quality: 80 })
    .toFile(testImagePath);
    
    console.log(`Created minimal test image at: ${testImagePath}`);
    
    // Use absolute minimal options - just the page size and nothing else
    const absoluteMinimalOptions = {
      "PageSize": "Letter"
    };
    
    // Create connection with minimal options
    const minimalPrintOptions: PrintParams = {
      printer: printerName,
      printerOptions: absoluteMinimalOptions
    };
    
    console.log("Sending absolute minimal print job with options:", minimalPrintOptions);
    
    // Use the command line directly instead of the API
    const { exec } = require('child_process');
    const printCommand = `lpr -P "${printerName}" -o PageSize=Letter "${testImagePath}"`;
    
    exec(printCommand, (error: any, stdout: string, stderr: string) => {
      if (error) {
        console.error(`Error with direct print command: ${error.message}`);
        return res.status(500).json({ error: `Print command failed: ${error.message}` });
      }
      
      if (stderr) {
        console.error(`stderr: ${stderr}`);
      }
      
      console.log("Direct print command succeeded");
      console.log("stdout:", stdout);
      
      res.json({ 
        success: true, 
        printer: printerName,
        command: printCommand,
        usedOptions: absoluteMinimalOptions,
        message: "Minimal print job sent via direct command"
      });
    });
  } catch (error) {
    console.error('Error in minimal printing:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: `Failed to print minimal image: ${errorMessage}` });
  }
});

// Add printer status debug endpoint
app.get('/printer-status', authenticate, async (_req: Request, res: Response) => {
  try {
    const { exec } = require('child_process');
    const printerName = "Gertie";
    
    // Execute multiple commands in parallel to gather comprehensive status information
    const commands = {
      lpstat: `lpstat -p ${printerName} -l`,
      lpoptions: `lpoptions -p ${printerName}`,
      lpq: `lpq -P ${printerName}`,
      jobs: `lpstat -o ${printerName}`
    };
    
    const results: Record<string, any> = {};
    
    // Execute all commands in parallel
    const commandPromises = Object.entries(commands).map(([key, cmd]) => {
      return new Promise<void>((resolve) => {
        exec(cmd, (error: any, stdout: string, stderr: string) => {
          results[key] = {
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            error: error ? error.message : null
          };
          resolve();
        });
      });
    });
    
    // Wait for all commands to complete
    await Promise.all(commandPromises);
    
    // Check physical connection to printer
    exec(`ping -c 1 -W 1 $(lpstat -v ${printerName} | grep -o -E '([0-9]{1,3}\\.){3}[0-9]{1,3}')`, 
      (error: any, stdout: string, stderr: string) => {
        results.connection = {
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          error: error ? error.message : null,
          connectionOk: !error
        };
        
        // Execute one more command to reset the printer
        exec(`cupsenable ${printerName}`, () => {
          results.resetStatus = "Attempted to reset printer status";
          
          // Return all results
          res.json({
            printer: printerName,
            status: results,
            timestamp: new Date().toISOString()
          });
        });
      }
    );
  } catch (error) {
    console.error('Error checking printer status:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: `Failed to check printer status: ${errorMessage}` });
  }
});

// Start the server
app.listen(PORT, async () => {
  console.log(`Print server running on http://localhost:${PORT}`);
  
  // Log authentication status
  if (AUTH_TOKEN) {
    console.log('Authentication enabled');
  } else {
    console.log('Authentication disabled');
  }
  
  // Clean up any stuck print jobs
  await cleanPrintQueues();
});

// Function to clean print queues at startup
async function cleanPrintQueues() {
  try {
    console.log("Cleaning print queues...");
    const { exec } = require('child_process');
    
    // Get printer names
    const printers = await getPrinterNames();
    
    // For each printer, cancel all jobs and reset
    for (const printer of printers) {
      console.log(`Cleaning queue for printer: ${printer}`);
      
      // Cancel all jobs
      const cancelPromise = new Promise<void>((resolve) => {
        exec(`cancel -a ${printer}`, (error: any) => {
          if (error) console.error(`Error canceling jobs for ${printer}:`, error);
          else console.log(`Canceled all jobs on ${printer}`);
          resolve();
        });
      });
      
      // Enable the printer
      const enablePromise = new Promise<void>((resolve) => {
        exec(`cupsenable ${printer}`, (error: any) => {
          if (error) console.error(`Error enabling ${printer}:`, error);
          else console.log(`Enabled ${printer}`);
          resolve();
        });
      });
      
      // Wait for both operations to complete
      await Promise.all([cancelPromise, enablePromise]);
    }
    
    console.log("Print queues cleaned successfully");
  } catch (error) {
    console.error("Error cleaning print queues:", error);
  }
} 