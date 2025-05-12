const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

// Create a transporter using SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  tls: {
    // Do not fail on invalid certificates
    rejectUnauthorized: false
  }
});

// Verify SMTP connection configuration
transporter.verify(function(error, success) {
  if (error) {
    console.error('SMTP connection error:', error);
  } else {
    console.log('SMTP server is ready to send emails');
  }
});

// Function to send victory email
const sendVictoryEmail = async (winner, product) => {
  try {
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: winner.email,
      subject: 'Congratulations! You Won the Auction',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">Congratulations! 🎉</h2>
          <p>You have successfully won the auction for:</p>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <h3 style="color: #2c3e50; margin-top: 0;">${product.name}</h3>
            <p style="color: #34495e;">Final Price: $${product.currentPrice}</p>
          </div>
          <p>Please proceed with the payment to claim your item. You can do this by visiting your "My Wins" section in your account.</p>
          <div style="margin-top: 20px;">
            <p style="color: #7f8c8d; font-size: 0.9em;">Thank you for participating in our auction!</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Victory email sent successfully');
    return true;
  } catch (error) {
    console.error('Error sending victory email:', error);
    return false;
  }
};

// Function to send payment confirmation email
const sendPaymentConfirmationEmail = async (user, product) => {
  try {
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: user.email,
      subject: 'Payment Confirmation - Your Order is Being Processed',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">Payment Successful! 🎉</h2>
          <p>Thank you for your payment. Your order is now being processed:</p>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <h3 style="color: #2c3e50; margin-top: 0;">${product.name}</h3>
            <p style="color: #34495e;">Amount Paid: $${product.currentPrice}</p>
          </div>
          <p>Your order will be dispatched soon. We'll keep you updated on the shipping status.</p>
          <div style="margin-top: 20px;">
            <p style="color: #7f8c8d; font-size: 0.9em;">Thank you for shopping with us!</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Payment confirmation email sent successfully');
    return true;
  } catch (error) {
    console.error('Error sending payment confirmation email:', error);
    return false;
  }
};

module.exports = {
  transporter,
  sendVictoryEmail,
  sendPaymentConfirmationEmail
};