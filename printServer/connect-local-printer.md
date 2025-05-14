# Connecting Your Vercel App to Your Local Printer

This guide will show you how to expose your local print server securely to the internet so your Vercel-deployed app can communicate with it.

## Option 1: Using ngrok (Recommended for Development)

[ngrok](https://ngrok.com/) provides secure tunnels to localhost, allowing your Vercel app to communicate with your local print server.

### Setup:

1. Sign up for a free ngrok account
2. Download and install ngrok
3. Connect your ngrok account:
   ```
   ngrok authtoken your-auth-token
   ```
4. Start the ngrok tunnel to your print server:
   ```
   ngrok http 3001
   ```
5. Copy the generated ngrok URL (e.g., `https://a1b2c3d4.ngrok.io`)
6. Update your Vercel environment variables:
   ```
   PRINT_SERVER_URL=https://a1b2c3d4.ngrok.io
   PRINT_SERVER_TOKEN=your-secret-token
   ```

## Option 2: Using a VPS or Cloud VM (For Production)

For a more permanent solution, you can host the print server on a VPS that can connect to your local network:

1. Set up a VPS with SSH access to your local network
2. Use SSH port forwarding to reach your local print server
3. Configure your Vercel app to communicate with the VPS

## Option 3: Local Network Exposure (Only for Testing)

You can directly expose your print server on your local network:

1. Configure your router to forward port 3001 to your computer
2. Set up a dynamic DNS service to keep a stable domain
3. Use this as your `PRINT_SERVER_URL` in Vercel

⚠️ **Security Warning**: Only use this option for testing, as it exposes your local network to the internet.

## Testing the Connection

To test if your Vercel app can reach your print server:

1. Start your local print server: `npm start`
2. Set up the tunnel using one of the methods above
3. Deploy your Vercel app with the proper environment variables
4. Try generating and printing an image

If everything is configured correctly, your Vercel-deployed app should be able to send print jobs to your local Canon Pro 1000 printer! 