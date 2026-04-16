import type { Event } from "~/modules/event/entity/event.entity";

export const mockEvents = (): Event[] => {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  return [
    {
      id: "550e8400-e29b-41d4-a716-446655440100",
      title: "Tech Conference 2024",
      description: "Annual technology conference featuring the latest innovations in software development, AI, and cloud computing.",
      maxAttendees: 500,
      isVirtual: false,
      location: "Jakarta Convention Center",
      startDate: nextWeek,
      endDate: new Date(nextWeek.getTime() + 8 * 60 * 60 * 1000),
      status: "upcoming",
      categoryId: "1",
      category: {
        id: 1,
        name: "Conference",
        description: "Large-scale professional conferences and summits",
      },
      createdBy: "550e8400-e29b-41d4-a716-446655440000",
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440101",
      title: "Web Development Workshop",
      description: "Hands-on workshop covering modern web development technologies including React, Node.js, and TypeScript.",
      maxAttendees: 50,
      isVirtual: true,
      location: "Online - Zoom",
      startDate: tomorrow,
      endDate: new Date(tomorrow.getTime() + 4 * 60 * 60 * 1000),
      status: "upcoming",
      categoryId: "2",
      category: {
        id: 2,
        name: "Workshop",
        description: "Hands-on learning sessions and skill development",
      },
      createdBy: "550e8400-e29b-41d4-a716-446655440001",
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440102",
      title: "Data Science Summit",
      description: "Explore the latest trends in data science, machine learning, and artificial intelligence.",
      maxAttendees: 300,
      isVirtual: false,
      location: "Surabaya Tech Hub",
      startDate: nextMonth,
      endDate: new Date(nextMonth.getTime() + 6 * 60 * 60 * 1000),
      status: "upcoming",
      categoryId: "3",
      category: {
        id: 3,
        name: "Technology",
        description: "Tech-focused events and meetups",
      },
      createdBy: "550e8400-e29b-41d4-a716-446655440000",
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440103",
      title: "Startup Pitch Night",
      description: "Connect with investors and showcase your startup ideas at our monthly pitch night.",
      maxAttendees: 100,
      isVirtual: false,
      location: "Bandung Innovation Center",
      startDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
      status: "ongoing",
      categoryId: "4",
      category: {
        id: 4,
        name: "Networking",
        description: "Professional networking and social events",
      },
      createdBy: "550e8400-e29b-41d4-a716-446655440001",
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440104",
      title: "Mobile App Development Bootcamp",
      description: "Intensive bootcamp covering iOS and Android app development using React Native and Flutter.",
      maxAttendees: 25,
      isVirtual: true,
      location: "Online - Microsoft Teams",
      startDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 16 * 24 * 60 * 60 * 1000),
      status: "upcoming",
      categoryId: "2",
      category: {
        id: 2,
        name: "Workshop",
        description: "Hands-on learning sessions and skill development",
      },
      createdBy: "550e8400-e29b-41d4-a716-446655440000",
    },
  ];
};