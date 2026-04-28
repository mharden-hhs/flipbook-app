// src/routes/admin.js
const express  = require('express');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const { customAlphabet } = require('nanoid');
const QRCode   = require('qrcode');
const { PrismaClient } = require('@prisma/client');
const { requireAuth }  = require('../middleware/requireAuth');
const { convertPdfToImages } = require('../services/pdfConverter');

const router  = express.Router();
const prisma  = new PrismaClient();
const nanoid  = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 6);

// Multer — store uploaded PDFs temporarily
const upload = multer({
  dest: './tmp/',
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed.'));
  },
});

// All admin routes require login
router.use(requireAuth);

// ─── Dashboard ───────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const flipbooks = await prisma.flipbook.findMany({
    orderBy: { createdAt: 'desc' },
  });
  res.render('admin/dashboard', { user: req.user, flipbooks });
});

// ─── Upload form ──────────────────────────────────────────────────────────────
router.get('/upload', (req, res) => {
  res.render('admin/upload', { user: req.user, error: null });
});

// ─── Process upload ───────────────────────────────────────────────────────────
router.post('/upload', upload.single('pdf'), async (req, res) => {
  if (!req.file) {
    return res.render('admin/upload', { user: req.user, error: 'Please select a PDF file.' });
  }

  const title = req.body.title?.trim() || path.parse(req.file.originalname).name;
  const slug  = nanoid();

  try {
    const { pageCount } = await convertPdfToImages(req.file.path, slug);

    await prisma.flipbook.create({
      data: {
        slug,
        title,
        pageCount,
        createdBy: req.user.email,
        pagesDir:  slug,
      },
    });

    // Clean up tmp file
    fs.unlink(req.file.path, () => {});

    res.redirect(`/admin/flipbook/${slug}`);
  } catch (err) {
    console.error('Conversion error:', err);
    fs.unlink(req.file.path, () => {});
    res.render('admin/upload', {
      user: req.user,
      error: 'PDF conversion failed. Make sure the file is a valid PDF.',
    });
  }
});

// ─── Single flipbook detail + QR ──────────────────────────────────────────────
router.get('/flipbook/:slug', async (req, res) => {
  const flipbook = await prisma.flipbook.findUnique({ where: { slug: req.params.slug } });
  if (!flipbook) return res.status(404).render('404');

  const publicUrl = `${process.env.APP_URL}/v/${flipbook.slug}`;
  const qrDataUrl = await QRCode.toDataURL(publicUrl, { width: 200, margin: 2 });

  res.render('admin/flipbook', { user: req.user, flipbook, publicUrl, qrDataUrl, queryString: req.url.split('?')[1] || '' });
});

// ─── Toggle active/inactive ───────────────────────────────────────────────────
router.post('/flipbook/:slug/toggle', async (req, res) => {
  const flipbook = await prisma.flipbook.findUnique({ where: { slug: req.params.slug } });
  if (!flipbook) return res.status(404).end();

  await prisma.flipbook.update({
    where: { slug: req.params.slug },
    data:  { isActive: !flipbook.isActive },
  });

  res.redirect(`/admin/flipbook/${req.params.slug}`);
});

// ─── Replace PDF (keeps same slug/URL/QR code) ────────────────────────────────
router.post('/flipbook/:slug/replace', upload.single('pdf'), async (req, res) => {
  const flipbook = await prisma.flipbook.findUnique({ where: { slug: req.params.slug } });
  if (!flipbook) return res.status(404).end();

  if (!req.file) {
    return res.redirect(`/admin/flipbook/${req.params.slug}?error=nofile`);
  }

  try {
    // Delete old page images
    const oldDir = path.join(process.env.STORAGE_PATH || './public/uploads', flipbook.pagesDir);
    if (fs.existsSync(oldDir)) fs.rmSync(oldDir, { recursive: true });

    // Convert new PDF into the same pagesDir so the slug/URL never changes
    const { pageCount } = await convertPdfToImages(req.file.path, flipbook.pagesDir);

    await prisma.flipbook.update({
      where: { slug: req.params.slug },
      data: {
        pageCount,
        updatedAt: new Date(),
      },
    });

    fs.unlink(req.file.path, () => {});
    res.redirect(`/admin/flipbook/${req.params.slug}?replaced=1`);
  } catch (err) {
    console.error('Replace error:', err);
    fs.unlink(req.file.path, () => {});
    res.redirect(`/admin/flipbook/${req.params.slug}?error=conversion`);
  }
});

// ─── Delete ───────────────────────────────────────────────────────────────────
router.post('/flipbook/:slug/delete', async (req, res) => {
  const flipbook = await prisma.flipbook.findUnique({ where: { slug: req.params.slug } });
  if (!flipbook) return res.status(404).end();

  // Delete page images from disk
  const dir = path.join(process.env.STORAGE_PATH || './public/uploads', flipbook.pagesDir);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true });

  await prisma.flipbook.delete({ where: { slug: req.params.slug } });

  res.redirect('/admin');
});

module.exports = router;