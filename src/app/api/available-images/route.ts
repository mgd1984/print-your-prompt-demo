import { readdir } from 'fs/promises';
import { NextResponse } from 'next/server';
import path from 'path';

/**
 * API route that returns a list of available JPG images in the uploads directory
 */
export async function GET() {
  try {
    // Get the absolute path to the uploads directory
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    
    // Read the directory contents
    const files = await readdir(uploadsDir);
    
    // Filter for JPG images only and format as URLs
    const imageUrls = files
      .filter(file => file.toLowerCase().endsWith('.jpg'))
      .map(file => `/uploads/${file}`);
    
    // Return the list of image URLs
    return NextResponse.json({ 
      images: imageUrls,
      count: imageUrls.length
    });
  } catch (error) {
    console.error('Error fetching available images:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available images', images: [] },
      { status: 500 }
    );
  }
} 