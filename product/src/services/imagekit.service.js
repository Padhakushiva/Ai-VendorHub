const ImageKit = require('imagekit');

// Initialize ImageKit instance
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});



/**
 * Upload file to ImageKit
 * @param {Buffer} fileBuffer - File buffer from multer
 * @param {string} fileName - File name
 * @returns {Promise<Object>} ImageKit upload response
 */
const uploadToImageKit = async (fileBuffer, fileName) => {
  try {
    const response = await imagekit.upload({
      file: fileBuffer,
      fileName: fileName,
    });
    return response;
  } catch (error) {
    throw new Error(`ImageKit upload failed: ${error.message}`);
  }
};

/**
 * Delete file from ImageKit
 * @param {string} fileId - ImageKit file ID
 * @returns {Promise<void>}
 */
const deleteFromImageKit = async (fileId) => {
  try {
    await imagekit.deleteFile(fileId);
  } catch (error) {
    throw new Error(`ImageKit delete failed: ${error.message}`);
  }
};

module.exports = {
  uploadToImageKit,
  deleteFromImageKit,
  imagekit,
};
