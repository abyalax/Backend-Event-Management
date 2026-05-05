import * as fs from 'node:fs';
import * as path from 'node:path';
import axios from 'axios';
import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { cleanupApplication, setupApplication } from '~/test/setup_e2e';
import { ADMIN_ID } from '~/infrastructure/database/const/shared-data';
import { loginAdmin } from '../common/auth';
import { mailpitHelper, MailpitHelper } from '../infrastructure/mailpit';
import { FakeClock, ClockTestUtils, ClockProvider as TestClockProvider } from '../times/fake-time';
import { createOrder, payOrderWithWebhook, waitForOrderReminders } from '../tickets/tickets.utils';
import { extractHttpOnlyCookie } from '../utils';
import { ClockProvider as MainClockProvider } from '~/infrastructure/clock/clock.provider';

describe('Event Reminder E2E with Fake Time', () => {
  let app: INestApplication<App>;
  let moduleFixture: TestingModule;
  let fakeClock: FakeClock;
  let adminAccessToken: string;
  let initialTime: Date;

  const testId = MailpitHelper.generateTestId();

  beforeAll(async () => {
    initialTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
    fakeClock = ClockTestUtils.setupFakeClock(initialTime);
    MainClockProvider.setInstance(fakeClock);

    [app, moduleFixture] = await setupApplication();

    const mailpitAvailable = await mailpitHelper.isAvailable();
    if (!mailpitAvailable) {
      throw new Error(`Mailpit is not available. Please ensure Mailpit is running on ${mailpitHelper.getBaseUrl()}`);
    }

    const session = await loginAdmin(app);
    adminAccessToken = session.accessToken;
    expect(adminAccessToken).toBeDefined();
  });

  afterAll(async () => {
    ClockTestUtils.cleanup();
    mailpitHelper.cleanup();
    await cleanupApplication(app, moduleFixture);
  });

  beforeEach(async () => {
    fakeClock.setTime(initialTime);
    await mailpitHelper.clearMessages();
  });

  const createEventWithTicket = async () => {
    const imagePath = path.join(process.cwd(), 'assets', 'banner.jpg');
    const imageBuffer = fs.readFileSync(imagePath);

    const presignedResponse = await request(app.getHttpServer())
      .post('/media/presigned')
      .set('Cookie', [`access_token=s:${adminAccessToken}`])
      .send({
        filename: `event-reminder-${testId}.jpg`,
        mimeType: 'image/jpeg',
        size: imageBuffer.length,
        accessType: 'public',
      })
      .expect(201);

    const { mediaId, url } = presignedResponse.body.data as { mediaId: string; url: string };

    const uploadResponse = await axios.put(url, imageBuffer, {
      headers: {
        'Content-Type': 'image/jpeg',
      },
    });
    expect([200, 201, 204]).toContain(uploadResponse.status);

    await request(app.getHttpServer())
      .patch(`/media/${mediaId}/confirm`)
      .set('Cookie', [`access_token=s:${adminAccessToken}`])
      .send({ uploaded: true, actualSize: imageBuffer.length })
      .expect(200);

    const startDate = fakeClock.hoursFromNow(2);
    const endDate = fakeClock.hoursFromNow(3);

    const eventResponse = await request(app.getHttpServer())
      .post('/events')
      .set('Cookie', [`access_token=s:${adminAccessToken}`])
      .send({
        title: `Reminder Event ${testId}`,
        description: 'Event used to verify reminder scheduling with fake time.',
        maxAttendees: 100,
        isVirtual: false,
        location: 'Reminder Hall',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        status: 'PUBLISHED',
        categoryId: 1,
        createdBy: ADMIN_ID,
        bannerMediaId: mediaId,
      })
      .expect(201);

    const eventId = eventResponse.body.data.id as string;
    expect(eventId).toBeDefined();

    const ticketResponse = await request(app.getHttpServer())
      .post('/tickets')
      .set('Cookie', [`access_token=s:${adminAccessToken}`])
      .send({
        name: 'Reminder Ticket',
        price: 75000,
        quota: 10,
        eventId,
      })
      .expect(201);

    const ticketId = ticketResponse.body.data.id as string;
    expect(ticketId).toBeDefined();

    return { eventId, ticketId };
  };

  it('should schedule and send an event reminder email using fake time', async () => {
    const testUserEmail = `reminder-${testId}@example.com`;
    const testUserName = 'Reminder Test User';
    const testUserPassword = 'password123';

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: testUserEmail,
        password: testUserPassword,
        name: testUserName,
      })
      .expect(201);

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: testUserEmail,
        password: testUserPassword,
      })
      .expect(202);

    const userAccessToken = extractHttpOnlyCookie('access_token', loginResponse.headers['set-cookie']);
    expect(userAccessToken).toBeDefined();

    const { eventId, ticketId } = await createEventWithTicket();

    const order = await createOrder(app, userAccessToken, eventId, ticketId);
    expect(order.id).toBeDefined();

    await payOrderWithWebhook(app, order.id, order.totalAmount);

    const reminders = await waitForOrderReminders(app, userAccessToken, order.id, 2, 15000);
    const emailReminder = reminders.find((item) => item.type === 'EMAIL');

    expect(reminders).toHaveLength(2);
    expect(emailReminder).toBeDefined();
    expect(emailReminder?.status).toBe('PENDING');

    fakeClock.advanceHours(1);
    fakeClock.advanceMinutes(1);

    const processResponse = await request(app.getHttpServer())
      .post('/reminders/process')
      .set('Cookie', [`access_token=s:${adminAccessToken}`])
      .expect(200);

    expect(processResponse.body.message).toBe('Reminders processed');

    const reminderEmail = await mailpitHelper.waitForEmailToWithSubject(testUserEmail, 'Reminder', 15000);
    expect(reminderEmail.Subject).toContain('Reminder');
    expect(reminderEmail.To.some((to) => to.Address === testUserEmail)).toBe(true);

    const emailDetail = await mailpitHelper.getMessage(reminderEmail.ID);
    expect(emailDetail.HTML).toContain('Reminder Event');
    expect(emailDetail.HTML).toContain('Reminder Hall');
    expect(emailDetail.Text).toContain('Reminder Event');

    const updatedReminders = await waitForOrderReminders(app, userAccessToken, order.id, 2, 15000);
    const sentEmailReminder = updatedReminders.find((item) => item.type === 'EMAIL');
    expect(sentEmailReminder?.status).toBe('SENT');
    expect(TestClockProvider.now().toISOString()).toBe(new Date(initialTime.getTime() + 61 * 60 * 1000).toISOString());
  });
});
