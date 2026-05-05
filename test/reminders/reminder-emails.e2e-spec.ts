/* eslint-disable @typescript-eslint/no-unsafe-call */
import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { cleanupApplication, setupApplication } from '~/test/setup_e2e';
import { ADMIN_ID } from '~/infrastructure/database/const/shared-data';
import { createOrder, fetchAvailableTicket } from '../tickets/tickets.utils';
import { loginAdmin } from '../common/auth';
import { mailpitHelper } from '../infrastructure/mailpit';

describe('Reminder Emails (e2e)', () => {
  let app: INestApplication<App>;
  let moduleFixture: TestingModule;
  let accessToken: string;
  let eventId: string;
  let ticketId: string;
  const waitForReminderEmails = async (expectedCount: number, timeoutMs = 15000) => {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const messages = await mailpitHelper.getMessages();
      const reminderEmails = messages.messages.filter((msg) => msg.Subject.includes('Reminder'));

      if (reminderEmails.length >= expectedCount) return reminderEmails;

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    throw new Error(`Timed out waiting for ${expectedCount} reminder emails`);
  };

  beforeAll(async () => {
    [app, moduleFixture] = await setupApplication();

    // Verify Mailpit is available before running tests
    const mailpitAvailable = await mailpitHelper.isAvailable();
    if (!mailpitAvailable) {
      throw new Error(`Mailpit is not available. Please ensure Mailpit is running on ${mailpitHelper.getBaseUrl()}`);
    }

    const session = await loginAdmin(app);
    accessToken = session.accessToken;

    const ticket = await fetchAvailableTicket(app, accessToken);
    eventId = ticket.eventId;
    ticketId = ticket.id;
  });

  afterAll(async () => {
    await cleanupApplication(app, moduleFixture);
  });

  describe('Reminder Email Delivery', () => {
    let orderId: string;

    beforeEach(async () => {
      // Clear inbox before each test
      await mailpitHelper.clearMessages();
    });

    beforeAll(async () => {
      const order = await createOrder(app, accessToken, eventId, ticketId);
      orderId = order.id;
    });

    it('should send reminder email when event reminder is scheduled for order', async () => {
      const eventResponse = await request(app.getHttpServer())
        .get(`/events/${eventId}`)
        .set('Cookie', [`access_token=s:${accessToken}`])
        .expect(200);

      const eventData = eventResponse.body.data;

      // Schedule reminders for the order
      await request(app.getHttpServer())
        .post(`/reminders/order/${orderId}/schedule`)
        .set('Cookie', [`access_token=s:${accessToken}`])
        .send({
          eventId,
          reminderTimes: ['10001d'],
        })
        .expect(201);

      // Wait for reminder email to be sent
      const [email] = await waitForReminderEmails(1, 15000);

      // Assert email details
      expect(email).toBeDefined();
      expect(email.Subject).toContain('Reminder');
      expect(email.To.length).toBeGreaterThan(0);

      // Get detailed email information
      const emailDetail = await mailpitHelper.getMessage(email.ID);
      expect(emailDetail.From.Address).toBeDefined();
      expect(emailDetail.HTML).toBeDefined();
      expect(emailDetail.Text).toBeDefined();
      expect(emailDetail.HTML).toContain(eventData.title);
    });

    it('should send multiple reminder emails for different reminder times', async () => {
      // Schedule reminders with multiple times
      await request(app.getHttpServer())
        .post(`/reminders/order/${orderId}/schedule`)
        .set('Cookie', [`access_token=s:${accessToken}`])
        .send({
          eventId,
          reminderTimes: ['10000d', '9999d', '9998d'], // Force immediate delivery in this test
        })
        .expect(201);

      // Wait for multiple reminder emails
      const emails = await waitForReminderEmails(3, 20000);

      // Assert we received 3 different reminder emails
      expect(emails).toHaveLength(3);
      expect(emails.every((email) => email.Subject.includes('Reminder'))).toBe(true);

      // Ensure all emails have unique IDs
      const emailIds = emails.map((email) => email.ID);
      const uniqueIds = new Set(emailIds);
      expect(uniqueIds.size).toBe(3);
    });

    it('should send reminder email with proper event details', async () => {
      // Get event details to verify in email
      const eventResponse = await request(app.getHttpServer())
        .get(`/events/${eventId}`)
        .set('Cookie', [`access_token=s:${accessToken}`])
        .expect(200);

      const eventData = eventResponse.body.data;

      // Schedule reminder
      await request(app.getHttpServer())
        .post(`/reminders/order/${orderId}/schedule`)
        .set('Cookie', [`access_token=s:${accessToken}`])
        .send({
          eventId,
          reminderTimes: ['9997d'],
        })
        .expect(201);

      // Wait for reminder email
      const [email] = await waitForReminderEmails(1, 15000);
      const emailDetail = await mailpitHelper.getMessage(email.ID);

      // Assert email contains event details
      expect(emailDetail.HTML).toContain(eventData.title);
      expect(emailDetail.HTML).toContain(eventData.description);
      expect(emailDetail.HTML).toContain(eventData.location);
    });

    it('should send reminder email to correct recipient', async () => {
      // Get user details to verify recipient
      const userResponse = await request(app.getHttpServer())
        .get(`/users/${ADMIN_ID}`)
        .set('Cookie', [`access_token=s:${accessToken}`])
        .expect(200);

      const userData = userResponse.body.data;

      // Schedule reminder
      await request(app.getHttpServer())
        .post(`/reminders/order/${orderId}/schedule`)
        .set('Cookie', [`access_token=s:${accessToken}`])
        .send({
          eventId,
          reminderTimes: ['9996d'],
        })
        .expect(201);

      // Wait for reminder email
      const [email] = await waitForReminderEmails(1, 15000);

      // Assert recipient is correct
      expect(email).toBeDefined();
      expect(email.To.some((to) => to.Address === userData.email)).toBe(true);
    });

    it('should include order details in reminder email', async () => {
      // Get order details
      const orderResponse = await request(app.getHttpServer())
        .get(`/orders/${orderId}`)
        .set('Cookie', [`access_token=s:${accessToken}`])
        .expect(200);

      const orderData = orderResponse.body.data;

      // Schedule reminder
      await request(app.getHttpServer())
        .post(`/reminders/order/${orderId}/schedule`)
        .set('Cookie', [`access_token=s:${accessToken}`])
        .send({
          eventId,
          reminderTimes: ['9995d'],
        })
        .expect(201);

      // Wait for reminder email
      const [email] = await waitForReminderEmails(1, 15000);

      const emailDetail = await mailpitHelper.getMessage(email.ID);

      // Assert email contains order details
      expect(emailDetail.HTML).toContain(orderData.id);
      expect(emailDetail.HTML).toContain(String(orderData.orderItems?.length ?? 0));
      expect(emailDetail.HTML).toContain(orderData.totalAmount.toString());
    });

    it('should handle reminder email scheduling failure gracefully', async () => {
      // Try to schedule reminder with invalid event ID
      const invalidEventId = 'invalid-event-id';

      const response = await request(app.getHttpServer())
        .post(`/reminders/order/${orderId}/schedule`)
        .set('Cookie', [`access_token=s:${accessToken}`])
        .send({
          eventId: invalidEventId,
        });

      // Should return error
      expect(response.status).toBeGreaterThanOrEqual(400);

      // Verify no email was sent
      await expect(mailpitHelper.waitForEmailWithSubject('Reminder', 3000)).rejects.toThrow('Email not found within 3000ms timeout');
    });

    it('should send reminder email with proper HTML formatting', async () => {
      // Schedule reminder
      await request(app.getHttpServer())
        .post(`/reminders/order/${orderId}/schedule`)
        .set('Cookie', [`access_token=s:${accessToken}`])
        .send({
          eventId,
          reminderTimes: ['9994d'],
        })
        .expect(201);

      // Wait for reminder email
      const [email] = await waitForReminderEmails(1, 15000);

      const emailDetail = await mailpitHelper.getMessage(email.ID);

      // Assert HTML structure
      expect(emailDetail.HTML).toContain('<html>');
      expect(emailDetail.HTML).toContain('</html>');
      expect(emailDetail.HTML).toContain('<body>');
      expect(emailDetail.HTML).toContain('</body>');

      // Assert text version is also available
      expect(emailDetail.Text).toBeDefined();
      expect(emailDetail.Text.length).toBeGreaterThan(0);
    });

    it('should not send duplicate reminder emails', async () => {
      // Schedule reminder twice
      await request(app.getHttpServer())
        .post(`/reminders/order/${orderId}/schedule`)
        .set('Cookie', [`access_token=s:${accessToken}`])
        .send({
          eventId,
          reminderTimes: ['9993d'],
        })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/reminders/order/${orderId}/schedule`)
        .set('Cookie', [`access_token=s:${accessToken}`])
        .send({
          eventId,
          reminderTimes: ['9993d'],
        })
        .expect(201); // May return 201 but should not create duplicate emails

      const firstBatch = await waitForReminderEmails(1, 15000);
      const reminderEmails = firstBatch.filter((msg) => msg.Subject.includes('Reminder'));
      expect(reminderEmails).toHaveLength(1);

      await request(app.getHttpServer())
        .post(`/reminders/order/${orderId}/schedule`)
        .set('Cookie', [`access_token=s:${accessToken}`])
        .send({
          eventId,
          reminderTimes: ['9993d'],
        })
        .expect(201);

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const messages = await mailpitHelper.getMessages();
      const allReminderEmails = messages.messages.filter((msg) => msg.Subject.includes('Reminder'));
      expect(allReminderEmails).toHaveLength(1);
    });
  });
});
