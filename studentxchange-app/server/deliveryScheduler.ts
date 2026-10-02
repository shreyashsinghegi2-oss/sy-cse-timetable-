import { emailService } from "./emailService";
import { storage } from "./storage";

interface DeliveryReminder {
  orderId: number;
  buyerEmail: string;
  buyerName: string;
  transactionId: string;
  deliveryDate: Date;
  remindersSent: number;
}

class DeliverySchedulerService {
  private reminders: Map<number, DeliveryReminder> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startDeliveryReminders();
  }

  // Schedule a delivery reminder for an order
  scheduleDeliveryReminder(
    orderId: number,
    buyerEmail: string,
    buyerName: string,
    transactionId: string
  ) {
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 7); // 7 days from now

    const reminder: DeliveryReminder = {
      orderId,
      buyerEmail,
      buyerName,
      transactionId,
      deliveryDate,
      remindersSent: 0
    };

    this.reminders.set(orderId, reminder);
  }

  // Start the periodic check for delivery reminders
  private startDeliveryReminders() {
    // Check every 12 hours
    this.checkInterval = setInterval(() => {
      this.checkAndSendReminders();
    }, 12 * 60 * 60 * 1000);

  }

  // Check and send delivery reminders
  private async checkAndSendReminders() {
    const now = new Date();
    
    for (const [orderId, reminder] of Array.from(this.reminders.entries())) {
      try {
        // Check if order is still pending delivery
        const order = await storage.getOrder(orderId);
        if (!order || order.status === 'completed' || order.status === 'cancelled') {
          // Remove reminder if order is completed or cancelled
          this.reminders.delete(orderId);
          continue;
        }

        const daysUntilDelivery = Math.ceil((reminder.deliveryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        // Send reminders at day 5, day 3, day 1, and day 0 (delivery day)
        const shouldSendReminder = 
          (daysUntilDelivery === 5 && reminder.remindersSent === 0) ||
          (daysUntilDelivery === 3 && reminder.remindersSent === 1) ||
          (daysUntilDelivery === 1 && reminder.remindersSent === 2) ||
          (daysUntilDelivery === 0 && reminder.remindersSent === 3);

        if (shouldSendReminder) {
          await emailService.sendDeliveryReminder(
            reminder.buyerEmail,
            reminder.buyerName,
            reminder.transactionId,
            Math.max(0, daysUntilDelivery)
          );

          reminder.remindersSent++;
        }

        // Remove reminder after 7 days past delivery date
        if (daysUntilDelivery < -7) {
          this.reminders.delete(orderId);
        }

      } catch (error) {
      }
    }
  }

  // Manually trigger reminder check (for testing)
  async triggerReminderCheck() {
    await this.checkAndSendReminders();
  }

  // Get scheduled reminders (for admin dashboard)
  getScheduledReminders(): Array<{orderId: number, deliveryDate: string, daysRemaining: number}> {
    const now = new Date();
    return Array.from(this.reminders.entries()).map(([orderId, reminder]) => {
      const daysRemaining = Math.ceil((reminder.deliveryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return {
        orderId,
        deliveryDate: reminder.deliveryDate.toLocaleDateString('en-IN'),
        daysRemaining: Math.max(0, daysRemaining)
      };
    });
  }

  // Stop the delivery reminder service
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}

export const deliveryScheduler = new DeliverySchedulerService();