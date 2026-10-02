import { MailService } from '@sendgrid/mail';

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private mailService: MailService | null = null;
  private isEnabled = false;

  constructor() {
    if (process.env.SENDGRID_API_KEY) {
      this.mailService = new MailService();
      this.mailService.setApiKey(process.env.SENDGRID_API_KEY);
      this.isEnabled = true;
    } else {
    }
  }

  async sendTransactionConfirmation(
    buyerEmail: string,
    buyerName: string,
    transactionId: string,
    totalAmount: number,
    platformFee: number,
    products: Array<{ title: string; quantity: number; price: number; seller: string }>,
    deliveryAddress: string
  ): Promise<boolean> {
    const emailData = {
      to: buyerEmail,
      from: 'noreply@studentxchange.com', // Replace with your verified sender email
      subject: `Transaction Successful - Order #${transactionId}`,
      html: this.generateTransactionConfirmationHTML(
        buyerName,
        transactionId,
        totalAmount,
        platformFee,
        products,
        deliveryAddress
      ),
      text: this.generateTransactionConfirmationText(
        buyerName,
        transactionId,
        totalAmount,
        platformFee,
        products,
        deliveryAddress
      )
    };

    return await this.sendEmail(emailData);
  }

  async sendDeliveryReminder(
    buyerEmail: string,
    buyerName: string,
    transactionId: string,
    daysRemaining: number
  ): Promise<boolean> {
    const emailData = {
      to: buyerEmail,
      from: 'noreply@studentxchange.com',
      subject: `Delivery Update - Order #${transactionId}`,
      html: this.generateDeliveryReminderHTML(buyerName, transactionId, daysRemaining),
      text: this.generateDeliveryReminderText(buyerName, transactionId, daysRemaining)
    };

    return await this.sendEmail(emailData);
  }

  async sendPasswordResetEmail(
    userEmail: string,
    username: string,
    resetToken: string,
    resetLink: string
  ): Promise<boolean> {
    const emailData = {
      to: userEmail,
      from: 'noreply@studentxchange.com',
      subject: 'Password Reset Request - StudentXchange',
      html: this.generatePasswordResetHTML(username, resetLink),
      text: this.generatePasswordResetText(username, resetLink)
    };

    return await this.sendEmail(emailData);
  }

  private generatePasswordResetHTML(username: string, resetLink: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { padding: 30px; background: #f9f9f9; }
            .button { display: inline-block; background: #4F46E5; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .footer { background: #6B7280; color: white; padding: 15px; text-align: center; border-radius: 0 0 10px 10px; }
            .warning { background: #FEF3C7; border: 1px solid #F59E0B; padding: 15px; border-radius: 8px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Password Reset Request</h1>
                <p>StudentXchange Marketplace</p>
            </div>
            
            <div class="content">
                <h2>Hello ${username},</h2>
                <p>We received a request to reset your password for your StudentXchange account.</p>
                
                <p>Click the button below to reset your password:</p>
                
                <div style="text-align: center;">
                    <a href="${resetLink}" class="button" style="color: white;">Reset My Password</a>
                </div>
                
                <div class="warning">
                    <strong>Important:</strong>
                    <ul>
                        <li>This link will expire in 1 hour</li>
                        <li>If you didn't request this reset, please ignore this email</li>
                        <li>Your password will remain unchanged until you click the link above</li>
                    </ul>
                </div>
                
                <p>If the button doesn't work, copy and paste this link into your browser:</p>
                <p style="word-break: break-all; background: #e5e7eb; padding: 10px; border-radius: 5px;">${resetLink}</p>
            </div>
            
            <div class="footer">
                <p>This is an automated email from StudentXchange</p>
                <p>Please do not reply to this email</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  private generatePasswordResetText(username: string, resetLink: string): string {
    return `
Password Reset Request - StudentXchange

Hello ${username},

We received a request to reset your password for your StudentXchange account.

Click the link below to reset your password:
${resetLink}

IMPORTANT:
- This link will expire in 1 hour
- If you didn't request this reset, please ignore this email
- Your password will remain unchanged until you click the link above

This is an automated email from StudentXchange. Please do not reply to this email.
    `;
  }

  private async sendEmail(emailData: EmailParams): Promise<boolean> {
    try {
      if (this.isEnabled && this.mailService) {
        await this.mailService.send(emailData);
        return true;
      } else {
        // Log email content when SendGrid is not available
        return true; // Return true for development/testing
      }
    } catch (error) {
      return false;
    }
  }

  private generateTransactionConfirmationHTML(
    buyerName: string,
    transactionId: string,
    totalAmount: number,
    platformFee: number,
    products: Array<{ title: string; quantity: number; price: number; seller: string }>,
    deliveryAddress: string
  ): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Transaction Successful</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .order-details { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; }
            .product-item { border-bottom: 1px solid #eee; padding: 10px 0; }
            .total { font-weight: bold; font-size: 1.2em; }
            .footer { background: #6B7280; color: white; padding: 15px; text-align: center; }
            .status-badge { background: #10B981; color: white; padding: 5px 10px; border-radius: 3px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎉 Transaction Successful!</h1>
                <p>Thank you for your purchase on StudentXchange</p>
            </div>
            
            <div class="content">
                <h2>Hello ${buyerName},</h2>
                <p>Your order has been successfully processed! Here are your transaction details:</p>
                
                <div class="order-details">
                    <h3>📋 Order Information</h3>
                    <p><strong>Transaction ID:</strong> ${transactionId}</p>
                    <p><strong>Status:</strong> <span class="status-badge">Payment Confirmed</span></p>
                    <p><strong>Order Date:</strong> ${new Date().toLocaleDateString('en-IN')}</p>
                </div>

                <div class="order-details">
                    <h3>📦 Products Ordered</h3>
                    ${products.map(product => `
                        <div class="product-item">
                            <strong>${product.title}</strong><br>
                            Quantity: ${product.quantity} × ₹${product.price.toFixed(2)} = ₹${(product.quantity * product.price).toFixed(2)}
                        </div>
                    `).join('')}
                </div>

                <div class="order-details">
                    <h3>💰 Payment Summary</h3>
                    <p>Subtotal: ₹${(totalAmount - platformFee).toFixed(2)}</p>
                    <p>Platform Fee: ₹${platformFee.toFixed(2)}</p>
                    <p class="total">Total Paid: ₹${totalAmount.toFixed(2)}</p>
                </div>

                <div class="order-details">
                    <h3>🚚 Delivery Information</h3>
                    <p><strong>Delivery Address:</strong><br>${deliveryAddress}</p>
                    <p><strong>Expected Delivery:</strong> Within 7 days</p>
                    <p>📅 <strong>Expected Delivery Date:</strong> ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN')}</p>
                </div>

                <div style="background: #FEF3C7; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <h4>⏱️ What happens next?</h4>
                    <p>• You will receive your products within <strong>7 days</strong></p>
                    <p>• We'll send you delivery updates via email</p>
                    <p>• Contact the seller if you have any questions about pickup</p>
                    <p>• Leave a review once you receive your products</p>
                </div>
            </div>

            <div class="footer">
                <p>Thank you for choosing StudentXchange!</p>
                <p>📞 Support: 7039862086 | 💳 UPI: hrishikesh.vallakati2006@oksbi</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  private generateTransactionConfirmationText(
    buyerName: string,
    transactionId: string,
    totalAmount: number,
    platformFee: number,
    products: Array<{ title: string; quantity: number; price: number; seller: string }>,
    deliveryAddress: string
  ): string {
    return `
🎉 Transaction Successful - StudentXchange

Hello ${buyerName},

Your order has been successfully processed!

📋 ORDER DETAILS:
Transaction ID: ${transactionId}
Status: Payment Confirmed
Order Date: ${new Date().toLocaleDateString('en-IN')}

📦 PRODUCTS ORDERED:
${products.map(product => 
  `- ${product.title}
   Qty: ${product.quantity} × ₹${product.price.toFixed(2)} = ₹${(product.quantity * product.price).toFixed(2)}`
).join('\n')}

💰 PAYMENT SUMMARY:
Subtotal: ₹${(totalAmount - platformFee).toFixed(2)}
Platform Fee: ₹${platformFee.toFixed(2)}
Total Paid: ₹${totalAmount.toFixed(2)}

🚚 DELIVERY INFORMATION:
Address: ${deliveryAddress}
Expected Delivery: Within 7 days
Expected Date: ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN')}

⏱️ WHAT HAPPENS NEXT?
• You will receive your products within 7 days
• We'll send you delivery updates via email
• Contact the seller if you have any questions
• Leave a review once you receive your products

Thank you for choosing StudentXchange!
Support: 7039862086 | UPI: hrishikesh.vallakati2006@oksbi
    `;
  }

  private generateDeliveryReminderHTML(
    buyerName: string,
    transactionId: string,
    daysRemaining: number
  ): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Delivery Update</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #10B981; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .update-box { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; }
            .footer { background: #6B7280; color: white; padding: 15px; text-align: center; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📦 Delivery Update</h1>
                <p>Your StudentXchange order is on its way!</p>
            </div>
            
            <div class="content">
                <h2>Hello ${buyerName},</h2>
                
                <div class="update-box">
                    <h3>🚚 Delivery Status</h3>
                    <p><strong>Transaction ID:</strong> ${transactionId}</p>
                    <p><strong>Days Remaining:</strong> ${daysRemaining} day(s)</p>
                    ${daysRemaining <= 1 ? 
                      '<p style="color: #10B981;"><strong>🎉 Your order should arrive today or tomorrow!</strong></p>' :
                      `<p>Your order is expected to arrive within <strong>${daysRemaining} days</strong>.</p>`
                    }
                </div>

                <div class="update-box">
                    <h3>📞 Need Help?</h3>
                    <p>If you have any questions about your delivery, feel free to contact us:</p>
                    <p>📞 Support: 7039862086</p>
                    <p>💳 UPI: hrishikesh.vallakati2006@oksbi</p>
                </div>
            </div>

            <div class="footer">
                <p>Thank you for choosing StudentXchange!</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  private generateDeliveryReminderText(
    buyerName: string,
    transactionId: string,
    daysRemaining: number
  ): string {
    return `
📦 Delivery Update - StudentXchange

Hello ${buyerName},

🚚 DELIVERY STATUS:
Transaction ID: ${transactionId}
Days Remaining: ${daysRemaining} day(s)

${daysRemaining <= 1 ? 
  '🎉 Your order should arrive today or tomorrow!' :
  `Your order is expected to arrive within ${daysRemaining} days.`
}

📞 NEED HELP?
If you have any questions about your delivery:
Support: 7039862086
UPI: hrishikesh.vallakati2006@oksbi

Thank you for choosing StudentXchange!
    `;
  }
}

export const emailService = new EmailService();