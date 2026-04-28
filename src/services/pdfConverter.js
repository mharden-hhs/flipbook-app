// src/services/pdfConverter.js
const { fromPath } = require('pdf2pic');
const path = require('path');
const fs   = require('fs');

/**
 * Converts a PDF file into a series of PNG images (one per page).
 * Returns the output directory path and page count.
 */
async function convertPdfToImages(pdfPath, outputSlug) {
  const baseDir   = process.env.STORAGE_PATH || './public/uploads';
  const outputDir = path.join(baseDir, outputSlug);

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const options = {
    density:    150,       // DPI — 150 is a good balance of quality vs file size
    saveFilename: 'page',
    savePath:   outputDir,
    format:     'png',
    width:      1200,
    height:     1600,
  };

  const convert = fromPath(pdfPath, options);

  // Convert all pages (passing -1 converts every page)
  const results = await convert.bulk(-1, { responseType: 'image' });

  return {
    outputDir,
    pageCount: results.length,
    // paths relative to public/ for serving
    pages: results.map((_, i) =>
      `/uploads/${outputSlug}/page.${i + 1}.png`
    ),
  };
}

module.exports = { convertPdfToImages };
