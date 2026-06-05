import fs from 'node:fs';
import path from 'node:path';
import axios from 'axios';
import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { cleanupApplication, setupApplication } from '~/test/setup_e2e';
import { ADMIN_ID } from '~/infrastructure/database/const/shared-data';
import { loginAdmin } from '../common/auth';
import { mailpitHelper, MailpitHelper } from '../infrastructure/mailpit';
import { FakeClock, ClockProvider as TestClockProvider, ClockTestUtils } from '../times/fake-time';
import { createOrder, payOrderWithWebhook, waitForOrderReminders } from '../tickets/tickets.utils';
import { extractHttpOnlyCookie } from '../utils';
import { ClockProvider as MainClockProvider } from '~/infrastructure/clock/clock.provider';

describe('Reminder Email No Loop (e2e)', () => {
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
        filename: `event-reminder-no-loop-${testId}.jpg`,
        mimeType: 'image/jpeg',
        size: imageBuffer.length,
        accessType: 'public',
      })
      .expect(201);

    const { mediaId, url } = presignedResponse.body.data as { mediaId: string; url: string };
    await axios.put(url, imageBuffer, { headers: { 'Content-Type': 'image/jpeg' } });

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
        title: `Reminder No Loop Event ${testId}`,
        description: 'Event used to verify reminder email does not loop.',
        maxAttendees: 100,
        isVirtual: false,
        location: 'No Loop Hall',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        status: 'PUBLISHED',
        categoryId: 1,
        createdBy: ADMIN_ID,
        bannerMediaId: mediaId,
      })
      .expect(201);

    const eventId = eventResponse.body.data.id as string;

    const ticketResponse = await request(app.getHttpServer())
      .post('/tickets')
      .set('Cookie', [`access_token=s:${adminAccessToken}`])
      .send({
        name: 'No Loop Ticket',
        price: 55000,
        quota: 10,
        eventId,
      })
      .expect(201);

    const ticketId = ticketResponse.body.data.id as string;
    return { eventId, ticketId };
  };

  it('should send only one reminder email even when overdue processing runs multiple times', async () => {
    const testUserEmail = `reminder-no-loop-${testId}@example.com`;
    const testUserPassword = 'Password1!';

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: testUserEmail,
        password: testUserPassword,
        name: 'Reminder No Loop User',
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
    const { eventId, ticketId } = await createEventWithTicket();
    const order = await createOrder(app, userAccessToken, eventId, ticketId);
    await payOrderWithWebhook(app, order.id, order.totalAmount);

    const reminders = await waitForOrderReminders(app, userAccessToken, order.id, 2, 15000);
    const oneHourEmailReminder = reminders.find((item) => item.type === 'EMAIL' && item.status === 'PENDING');
    expect(oneHourEmailReminder).toBeDefined();

    fakeClock.advanceHours(1);
    fakeClock.advanceMinutes(1);

    await request(app.getHttpServer())
      .post('/reminders/process')
      .set('Cookie', [`access_token=s:${adminAccessToken}`])
      .expect(200);
    await request(app.getHttpServer())
      .post('/reminders/process')
      .set('Cookie', [`access_token=s:${adminAccessToken}`])
      .expect(200);
    await request(app.getHttpServer())
      .post('/reminders/process')
      .set('Cookie', [`access_token=s:${adminAccessToken}`])
      .expect(200);

    await new Promise((resolve) => setTimeout(resolve, 1200));

    const inbox = await mailpitHelper.getMessages();
    const reminderEmails = inbox.messages.filter((msg) => msg.To.some((to) => to.Address === testUserEmail) && msg.Subject.includes('1 hour'));

    expect(reminderEmails).toHaveLength(1);

    const updatedReminders = await waitForOrderReminders(app, userAccessToken, order.id, 2, 15000);
    const sentOneHourReminder = updatedReminders.find((item) => item.id === oneHourEmailReminder?.id);
    expect(sentOneHourReminder?.status).toBe('SENT');
    expect(TestClockProvider.now().toISOString()).toBe(new Date(initialTime.getTime() + 61 * 60 * 1000).toISOString());
  });
});
