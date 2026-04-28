// src/routes/viewer.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/v/:slug', async (req, res) => {
  try {
    const slug = req.params.slug;
    console.log('Looking up slug:', slug);
    
    const flipbook = await prisma.flipbook.findUnique({ 
      where: { slug } 
    });

    console.log('Found flipbook:', JSON.stringify(flipbook));

    if (!flipbook || !flipbook.isActive) {
      console.log('Returning 404 - flipbook:', flipbook?.id, 'isActive:', flipbook?.isActive);
      return res.status(404).render('404');
    }

    prisma.flipbook.update({
      where: { slug },
      data: { viewCount: { increment: 1 } },
    }).catch(() => {});

    let pages;
    if (flipbook.pageUrls && flipbook.pageUrls.length > 0) {
      pages = flipbook.pageUrls.split(',');
    } else {
      pages = Array.from({ length: flipbook.pageCount }, (_, i) =>
        `/uploads/${flipbook.pagesDir}/page.${i + 1}.png`
      );
    }

    console.log('Rendering with', pages.length, 'pages');
    res.render('viewer', { flipbook, pages });
  } catch (err) {
    console.error('Viewer error:', err);
    res.status(500).send('Server error: ' + err.message);
  }
});

router.get('/', (req, res) => {
  res.redirect('/admin');
});

module.exports = router;