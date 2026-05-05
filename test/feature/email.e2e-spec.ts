import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { App } from 'supertest/types';
import request from 'supertest';
import { cleanupApplication, setupApplication } from '~/test/setup_e2e';
import { loginAdmin } from '../common/auth';
import { mailpitHelper, MailpitHelper } from '../infrastructure/mailpit';

describe('Feature/Email', () => {
  let app: INestApplication<App>;
  let moduleFixture: TestingModule;

  beforeAll(async () => {
    [app, moduleFixture] = await setupApplication();

    // Verify Mailpit is available before running tests
    const mailpitAvailable = await mailpitHelper.isAvailable();
    if (!mailpitAvailable) {
      throw new Error(`Mailpit is not available. Please ensure Mailpit is running on ${mailpitHelper.getBaseUrl()}`);
    }
  });

  describe('Email Delivery', () => {
    let access_token: string;
    let testId: string;

    beforeAll(async () => {
      const session = await loginAdmin(app);
      access_token = session.accessToken;
      testId = MailpitHelper.generateTestId();
      expect(access_token).toBeDefined();
    });

    beforeEach(async () => {
      // Clear inbox before each test
      await mailpitHelper.clearMessages();
    });

    describe('User Registration Email', () => {
      it('should send welcome email when user registers', async () => {
        const testEmail = `test-${testId}@example.com`;

        // Trigger user registration
        await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: testEmail,
            password: 'password123',
            name: 'Test User',
          })
          .expect(201);

        // Wait for the welcome email
        const email = await mailpitHelper.waitForEmailToWithSubject(testEmail, 'Welcome', 10000);

        // Assert email details
        expect(email).toBeDefined();
        expect(email.To.some((to) => to.Address === testEmail)).toBe(true);
        expect(email.Subject).toContain('Welcome');
        expect(email.HTML).toContain('Test User');
      });
    });

    describe('Event Reminder Email', () => {
      it('should send reminder email when event reminder is scheduled', async () => {
        // Create a test event
        const createEventResponse = await request(app.getHttpServer())
          .post('/events')
          .set('Cookie', [`access_token=s:${access_token}`])
          .send({
            title: `Test Event ${testId}`,
            description: 'Test event description',
            startDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
            endDate: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(), // Tomorrow + 1 hour
            location: 'Test Location',
            maxAttendees: 100,
            status: 'PUBLISHED',
          })
          .expect(201);

        const eventId = createEventResponse.body.id;
        expect(eventId).toBeDefined();

        // Create a test user and register for the event
        const testUserEmail = `user-${testId}@example.com`;
        await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: testUserEmail,
            password: 'password123',
            name: 'Test Event User',
          })
          .expect(201);

        // Schedule reminder for the event
        await request(app.getHttpServer())
          .post(`/reminders/event/${eventId}/schedule`)
          .set('Cookie', [`access_token=s:${access_token}`])
          .send({
            reminderTimes: ['1h', '24h'], // 1 hour and 24 hours before
            message: `Don't forget about Test Event ${testId}!`,
          })
          .expect(201);

        // Wait for the reminder email
        const email = await mailpitHelper.waitForEmailToWithSubject(testUserEmail, 'Reminder', 15000);

        // Assert email details
        expect(email).toBeDefined();
        expect(email.To.some((to) => to.Address === testUserEmail)).toBe(true);
        expect(email.Subject).toContain('Reminder');
        expect(email.Subject).toContain(`Test Event ${testId}`);
        expect(email.HTML).toContain("Don't forget");
      });
    });

    describe('Order Confirmation Email', () => {
      it('should send order confirmation email when ticket is purchased', async () => {
        // Create a paid event
        const createEventResponse = await request(app.getHttpServer())
          .post('/events')
          .set('Cookie', [`access_token=s:${access_token}`])
          .send({
            title: `Paid Event ${testId}`,
            description: 'Paid event description',
            startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Next week
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
            location: 'Paid Event Location',
            maxAttendees: 50,
            status: 'PUBLISHED',
            ticketPrice: 25000, // $25
          })
          .expect(201);

        const eventId = createEventResponse.body.id;
        expect(eventId).toBeDefined();

        // Register and login a test user
        const testUserEmail = `buyer-${testId}@example.com`;
        await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: testUserEmail,
            password: 'password123',
            name: 'Test Buyer',
          })
          .expect(201);

        const loginResponse = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: testUserEmail,
            password: 'password123',
          })
          .expect(200);

        const userAccessToken = loginResponse.body.accessToken;

        // Create an order
        const orderResponse = await request(app.getHttpServer())
          .post('/orders')
          .set('Cookie', [`access_token=s:${userAccessToken}`])
          .send({
            eventId,
            ticketQuantity: 2,
            paymentMethod: 'credit_card',
          })
          .expect(201);

        const orderId = orderResponse.body.id;
        expect(orderId).toBeDefined();

        // Wait for the order confirmation email
        const email = await mailpitHelper.waitForEmailToWithSubject(testUserEmail, 'Order Confirmation', 15000);

        // Assert email details
        expect(email).toBeDefined();
        expect(email.To.some((to) => to.Address === testUserEmail)).toBe(true);
        expect(email.Subject).toContain('Order Confirmation');
        expect(email.Subject).toContain(orderId);
        expect(email.HTML).toContain(`Paid Event ${testId}`);
        expect(email.HTML).toContain('2 tickets');

        // Optional: Check for PDF attachment
        const emailDetail = await mailpitHelper.getMessage(email.ID);
        expect(emailDetail.Attachments.length).toBeGreaterThan(0);
        expect(emailDetail.Attachments.some((att) => att.FileName.endsWith('.pdf'))).toBe(true);
      });
    });

    describe('Email Validation', () => {
      it('should validate email content and attachments', async () => {
        const testEmail = `validation-${testId}@example.com`;

        // Trigger an action that sends an email with attachments
        await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: testEmail,
            password: 'password123',
            name: 'Validation Test User',
          })
          .expect(201);

        // Wait for email
        const email = await mailpitHelper.waitForEmailTo(testEmail, 10000);

        // Get detailed email information
        const emailDetail = await mailpitHelper.getMessage(email.ID);

        // Validate email structure
        expect(emailDetail.From.Address).toBeDefined();
        expect(emailDetail.From.Name).toBeDefined();
        expect(emailDetail.To.length).toBeGreaterThan(0);
        expect(emailDetail.Subject).toBeDefined();
        expect(emailDetail.HTML).toBeDefined();
        expect(emailDetail.Text).toBeDefined();
        expect(emailDetail.Created).toBeDefined();
        expect(emailDetail.Size).toBeGreaterThan(0);

        // Validate content
        expect(emailDetail.HTML).toContain('Validation Test User');
        expect(emailDetail.Text).toContain('Validation Test User');
      });

      it('should handle email polling timeout gracefully', async () => {
        const nonExistentEmail = `nonexistent-${testId}@example.com`;

        // Try to wait for an email that won't exist
        await expect(mailpitHelper.waitForEmailTo(nonExistentEmail, 2000)).rejects.toThrow('Email not found within 2000ms timeout');
      });
    });
  });

  afterAll(async () => {
    await cleanupApplication(app, moduleFixture);
  });
});
