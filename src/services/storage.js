// src/services/storage.js
// Cloudflare R2 storage using the S3-compatible API

const { S3Client, PutObjectCommand, DeleteObjectsCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const fs = require('fs');

const R2_ENABLED = !!(
  process.env.R2_ACCOUNT_ID &&
  process.env.R2_ACCESS_KEY_ID &&
  process.env.R2_SECRET_ACCESS_KEY &&
  process.env.R2_BUCKET_NAME
);

let s3;
if (R2_ENABLED) {
  s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId:     process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
}

/**
 * Upload a single file to R2.
 * Returns the public URL of the uploaded file.
 */
async function uploadFile(localPath, r2Key) {
  if (!R2_ENABLED) {
    throw new Error('R2 not configured');
  }

  const fileBuffer = fs.readFileSync(localPath);

  await s3.send(new PutObjectCommand({
    Bucket:      process.env.R2_BUCKET_NAME,
    Key:         r2Key,
    Body:        fileBuffer,
    ContentType: 'image/png',
    // Make publicly readable
    ACL:         'public-read',
  }));

  return `${process.env.R2_PUBLIC_URL}/${r2Key}`;
}

/**
 * Delete all objects in R2 under a given prefix (e.g. a flipbook's folder).
 */
async function deleteFolder(prefix) {
  if (!R2_ENABLED) return;

  // List all objects under the prefix
  const listed = await s3.send(new ListObjectsV2Command({
    Bucket: process.env.R2_BUCKET_NAME,
    Prefix: prefix,
  }));

  if (!listed.Contents || listed.Contents.length === 0) return;

  await s3.send(new DeleteObjectsCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Delete: {
      Objects: listed.Contents.map(obj => ({ Key: obj.Key })),
    },
  }));
}

module.exports = { uploadFile, deleteFolder, R2_ENABLED };