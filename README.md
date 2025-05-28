# Print Your Prompt Demo

A Next.js application for collecting and voting on prompts, with real-time printing capabilities on Canon PRO-1000 printer.

## Features

- Submit prompts for voting
- Real-time voting system
- Admin panel for managing prompts
- Live gallery view
- **Direct USB printing** to Canon PRO-1000 with CIS (Continuous Ink System) support

## Setup

1. Clone the repository
2. Install dependencies: `pnpm install`
3. Set up your environment variables (see Environment Variables section below)
4. Initialize the database: `pnpm db:push`
5. **Configure USB printer** (see Printer Setup section below)
6. Start the development server: `pnpm dev`

## Printer Setup (Canon PRO-1000 with CIS)

This application is specifically configured for a Canon PRO-1000 printer with a Continuous Ink System (CIS) and precision color sensors. The USB connection is prioritized for maximum reliability.

### USB Printer Configuration

The system automatically detects and uses the USB-connected Canon PRO-1000:

```bash
# Verify USB connection
system_profiler SPUSBDataType | grep -i canon

# Check printer status
lpstat -p Canon_PRO_1000_USB
```

### CIS-Specific Settings

The printer configuration includes special options for CIS systems:

- `CNIJInkWarning: "0"` - Disables ink level warnings
- `CNIJInkCartridgeSettings: "0"` - Bypasses cartridge detection
- `PageSize: "13x19"` - Optimized for large format printing
- `ColorModel: "RGB"` - Standard RGB color model
- `MediaType: "photographic"` - High-quality photo settings

### Troubleshooting "Printer in Use" Errors

If you encounter "printer in use" errors with precision color sensors:

1. **USB Connection**: The app prioritizes USB over network connections
2. **Automatic Workarounds**: Built-in retry logic with minimal options
3. **Force Print Mode**: Fallback to basic settings that bypass sensor dependencies
4. **Job Monitoring**: Automatic detection and clearing of stuck print jobs

## Usage

**Important**: You'll need to get your Supabase database password from the Supabase dashboard at https://supabase.com/dashboard/project/qslbjmfdkmyubqdowmjd/settings/database

1. Open the admin page `/admin` on your presenter device
2. Display the QR code to your audience (also visible on the home page)
3. Audience members scan the QR code to access the voting page
4. Start a voting session from the admin panel
5. Once voting completes, generate an image from the winning prompt
6. Print the result directly to your Canon PRO-1000 printer via USB

## Admin Authentication

The admin panel at `/admin` is protected by password authentication:

- **Setup**: Set `ADMIN_PASSWORD` in your `.env` file to enable protection
- **Access**: Navigate to `/admin` - you'll be redirected to a login page
- **Login**: Enter your admin password to access the control panel
- **Session**: Authentication persists for 7 days via secure HTTP-only cookies
- **Logout**: Click the "Logout" button in the admin panel to end your session

**Security Notes:**
- If `ADMIN_PASSWORD` is not set, the admin panel will be accessible without authentication (development mode)
- Use a strong password for production deployments
- The authentication cookie is HTTP-only and secure in production
- Sessions automatically expire after 7 days

## Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org) with App Router
- **Database**: PostgreSQL with [Supabase](https://supabase.com) and [Drizzle ORM](https://orm.drizzle.team)
- **Styling**: [Tailwind CSS](https://tailwindcss.com)
- **UI Components**: [Radix UI](https://radix-ui.com)
- **Type Safety**: [TypeScript](https://typescriptlang.org)
- **API**: [tRPC](https://trpc.io)
- **Printing**: CUPS integration via node-cups with USB priority

## Environment Variables

Create a `.env` file with:

```env
# Database (Supabase) - Use POSTGRES_URL for Vercel, DATABASE_URL for local
DATABASE_URL="postgresql://postgres.qslbjmfdkmyubqdowmjd:[YOUR_PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres"
# OR for Vercel (automatically provided by Supabase integration):
# POSTGRES_URL="postgresql://postgres.qslbjmfdkmyubqdowmjd:[YOUR_PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres"

# OpenAI (for image generation)
OPENAI_API_KEY="your_openai_api_key"

# Print Server (for production with ngrok)
PRINT_SERVER_URL="https://your-ngrok-url.ngrok.io"  # Only needed for Vercel deployment
PRINT_SERVER_TOKEN="your-secret-token"              # Optional: for print server authentication

# Optional: Local CUPS authentication
CUPS_USER="your_cups_user"
CUPS_PASSWORD="your_cups_password"

# Admin authentication (set a strong password to protect the admin panel)
ADMIN_PASSWORD="your_secure_admin_password"
```

**Environment-specific setup:**
- **Development**: Only `DATABASE_URL` and `OPENAI_API_KEY` needed (prints directly via USB)
- **Vercel Production**: Vercel provides `POSTGRES_URL` automatically when you connect Supabase
- **Manual Production**: Add `PRINT_SERVER_URL` and `PRINT_SERVER_TOKEN` for ngrok tunnel

**Vercel Setup:**
1. Connect your Supabase project in Vercel dashboard (provides `POSTGRES_URL` automatically)
2. Add `OPENAI_API_KEY` in Vercel environment variables
3. Add `PRINT_SERVER_URL` and `PRINT_SERVER_TOKEN` if using ngrok for printing

## Database Commands

- `pnpm db:generate` - Generate migrations
- `pnpm db:migrate` - Run migrations  
- `pnpm db:push` - Push schema changes
- `pnpm db:studio` - Open Drizzle Studio

## Development

```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint
pnpm typecheck    # Run TypeScript checks
```

## Print Server

The application includes a separate print server (`/printServer`) for handling print jobs:

```bash
cd printServer
pnpm install
pnpm start        # Start print server on port 3001
```

The print server automatically prioritizes the USB Canon PRO-1000 and includes CIS-specific workarounds.

### Production Setup with ngrok

When your app is deployed to **Vercel** but your Canon PRO-1000 is **local**, you need ngrok to create a secure tunnel:

```bash
# 1. Install and setup ngrok
npm install -g ngrok
ngrok authtoken YOUR_NGROK_TOKEN

# 2. Start your local print server
cd printServer && pnpm start

# 3. Create tunnel to your print server
ngrok http 3001
```

Then set your Vercel environment variables:
```env
PRINT_SERVER_URL=https://your-ngrok-url.ngrok.io
PRINT_SERVER_TOKEN=your-secret-token
```

**Architecture:**
- **Development**: App → Direct USB → Canon PRO-1000
- **Production**: Vercel App → ngrok tunnel → Local Print Server → USB → Canon PRO-1000

## Configuration Files

### Main Application
- `src/server/api/routers/printer.ts` - Main printer logic with hardcoded USB priority and CIS settings

### Print Server
- `printServer/config/printers.json` - **Single source of truth** for printer configuration
- `printServer/src/printerConfig.ts` - Configuration management functions
- `printServer/src/server.ts` - Print server with enhanced printer discovery

**Note**: The main application has printer logic hardcoded for reliability, while the print server uses the configuration file for flexibility.

## Architecture Notes

### Database Migration (Neon → Supabase)

The application was migrated from Neon to Supabase for better bandwidth throughput:

- **Connection**: Uses node-postgres with SSL configuration
- **Pool Settings**: Optimized for Vercel serverless environment
- **SSL Handling**: Special configuration for Vercel + Supabase compatibility

### Printer Integration

- **USB Priority**: Direct USB connection bypasses network-related sensor issues
- **CIS Support**: Special handling for continuous ink systems with precision sensors
- **Error Recovery**: Multi-level fallback system for stuck print jobs
- **Force Print Mode**: Minimal options mode for sensor-heavy operations