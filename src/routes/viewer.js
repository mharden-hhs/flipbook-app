// src/routes/viewer.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// Public flipbook viewer — no auth
router.get('/v/:slug', async (req, res) => {
  const flipbook = await prisma.flipbook.findUnique({ where: { slug: req.params.slug } });

  if (!flipbook || !flipbook.isActive) {
    return res.status(404).render('404');
  }

  // Increment view count (fire and forget)
  prisma.flipbook.update({
    where: { slug: req.params.slug },
    data:  { viewCount: { increment: 1 } },
  }).catch(() => {});

  // Build array of page image URLs
  const pages = Array.from({ length: flipbook.pageCount }, (_, i) =>
    `/uploads/${flipbook.pagesDir}/page.${i + 1}.png`
  );

  res.render('viewer', { flipbook, pages });
});

// Home — redirect to admin
router.get('/', (req, res) => {
  res.redirect('/admin');
});

module.exports = router;
