// src/routes/viewer.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/v/:slug', async (req, res) => {
  const flipbook = await prisma.flipbook.findUnique({ where: { slug: req.params.slug } });

  if (!flipbook || !flipbook.isActive) {
    return res.status(404).render('404');
  }

  prisma.flipbook.update({
    where: { slug: req.params.slug },
    data:  { viewCount: { increment: 1 } },
  }).catch(() => {});

  let pages;
  if (flipbook.pageUrls && flipbook.pageUrls.length > 0) {
    pages = flipbook.pageUrls.split(',');
  } else {
    pages = Array.from({ length: flipbook.pageCount }, (_, i) =>
      `/uploads/${flipbook.pagesDir}/page.${i + 1}.png`
    );
  }

  res.render('viewer', { flipbook, pages });
});

router.get('/', (req, res) => {
  res.redirect('/admin');
});

module.exports = router;