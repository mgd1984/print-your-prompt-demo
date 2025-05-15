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
    res.json({ printers });
  } catch (error) {
    console.error('Error getting printers:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: `Failed to get printers: ${errorMessage}` });
  }
});

// Canon Pro 1000 specific printer options
const canonProOptions: Record<string, string> = {
  // PageSize: "A3+" is common, but some drivers prefer "A3plus", "SuperA3",
  // or a specific dimension string (e.g., "SuperA3_329x483mm").
  // Verify with `lpoptions -l -p YOUR_PRINTER_NAME`.
  "PageSize": "A3plus",

  // PageRegion should generally match PageSize.
  "PageRegion": "A3plus",

  // InputSlot: For A3+ photo/fine art paper on the Canon Pro-1000,
  // the manual feed tray is typically used. Common CUPS names for this tray
  // include "Manual", "Rear", "RearTray", "ManualFeed". "Top" refers to the
  // main auto-feed tray, which might not be suitable for all A3+ media.
  // CRITICAL: Verify the exact name for your manual feed tray using `lpoptions -l`.
  "InputSlot": "by-pass-tray", // Changed from "Top" - common for A3+ specialty media

  // MediaType: THIS IS THE MOST CRITICAL OPTION FOR "PAPER MISMATCH" ERRORS.
  // The value must exactly match a media type supported by your printer driver
  // AND the type of paper physically loaded AND the media type selected on the
  // printer's own control panel/LCD screen.
  // "Photographic" is too generic. Common Canon-specific types include:
  // "PhotoPaperProLuster", "PhotoPaperPlusGlossyII", "MattePhotoPaper",
  // "FineArtPhotoRag", etc.
  // CRITICAL: Use `lpoptions -l` or the `/printer-details` endpoint to find the exact
  // string for the paper you are using.
  "MediaType": "auto", // Example: Changed from "Photographic". VERIFY THIS!

  "ColorModel": "RGB", // Standard RGB color mode
  "cupsPrintQuality": "High", // High quality printing

  // "Duplex": "None", // Usually "None" for photo prints
  // "fit-to-page": "true" // Consider enabling if you experience scaling issues or unwanted cropping.
  // This can help if the image aspect ratio doesn't perfectly fit the paper's printable area.
};

// Default printer options
const defaultOptions: Record<string, string> = {
  // Using "A3plus" for consistency, adjust if this is for truly generic printers.
  "PageSize": "A3plus",
  "fit-to-page": "true", // Generally useful
  // "print-quality": "high", // cupsPrintQuality is preferred for more direct CUPS control
  "InputSlot": "Auto", // A common generic default for auto feed tray
  "MediaType": "auto", // A generic photo media type
  "ColorModel": "RGB",
  "cupsPrintQuality": "Normal", // A more conservative default quality
};

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
    
    // Get printers
    console.log("Getting available printers...");
    const printers = await getPrinterNames();
    console.log("Available printers:", printers);
    
    if (printers.length === 0) {
      return res.status(500).json({ error: 'No printers found' });
    }
    
    // First try to find the Series 2 printer specifically
    let selectedPrinter = printers.find(printer => 
      printer.includes("Canon_PRO_1000_series_2") || 
      printer.includes("PRO-1000 series 2")
    );
    
    // Fall back to any Canon printer if the preferred one isn't found
    if (!selectedPrinter) {
      selectedPrinter = printers.find(printer => 
        printer.toLowerCase().includes('canon') || 
        printer.toLowerCase().includes('pro-1000')
      );
    }
    
    // Use the first available printer as last resort
    if (!selectedPrinter) {
      if (printers.length > 0) {
        selectedPrinter = printers[0];
      } else {
        return res.status(500).json({ error: 'No suitable printer found' });
      }
    }
    
    // At this point, selectedPrinter is definitely defined
    // Using non-null assertion operator since we've checked above
    console.log(`Using printer: ${selectedPrinter!}`);
    
    // Choose printer options based on printer type
    const printerOptions = selectedPrinter!.toLowerCase().includes("canon") 
      ? canonProOptions 
      : defaultOptions;
    
    // Connection options
    const connectionOptions: PrintParams = {
      printer: selectedPrinter!,
      printerOptions: printerOptions
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
    
    // Print the file
    try {
      const result = await printFile(filePath, connectionOptions);
      console.log(`Print job submitted: ${result.requestId}`);
      
      // Try to get more info about the job status
      console.log(`To check status, try: lpstat -l -j ${result.requestId}`);
      
      res.json({ 
        success: true, 
        printer: selectedPrinter,
        jobId: result.requestId,
        highQuality: useHighQuality,
        filePath: filePath // Include file path for debugging
      });
    } catch (printError) {
      console.error("Error in print operation:", printError);
      const errorMessage = printError instanceof Error ? printError.message : 'Unknown print error';
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
    
    // Get printers
    const printers = await getPrinterNames();
    
    if (printers.length === 0) {
      return res.status(500).json({ error: 'No printers found' });
    }
    
    // First try to find the Series 2 printer specifically
    let selectedPrinter = printers.find(printer => 
      printer.includes("Canon_PRO_1000_series_2") || 
      printer.includes("PRO-1000 series 2")
    );
    
    // Fall back to any Canon printer if the preferred one isn't found
    if (!selectedPrinter) {
      selectedPrinter = printers.find(printer => 
        printer.toLowerCase().includes('canon') || 
        printer.toLowerCase().includes('pro-1000')
      );
    }
    
    // Use the first available printer as last resort
    if (!selectedPrinter) {
      if (printers.length > 0) {
        selectedPrinter = printers[0];
      } else {
        return res.status(500).json({ error: 'No suitable printer found' });
      }
    }
    
    // At this point, selectedPrinter is definitely defined
    // Using non-null assertion operator since we've checked above
    console.log(`Using printer: ${selectedPrinter!}`);
    
    // Choose printer options based on printer type
    const printerOptions = selectedPrinter!.toLowerCase().includes("canon") 
      ? canonProOptions 
      : defaultOptions;
    
    // Connection options
    const connectionOptions: PrintParams = {
      printer: selectedPrinter!,
      printerOptions: printerOptions
    };
    
    // Print the file
    const result = await printFile(imagePath, connectionOptions);
    
    res.json({ 
      success: true, 
      printer: selectedPrinter,
      jobId: result.requestId,
      highQuality: useHighQuality
    });
  } catch (error) {
    console.error('Error printing uploaded image:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: `Failed to print image: ${errorMessage}` });
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

    // Find Canon printer
    let selectedPrinter = printers.find(printer => 
      printer.toLowerCase().includes('canon') || 
      printer.toLowerCase().includes('pro-1000')
    );
    
    if (!selectedPrinter) {
      selectedPrinter = printers[0];
    }
    
    console.log(`Selected printer for details: ${selectedPrinter}`);
    
    // Get printer options using exec
    const { exec } = require('child_process');
    const printerDetailsPromise = new Promise((resolve, reject) => {
      exec(`lpoptions -p ${selectedPrinter} -l`, (error: any, stdout: string, stderr: string) => {
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
      printer: selectedPrinter,
      details: printerDetails
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

    // Find Canon printer
    let selectedPrinter = printers.find(printer => 
      printer.toLowerCase().includes('canon') || 
      printer.toLowerCase().includes('pro-1000')
    );
    
    if (!selectedPrinter) {
      selectedPrinter = printers[0];
    }
    
    console.log(`Selected printer for debugging: ${selectedPrinter}`);
    
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
    
    // Use minimal print options
    const minimalPrintOptions: PrintParams = {
      printer: selectedPrinter,
      printerOptions: {
        "media": "Letter",
      }
    };
    
    console.log("Sending minimal print job with options:", minimalPrintOptions);
    
    // Print the file with minimal options
    const result = await printFile(testImagePath, minimalPrintOptions);
    console.log(`Debug print job submitted: ${result.requestId}`);
    
    res.json({ 
      success: true, 
      printer: selectedPrinter,
      jobId: result.requestId,
      message: "Debug print job sent with minimal options"
    });
  } catch (error) {
    console.error('Error in debug printing:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: `Failed to print debug image: ${errorMessage}` });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Print server running on http://localhost:${PORT}`);
  console.log(`Authentication ${AUTH_TOKEN ? 'enabled' : 'disabled'}`);
}); 