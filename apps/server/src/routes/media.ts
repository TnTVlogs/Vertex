import { Router, Request, Response } from 'express';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const router = Router();
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

// GET /api/v1/media/transcode?file=attachments/UUID.mp4
// Public — original uploads are already public. Path validated to uploads dir only.
router.get('/transcode', (req: Request, res: Response) => {
    const filePart = req.query.file as string;
    if (!filePart) return res.status(400).json({ error: 'Missing file param' });

    const fullPath = path.normalize(path.join(UPLOADS_DIR, filePart));
    if (!fullPath.startsWith(UPLOADS_DIR + path.sep) && fullPath !== UPLOADS_DIR) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    if (!fs.existsSync(fullPath)) return res.status(404).json({ error: 'Not found' });

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cache-Control', 'public, max-age=86400');

    const ff = spawn('ffmpeg', [
        '-i', fullPath,
        '-vn',
        '-acodec', 'libmp3lame',
        '-ab', '128k',
        '-f', 'mp3',
        'pipe:1',
    ]);

    ff.stdout.pipe(res);
    ff.stderr.on('data', () => {}); // suppress ffmpeg logs
    ff.on('error', (err) => {
        if (!res.headersSent) res.status(500).json({ error: 'ffmpeg not available', detail: err.message });
    });
    ff.on('close', (code) => {
        if (code !== 0 && !res.writableEnded) res.end();
    });
});

export default router;
