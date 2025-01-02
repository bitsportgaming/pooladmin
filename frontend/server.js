import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function createServer() {
  const app = express();
  const port = process.env.PORT || 3003;

  if (process.env.NODE_ENV === 'production') {
    // Serve production build
    app.use(express.static(join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(join(__dirname, 'dist', 'index.html'));
    });
  } else {
    // Create Vite server in middleware mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });

    app.use(vite.middlewares);
  }

  app.listen(port, () => {
    console.log(`Frontend server running on port ${port} in ${process.env.NODE_ENV || 'development'} mode`);
  });
}

createServer().catch(console.error);
