# Print Your Prompt Demo

An interactive presentation tool for AI image generation lightning talks. Audience members submit prompts, vote on their favorites, and see AI-generated images printed live on a Canon Pro 1000 printer.

## Features

- **Audience Participation**: QR code access to the voting page for seamless mobile engagement
- **Live Prompting**: Real-time submission and voting on creative AI image prompts
- **Image Generation**: Integration with OpenAI's image models (gpt-image-1 and DALL-E 3)
- **Live Printing**: Direct printing to Canon Pro 1000 printer via CUPS
- **Admin Panel**: Control the flow of the presentation, manage voting sessions, and trigger image generation

## Setup

1. Clone this repository
2. Install dependencies: `npm install` or `pnpm install`
3. Copy `.env.example` to `.env` and fill in your:
   - OpenAI API key
   - CUPS printer credentials (if needed)
4. Initialize the database: `npx prisma db push` or equivalent Drizzle command
5. Start the development server: `npm run dev`

## Usage During a Presentation

1. Open the admin page `/admin` on your presenter device
2. Display the QR code to your audience (also visible on the home page)
3. Audience members scan the QR code to access the voting page
4. Start a voting session from the admin panel
5. Once voting completes, generate an image from the winning prompt
6. Print the result directly to your Canon Pro 1000 printer

## Technical Stack

- **Framework**: [Next.js](https://nextjs.org) with the T3 Stack
- **Styling**: [Tailwind CSS](https://tailwindcss.com)
- **API**: [tRPC](https://trpc.io) for type-safe API calls
- **Database**: PostgreSQL with [Neon](https://neon.tech) and [Drizzle ORM](https://orm.drizzle.team)
- **Image Generation**: OpenAI API
- **Printing**: CUPS integration via node-cups

## Development

The project structure follows standard Next.js App Router conventions:

- `/src/app/*` - Page components
- `/src/app/_components/*` - Shared React components
- `/src/server/api/*` - tRPC API endpoints and database schema
