// src/services/pdfConverter.js
const { fromPath } = require('pdf2pic');
const path = require('path');
const fs   = require('fs');
const { uploadFile, R2_ENABLED } = require('./storage');

/**
 * Converts a PDF file into a series of PNG images (one per page).
 * If R2 is configured, uploads to Cloudflare R2 and returns CDN URLs.
 * Otherwise falls back to local filesystem storage.
 */
async function convertPdfToImages(pdfPath, outputSlug) {
  const baseDir   = process.env.STORAGE_PATH || './public/uploads';
  const outputDir = path.join(baseDir, outputSlug);

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const options = {
    density:      150,
    saveFilename: 'page',
    savePath:     outputDir,
    format:       'png',
    width:        1200,
    height:       1600,
  };

  const convert = fromPath(pdfPath, options);
  const results = await convert.bulk(-1, { responseType: 'image' });
  const pageCount = results.length;

  if (R2_ENABLED) {
    // Upload each page to R2
    console.log(`Uploading ${pageCount} pages to R2...`);
    const uploadPromises = results.map((_, i) => {
      const localFile = path.join(outputDir, `page.${i + 1}.png`);
      const r2Key     = `${outputSlug}/page.${i + 1}.png`;
      return uploadFile(localFile, r2Key);
    });

    const urls = await Promise.all(uploadPromises);

    // Clean up local temp files after upload
    fs.rmSync(outputDir, { recursive: true, force: true });

    console.log(`Uploaded ${pageCount} pages to R2 successfully`);
    return { outputDir: null, pageCount, pages: urls };
  }

  // Local fallback
  return {
    outputDir,
    pageCount,
    pages: results.map((_, i) => `/uploads/${outputSlug}/page.${i + 1}.png`),
  };
}

module.exports = { convertPdfToImages };