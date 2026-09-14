import { defineConfig } from 'vite';
import axios from 'axios';
import dotenv from 'dotenv';
import querystring from 'querystring';

// Load env explicitly for our custom plugin
dotenv.config();

function lineLoginPlugin() {
  return {
    name: 'line-login-plugin',
    configureServer(server) {
      // Mock API endpoint to handle LINE Auth Code Exchange
      server.middlewares.use('/api/auth/line', async (req, res, next) => {
        // Parse simple query manually because this is a raw node req
        const urlObj = new URL(req.url, `http://${req.headers.host}`);
        const code = urlObj.searchParams.get('code');
        const redirectUri = urlObj.searchParams.get('redirect_uri');

        if (!code) {
          return next();
        }

        try {
          // 1. Exchange code for Access Token
          const tokenResponse = await axios.post('https://api.line.me/oauth2/v2.1/token', querystring.stringify({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: redirectUri,
            client_id: process.env.VITE_LINE_CHANNEL_ID,
            client_secret: process.env.LINE_CHANNEL_SECRET
          }), {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          });

          const accessToken = tokenResponse.data.access_token;
          const idToken = tokenResponse.data.id_token;

          // 2. Get User Profile using Access Token
          const profileResponse = await axios.get('https://api.line.me/v2/profile', {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          });

          const userProfile = {
            userId: profileResponse.data.userId,
            displayName: profileResponse.data.displayName,
            pictureUrl: profileResponse.data.pictureUrl,
            statusMessage: profileResponse.data.statusMessage,
            idToken: idToken // Contains email if requested & permitted
          };

          // Return successful response to frontend
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true, profile: userProfile }));
          
        } catch (error) {
          console.error("LINE Auth Error:", error.response?.data || error.message);
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: 'Authentication failed' }));
        }
      });
    }
  };
}

export default defineConfig({
  plugins: [lineLoginPlugin()],
  server: {
    port: 5173,
    open: false,
    host: true,
  },
  build: {
    outDir: 'dist',
  },
});
