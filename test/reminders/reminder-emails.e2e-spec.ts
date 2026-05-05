/* eslint-disable @typescript-eslint/no-unsafe-call */
import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { cleanupApplication, setupApplication } from '~/test/setup_e2e';
import { createOrder, fetchAvailableTicket } from '../tickets/tickets.utils';
import { loginAdmin } from '../common/auth';
import { mailpitHelper } from '../infrastructure/mailpit';

describe('Reminder Emails (e2e)', () => {
  let app: INestApplication<App>;
  let moduleFixture: TestingModule;
  let accessToken: string;
  let eventId: string;
  let ticketId: string;

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
      // Schedule reminders for the order
      await request(app.getHttpServer())
        .post(`/reminders/order/${orderId}/schedule`)
        .set('Cookie', [`access_token=s:${accessToken}`])
        .send({
          eventId,
        })
        .expect(201);

      // Wait for reminder email to be sent
      const email = await mailpitHelper.waitForEmailWithSubject('Reminder', 15000);

      // Assert email details
      expect(email).toBeDefined();
      expect(email.Subject).toContain('Reminder');
      expect(email.HTML).toBeDefined();
      expect(email.Text).toBeDefined();
      expect(email.To.length).toBeGreaterThan(0);

      // Get detailed email information
      const emailDetail = await mailpitHelper.getMessage(email.ID);
      expect(emailDetail.From.Address).toBeDefined();
      expect(emailDetail.HTML).toContain(eventId);
    });

    it('should send multiple reminder emails for different reminder times', async () => {
      // Schedule reminders with multiple times
      await request(app.getHttpServer())
        .post(`/reminders/order/${orderId}/schedule`)
        .set('Cookie', [`access_token=s:${accessToken}`])
        .send({
          eventId,
          reminderTimes: ['1h', '24h', '3d'], // 1 hour, 24 hours, and 3 days before
        })
        .expect(201);

      // Wait for multiple reminder emails
      const emails = [];
      for (let i = 0; i < 3; i++) {
        const email = await mailpitHelper.waitForEmailWithSubject('Reminder', 20000);
        emails.push(email);
      }

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

      const eventData = eventResponse.body;

      // Schedule reminder
      await request(app.getHttpServer())
        .post(`/reminders/order/${orderId}/schedule`)
        .set('Cookie', [`access_token=s:${accessToken}`])
        .send({
          eventId,
        })
        .expect(201);

      // Wait for reminder email
      const email = await mailpitHelper.waitForEmailWithSubject('Reminder', 15000);

      // Get detailed email
      const emailDetail = await mailpitHelper.getMessage(email.ID);

      // Assert email contains event details
      expect(emailDetail.HTML).toContain(eventData.title);
      expect(emailDetail.HTML).toContain(eventData.description);
      expect(emailDetail.HTML).toContain(eventData.location);
      expect(emailDetail.HTML).toContain(eventData.startDate);
    });

    it('should send reminder email to correct recipient', async () => {
      // Get user details to verify recipient
      const userResponse = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Cookie', [`access_token=s:${accessToken}`])
        .expect(200);

      const userData = userResponse.body;

      // Schedule reminder
      await request(app.getHttpServer())
        .post(`/reminders/order/${orderId}/schedule`)
        .set('Cookie', [`access_token=s:${accessToken}`])
        .send({
          eventId,
        })
        .expect(201);

      // Wait for reminder email
      const email = await mailpitHelper.waitForEmailTo(userData.email as string, 15000);

      // Assert recipient is correct
      expect(email).toBeDefined();
      expect(email.To.some((to) => to.Address === userData.email)).toBe(true);
      expect(email.To.some((to) => to.Name === userData.name)).toBe(true);
    });

    it('should include order details in reminder email', async () => {
      // Get order details
      const orderResponse = await request(app.getHttpServer())
        .get(`/orders/${orderId}`)
        .set('Cookie', [`access_token=s:${accessToken}`])
        .expect(200);

      const orderData = orderResponse.body;

      // Schedule reminder
      await request(app.getHttpServer())
        .post(`/reminders/order/${orderId}/schedule`)
        .set('Cookie', [`access_token=s:${accessToken}`])
        .send({
          eventId,
        })
        .expect(201);

      // Wait for reminder email
      const email = await mailpitHelper.waitForEmailWithSubject('Reminder', 15000);

      // Get detailed email
      const emailDetail = await mailpitHelper.getMessage(email.ID);

      // Assert email contains order details
      expect(emailDetail.HTML).toContain(orderData.id);
      expect(emailDetail.HTML).toContain(orderData.ticketQuantity.toString());
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
        })
        .expect(201);

      // Wait for reminder email
      const email = await mailpitHelper.waitForEmailWithSubject('Reminder', 15000);

      // Get detailed email
      const emailDetail = await mailpitHelper.getMessage(email.ID);

      // Assert HTML structure
      expect(emailDetail.HTML).toContain('<html>');
      expect(emailDetail.HTML).toContain('</html>');
      expect(emailDetail.HTML).toContain('<body>');
      expect(emailDetail.HTML).toContain('</body>');
      expect(emailDetail.ContentType).toContain('text/html');

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
        })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/reminders/order/${orderId}/schedule`)
        .set('Cookie', [`access_token=s:${accessToken}`])
        .send({
          eventId,
        })
        .expect(201); // May return 201 but should not create duplicate emails

      // Wait for first email
      const firstEmail = await mailpitHelper.waitForEmailWithSubject('Reminder', 15000);

      // Try to wait for a second email (should timeout)
      await expect(mailpitHelper.waitForEmailWithSubject('Reminder', 5000)).rejects.toThrow('Email not found within 5000ms timeout');

      // Verify only one email was sent
      const messages = await mailpitHelper.getMessages();
      const reminderEmails = messages.messages.filter((msg) => msg.Subject.includes('Reminder'));
      expect(reminderEmails).toHaveLength(1);
      expect(reminderEmails[0].ID).toBe(firstEmail.ID);
    });
  });
});
