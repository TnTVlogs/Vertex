import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const AVATAR_DIR = path.join(UPLOAD_DIR, 'avatars');
const ATTACHMENT_DIR = path.join(UPLOAD_DIR, 'attachments');

[AVATAR_DIR, ATTACHMENT_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const avatarStorage = multer.diskStorage({
    destination: AVATAR_DIR,
    filename: (_req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname).toLowerCase()}`),
});

const attachmentStorage = multer.diskStorage({
    destination: ATTACHMENT_DIR,
    filename: (_req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname).toLowerCase()}`),
});

const AVATAR_MIME = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const ATTACHMENT_MIME = new Set([
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain',
    'video/mp4', 'video/webm',
    'audio/mpeg', 'audio/mp3',
]);

export const avatarUpload = multer({
    storage: avatarStorage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
    fileFilter: (_req, file, cb) => {
        if (AVATAR_MIME.has(file.mimetype)) cb(null, true);
        else cb(new Error('Only images allowed for avatars (jpeg, png, gif, webp)'));
    },
});

export const attachmentUpload = multer({
    storage: attachmentStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    fileFilter: (_req, file, cb) => {
        if (ATTACHMENT_MIME.has(file.mimetype)) cb(null, true);
        else cb(new Error('File type not allowed'));
    },
});
