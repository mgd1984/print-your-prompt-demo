# Print Your Prompt Demo

> **AI-powered prompt collection and printing system** — Collect prompts from your audience, let them vote, generate AI images, and print the winners directly to any compatible printer.

**Originally presented at**: AI Tinkerer's Club Toronto Meetup (June 2025)  

## What This Does

This is a **real-time audience engagement tool** for AI/tech presentations. Your audience scans a QR code, submits creative prompts, votes on their favorites, and watches as the winning prompt gets turned into an AI-generated image that prints live on your connected printer.

Perfect for:
- **AI meetups & conferences** — Interactive demos that wow your audience
- **Workshops & hackathons** — Collaborative prompt engineering exercises  
- **Art installations** — Community-driven AI art creation
- **Office demos** — Show off your AI + hardware integration skills

## How It Works

The magic happens in 6 simple steps:

1. **🎯 Setup** — Admin opens the control panel, audience sees QR code
2. **📝 Collect** — Audience scans QR code and submits creative prompts
3. **🗳️ Vote** — Real-time voting on all submitted prompts
4. **🏆 Winner** — Highest-voted prompt automatically selected
5. **🎨 Generate** — Image generation model (gpt-image-1) creates an image from the winning prompt
6. **🖨️ Print** — Physical artwork prints immediately on your connected printer

Perfect for creating **tangible AI art** that your audience can take home!

## Quick Start

Want to run this for your next presentation? Here's the 5-minute setup:

## Features

- 📱 **QR Code Access** — Audience scans to join instantly
- 🗳️ **Real-time Voting** — Live polls with immediate results
- 🎨 **AI Image Generation** — OpenAI integration
- 🖨️ **Professional Printing** — Direct USB or network printing to compatible printers
- 👨‍💼 **Admin Dashboard** — Full control over sessions and prompts
- 📊 **Live Gallery** — Real-time display of generated images
- 🔧 **Flexible Setup** — Works locally or deployed to Vercel

## Setup

1. Clone the repository
2. Install dependencies: `pnpm install`
3. Set up your environment variables (see Environment Variables section below)
4. Initialize the database: `pnpm db:push`
5. **Configure your printer** (see Printer Setup section below)
6. Start the development server: `pnpm dev`

## Printer Setup

The application supports various printer types through CUPS (Common Unix Printing System). The system automatically detects available printers and includes optimized configurations for popular models.

### Supported Printer Types

- **Canon PRO Series** — Professional photo printers with CIS support
- **HP ENVY Series** — Consumer photo printers  
- **Generic CUPS Printers** — Any printer supported by your system's CUPS installation

### Printer Configuration

The system automatically detects and prioritizes printers in this order:

1. **USB-connected printers** (most reliable)
2. **Network/WiFi printers** 
3. **IPP/AirPrint printers**

```bash
# Check available printers
lpstat -p

# Verify printer connection (example for Canon)
system_profiler SPUSBDataType | grep -i canon

# Test print functionality
lp -d YOUR_PRINTER_NAME /path/to/test/image.jpg
```

### Print Quality Settings

The app includes optimized settings for different use cases:

- **Photo Quality** — High-resolution printing on photo paper
- **Draft Mode** — Fast printing for testing and previews
- **Fine Art** — Maximum quality for gallery-worthy prints
- **Custom Settings** — Manual control over paper type, size, and quality

### Troubleshooting Common Issues

If you encounter printing problems:

1. **Check CUPS Configuration** — Ensure your printer is properly installed
2. **USB vs Network** — USB connections are generally more reliable
3. **Print Queue** — Clear any stuck jobs: `cancel -a YOUR_PRINTER_NAME`
4. **Permissions** — Verify the user has printer access permissions

## Usage

**Important**: You'll need to get your Supabase database password from the Supabase dashboard at https://supabase.com/dashboard/project/YOUR_PROJECT_ID/settings/database

1. Open the admin page `/admin` on your presenter device
2. Display the QR code to your audience (also visible on the home page)
3. Audience members scan the QR code to access the voting page
4. Start a voting session from the admin panel
5. Once voting completes, generate an image from the winning prompt
6. Print the result directly to your connected printer

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
DATABASE_URL="postgresql://postgres.YOUR_PROJECT_REF:[YOUR_PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres"
# OR for Vercel (automatically provided by Supabase integration):
# POSTGRES_URL="postgresql://postgres.YOUR_PROJECT_REF:[YOUR_PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres"

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

The print server automatically detects available printers and includes optimized settings for various printer models.

### Production Setup with ngrok

When your app is deployed to **Vercel** but your printer is **local**, you need ngrok to create a secure tunnel:

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
- **Development**: App → Direct USB/Network → Local Printer
- **Production**: Vercel App → ngrok tunnel → Local Print Server → USB/Network → Local Printer

## Contributing

Found a bug? Want to add support for other printers? Contributions welcome!

### Development Setup

1. Fork this repo
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/print-your-prompt-demo.git`
3. Install dependencies: `pnpm install`
4. Copy `.env.example` to `.env` and fill in your values
5. Run the dev server: `pnpm dev`

### Adding Printer Support

The printer logic is centralized in:
- `src/server/api/routers/printer.ts` - Main app printer integration
- `printServer/config/printers.json` - Print server configuration
- `printServer/src/printerConfig.ts` - Configuration management

### Pull Request Guidelines

- Keep PRs focused on a single feature/fix
- Add tests if you're touching core functionality
- Update documentation for new features
- Test with both development and production setups

## License

MIT License - feel free to use this for your own presentations and demos!

## Acknowledgments

- Built with the [T3 Stack](https://create.t3.gg/)
- AI Tinkerer Toronto for the opportunity to present
- Special thanks to everyone who participated by submitted prompts during the original demo

## Configuration Files

### Main Application
- `src/server/api/routers/printer.ts` - Core printer integration and CUPS communication
- `src/server/db/schema.ts` - Database schema for prompts and voting sessions

### Print Server  
- `printServer/config/printers.json` - Printer configurations and profiles
- `printServer/src/printerConfig.ts` - Configuration management functions
- `printServer/src/server.ts` - HTTP server with printer discovery and job handling

**Note**: The main application includes basic printer logic for development, while the print server provides advanced configuration options for production deployments.
