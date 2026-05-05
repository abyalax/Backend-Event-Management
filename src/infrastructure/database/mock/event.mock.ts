import type { Event } from "~/modules/events/entities/event.entity";

import { faker } from '@faker-js/faker';
import { MediaObject } from "~/infrastructure/storage/entitiy/media-objects.entity";
import { EEventMediaType, EventMedia } from "~/modules/events/entities/event-media.entity";
import { ADMIN_ID } from "../const/shared-data";
import { Ticket } from "~/modules/tickets/entities/ticket.entity";

export const mockEvents = (
  mediaObjects: MediaObject[]
) => {
  const events: Event[] = [];
  const eventMedia: Partial<EventMedia>[] = [];
  const tickets: Partial<Ticket>[] = [];
  
  const categories = [
    { id: 1, name: "Conference", description: "Professional summits" },
    { id: 2, name: "Workshop", description: "Hands-on learning sessions" },
    { id: 3, name: "Seminar", description: "Educational presentations" }
  ];

  const ticketTypes = ["General Admission", "VIP", "Early Bird", "Student Pass"];

  for (let i = 0; i < 200; i++) {
    const eventId = faker.string.uuid();
    const category = faker.helpers.arrayElement(categories);
    
    // 1. Create Event
    const startDate = faker.date.soon({ days: 30 });
    events.push({
      id: eventId,
      title: faker.company.catchPhrase(),
      description: faker.lorem.paragraph(),
      maxAttendees: faker.number.int({ min: 100, max: 1000 }),
      isVirtual: faker.datatype.boolean(),
      location: faker.location.city() + " Convention Center",
      startDate,
      endDate: new Date(startDate.getTime() + 4 * 60 * 60 * 1000),
      status: "upcoming",
      categoryId: category.id.toString(),
      category: category,
      createdBy: ADMIN_ID,
    });

    // 2. Create Unique Tickets for this Event
    // Setiap event akan punya 1 sampai 3 jenis tiket yang berbeda
    const numTicketTypes = faker.number.int({ min: 1, max: 3 });
    const selectedTicketNames = faker.helpers.arrayElements(ticketTypes, numTicketTypes);

    selectedTicketNames.forEach((ticketName) => {
      const quota = faker.number.int({ min: 20, max: 100 });
      
      tickets.push({
        id: faker.string.uuid(),
        eventId: eventId, // Relasi ke event yang baru dibuat
        name: ticketName,
        // Harga variasi: VIP lebih mahal, Early Bird lebih murah
        price: ticketName === "VIP" 
          ? faker.number.int({ min: 500000, max: 1500000 }) 
          : faker.number.int({ min: 50000, max: 450000 }),
        quota: quota,
        sold: faker.number.int({ min: 0, max: quota }), // Sold tidak boleh > quota
      });
    });

    // 3. Assign Media
    const randomMedia = faker.helpers.arrayElement(mediaObjects);
    eventMedia.push({
      id: faker.string.uuid(),
      eventId: eventId, // This will map to event_id column
      mediaId: randomMedia.id, // This will map to media_id column
      type: faker.helpers.arrayElement([EEventMediaType.BANNER, EEventMediaType.POSTER]),
      order: 0,
    });
  }

  return { events, tickets, eventMedia };
};