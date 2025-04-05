const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: 'dsyhebn93',
  api_key: '737315315221364',
  api_secret: '9rdclXF9E7yfu8HTcRPZwednd3g'
});

module.exports = cloudinary;