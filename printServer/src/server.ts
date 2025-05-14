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
app.use(express.json());
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
  "media": "custom_13x19", // 13x19 inches (Super B/A3+)
  "PageSize": "13x19", 
  "MediaType": "PhotoPaperPro", // Pro luster/semi-gloss paper
  "InputSlot": "Rear",  // Rear tray for specialty papers
  "Quality": "best",    // Highest quality
  "ColorModel": "RGB",  // Full color
  "Resolution": "max",  // Maximum resolution
  "Duplex": "None",     // No duplex printing for photos
  "fit-to-page": "true",
  "print-quality": "high",
};

// Default printer options
const defaultOptions: Record<string, string> = {
  "media": "a4",
  "fit-to-page": "true",
  "print-quality": "high",
};

// Print an image by URL (protected)
app.post('/print-url', authenticate, async (req: Request, res: Response) => {
  try {
    const { imageUrl, useHighQuality = true } = req.body as { imageUrl?: string, useHighQuality?: boolean };
    
    if (!imageUrl) {
      return res.status(400).json({ error: 'No image URL provided' });
    }
    
    console.log(`Received print request for image: ${imageUrl}`);
    
    // Fetch the image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      return res.status(400).json({ 
        error: `Failed to fetch image: ${response.status} ${response.statusText}` 
      });
    }
    
    const buffer = Buffer.from(await response.arrayBuffer());
    
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
    await sharp(buffer)
      .jpeg({ quality: 90, mozjpeg: true })
      .toFile(jpegPath);
    
    await sharp(buffer)
      .tiff({
        quality: 100,
        compression: 'lzw',
        predictor: 'horizontal'
      })
      .toFile(tiffPath);
    
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
    
    // Use TIFF or JPEG based on preference
    const filePath = useHighQuality ? tiffPath : jpegPath;
    
    // Print the file
    const result = await printFile(filePath, connectionOptions);
    console.log(`Print job submitted: ${result.requestId}`);
    
    res.json({ 
      success: true, 
      printer: selectedPrinter,
      jobId: result.requestId,
      highQuality: useHighQuality
    });
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

// Start server
app.listen(PORT, () => {
  console.log(`Print server running on http://localhost:${PORT}`);
  console.log(`Authentication ${AUTH_TOKEN ? 'enabled' : 'disabled'}`);
}); 