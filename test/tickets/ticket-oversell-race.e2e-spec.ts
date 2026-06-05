import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { CONFIG_PROVIDER } from '~/common/constants/provider';
import { ADMIN_ID } from '~/infrastructure/database/const/shared-data';
import { RedisService } from '~/infrastructure/redis/redis.service';
import { EventCategory } from '~/modules/event-categories/entities/event-category.entity';
import { Event } from '~/modules/events/entities/event.entity';
import { Ticket } from '~/modules/tickets/entities/ticket.entity';
import { cleanupApplication, setupApplication } from '../setup_e2e';
import { loginAdmin } from '../common/auth';
import { payOrderWithWebhook } from './tickets.utils';

describe('Ticket Oversell Race E2E Test', () => {
  let app: INestApplication<App>;
  let moduleFixture: TestingModule;
  let dataSource: DataSource;
  let redisService: RedisService;
  let accessToken: string;

  beforeAll(async () => {
    [app, moduleFixture] = await setupApplication();
    dataSource = moduleFixture.get<DataSource>(CONFIG_PROVIDER.PSQL_CONNECTION, { strict: false });
    redisService = moduleFixture.get<RedisService>(RedisService, { strict: false });

    const session = await loginAdmin(app);
    accessToken = session.accessToken;

    expect(accessToken).toBeDefined();
  });

  test('POST /orders/buy-ticket - rejects concurrent purchase when only one ticket remains', async () => {
    const { eventId, ticketId } = await createRaceFixture();
    const payload = {
      eventId,
      ticketId,
      quantity: 1,
      description: 'E2E concurrent purchase race',
    };

    const [firstResponse, secondResponse] = await Promise.all([
      request(app.getHttpServer())
        .post('/orders/buy-ticket')
        .set('Cookie', [`access_token=s:${accessToken}`])
        .send(payload),
      request(app.getHttpServer())
        .post('/orders/buy-ticket')
        .set('Cookie', [`access_token=s:${accessToken}`])
        .send(payload),
    ]);

    const responses = [firstResponse, secondResponse];
    const successfulResponses = responses.filter((response) => response.status === 201);
    const rejectedResponses = responses.filter((response) => response.status === 400);

    expect(successfulResponses).toHaveLength(1);
    expect(rejectedResponses).toHaveLength(1);
    expect(JSON.stringify(rejectedResponses[0].body)).toContain('Insufficient quota');

    const order = successfulResponses[0].body.data as { id: string; totalAmount: number };
    expect(order.id).toBeDefined();

    await payOrderWithWebhook(app, order.id, order.totalAmount);

    const ticket = await dataSource.getRepository(Ticket).findOneByOrFail({ id: ticketId });
    expect(Number(ticket.sold)).toBe(1);
    expect(Number(ticket.sold)).toBeLessThanOrEqual(Number(ticket.quota));
  });

  afterAll(async () => {
    await cleanupApplication(app, moduleFixture);
  });

  const createRaceFixture = async (): Promise<{ eventId: string; ticketId: string }> => {
    const categoryRepository = dataSource.getRepository(EventCategory);
    const eventRepository = dataSource.getRepository(Event);
    const ticketRepository = dataSource.getRepository(Ticket);

    let category = await categoryRepository.findOne({ where: { name: 'E2E Race Condition' } });
    category ??= await categoryRepository.save(
      categoryRepository.create({
        name: 'E2E Race Condition',
        description: 'Category for oversell race tests',
      }),
    );

    const startDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
    const event = await eventRepository.save(
      eventRepository.create({
        title: `E2E Oversell Race ${Date.now()}`,
        description: 'Event for concurrent ticket purchase test',
        maxAttendees: 1,
        isVirtual: false,
        location: 'Jakarta',
        startDate,
        endDate,
        status: 'upcoming',
        categoryId: category.id.toString(),
        createdBy: ADMIN_ID,
      }),
    );

    const ticket = await ticketRepository.save(
      ticketRepository.create({
        eventId: event.id,
        name: 'Single Seat',
        price: 50000,
        quota: 1,
        sold: 0,
      }),
    );

    await redisService.getClient().del(`ticket_quota:${ticket.id}`);

    return {
      eventId: event.id,
      ticketId: ticket.id,
    };
  };
});
