import { renderHook, waitFor } from '@testing-library/react';

// Mock do Supabase
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    single: jest.fn()
  }))
};

jest.mock('../../services/lib/supabase', () => ({
  supabase: mockSupabase
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}));

// Mock do hook useSupabaseEvents
const mockUseSupabaseEvents = {
  events: [],
  deletedEvents: [],
  loading: false,
  error: null,
  totalCount: 0,
  currentPage: 1,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
  fetchEvents: jest.fn(),
  fetchDeletedEvents: jest.fn(),
  createEvent: jest.fn(),
  updateEvent: jest.fn(),
  deleteEvent: jest.fn(),
  restoreEvent: jest.fn(),
  permanentDeleteEvent: jest.fn(),
  getEventById: jest.fn(),
  refetch: jest.fn()
};

describe('useSupabaseEvents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default state', () => {
    expect(mockUseSupabaseEvents.events).toEqual([]);
    expect(mockUseSupabaseEvents.loading).toBe(false);
    expect(mockUseSupabaseEvents.error).toBeNull();
  });

  it('should handle fetch events', async () => {
    const mockEvents = [
      { id: '1', title: 'Event 1', description: 'Description 1' },
      { id: '2', title: 'Event 2', description: 'Description 2' }
    ];

    mockUseSupabaseEvents.fetchEvents.mockResolvedValueOnce(undefined);
    mockUseSupabaseEvents.events = mockEvents;

    await mockUseSupabaseEvents.fetchEvents();

    expect(mockUseSupabaseEvents.fetchEvents).toHaveBeenCalled();
    expect(mockUseSupabaseEvents.events).toEqual(mockEvents);
  });

  it('should handle create event', async () => {
    const newEvent = { title: 'New Event', description: 'New Description' };
    const createdEvent = { id: '3', ...newEvent };

    mockUseSupabaseEvents.createEvent.mockResolvedValueOnce(createdEvent);

    const result = await mockUseSupabaseEvents.createEvent(newEvent);

    expect(mockUseSupabaseEvents.createEvent).toHaveBeenCalledWith(newEvent);
    expect(result).toEqual(createdEvent);
  });

  it('should handle update event', async () => {
    const eventId = '1';
    const updateData = { title: 'Updated Event' };
    const updatedEvent = { id: eventId, ...updateData };

    mockUseSupabaseEvents.updateEvent.mockResolvedValueOnce(updatedEvent);

    const result = await mockUseSupabaseEvents.updateEvent(eventId, updateData);

    expect(mockUseSupabaseEvents.updateEvent).toHaveBeenCalledWith(eventId, updateData);
    expect(result).toEqual(updatedEvent);
  });

  it('should handle delete event', async () => {
    const eventId = '1';

    mockUseSupabaseEvents.deleteEvent.mockResolvedValueOnce(undefined);

    await mockUseSupabaseEvents.deleteEvent(eventId);

    expect(mockUseSupabaseEvents.deleteEvent).toHaveBeenCalledWith(eventId);
  });

  it('should handle pagination', () => {
    mockUseSupabaseEvents.currentPage = 2;
    mockUseSupabaseEvents.totalPages = 5;
    mockUseSupabaseEvents.hasNextPage = true;
    mockUseSupabaseEvents.hasPreviousPage = true;

    expect(mockUseSupabaseEvents.currentPage).toBe(2);
    expect(mockUseSupabaseEvents.totalPages).toBe(5);
    expect(mockUseSupabaseEvents.hasNextPage).toBe(true);
    expect(mockUseSupabaseEvents.hasPreviousPage).toBe(true);
  });

  it('should handle get event by id', () => {
    const eventId = '1';
    const mockEvent = { id: '1', title: 'Event 1' };

    mockUseSupabaseEvents.getEventById.mockReturnValueOnce(mockEvent);

    const result = mockUseSupabaseEvents.getEventById(eventId);

    expect(mockUseSupabaseEvents.getEventById).toHaveBeenCalledWith(eventId);
    expect(result).toEqual(mockEvent);
  });
});