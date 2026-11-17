import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import NotificationBell from '../components/NotificationBell.jsx';
import { notificationService } from '../services/index.js';

vi.mock('../services/index.js', () => ({
  notificationService: {
    getNotifications: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn()
  }
}));

describe('NotificationBell Component Suite (CHUNK 11)', () => {
  const mockNotifications = [
    {
      id: 'notif-1',
      type: 'application_status',
      title: 'Application Status Updated',
      message: 'Your application status for "Frontend Engineer" was updated to shortlisted.',
      link: '/student/applications/app-1',
      read: false,
      readAt: null,
      createdAt: new Date().toISOString()
    },
    {
      id: 'notif-2',
      type: 'interview_scheduled',
      title: 'Interview Scheduled',
      message: 'An interview for "Frontend Engineer" has been scheduled.',
      link: '/student/applications/app-1',
      read: true,
      readAt: new Date().toISOString(),
      createdAt: new Date(Date.now() - 3600000).toISOString()
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders bell button and fetches notifications on mount', async () => {
    notificationService.getNotifications.mockResolvedValue({
      success: true,
      data: {
        notifications: mockNotifications,
        unreadCount: 1
      }
    });

    render(
      <BrowserRouter>
        <NotificationBell />
      </BrowserRouter>
    );

    const bellBtn = screen.getByRole('button', { name: /Notifications/i });
    expect(bellBtn).toBeInTheDocument();

    await waitFor(() => {
      expect(notificationService.getNotifications).toHaveBeenCalledTimes(1);
    });

    // Badge indicates 1 unread notification
    const badge = screen.getByTestId('notification-badge');
    expect(badge).toHaveTextContent('1');
  });

  it('toggles notification dropdown popover on click', async () => {
    notificationService.getNotifications.mockResolvedValue({
      success: true,
      data: {
        notifications: mockNotifications,
        unreadCount: 1
      }
    });

    render(
      <BrowserRouter>
        <NotificationBell />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(notificationService.getNotifications).toHaveBeenCalled();
    });

    const bellBtn = screen.getByRole('button', { name: /Notifications/i });
    fireEvent.click(bellBtn);

    // Dropdown visible
    expect(screen.getByTestId('notification-dropdown')).toBeInTheDocument();
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('1 unread')).toBeInTheDocument();
    expect(screen.getByText('Application Status Updated')).toBeInTheDocument();
    expect(screen.getByText('Interview Scheduled')).toBeInTheDocument();
  });

  it('marks a single notification as read when clicked', async () => {
    notificationService.getNotifications.mockResolvedValue({
      success: true,
      data: {
        notifications: mockNotifications,
        unreadCount: 1
      }
    });
    notificationService.markAsRead.mockResolvedValue({
      success: true,
      data: { id: 'notif-1', read: true }
    });

    render(
      <BrowserRouter>
        <NotificationBell />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(notificationService.getNotifications).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole('button', { name: /Notifications/i }));

    const unreadItem = screen.getByText('Application Status Updated');
    fireEvent.click(unreadItem);

    await waitFor(() => {
      expect(notificationService.markAsRead).toHaveBeenCalledWith('notif-1');
    });
  });

  it('marks all notifications as read when "Mark all read" is clicked', async () => {
    notificationService.getNotifications.mockResolvedValue({
      success: true,
      data: {
        notifications: mockNotifications,
        unreadCount: 1
      }
    });
    notificationService.markAllAsRead.mockResolvedValue({
      success: true,
      data: { modifiedCount: 1 }
    });

    render(
      <BrowserRouter>
        <NotificationBell />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(notificationService.getNotifications).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole('button', { name: /Notifications/i }));

    const markAllBtn = screen.getByRole('button', { name: /Mark all read/i });
    fireEvent.click(markAllBtn);

    await waitFor(() => {
      expect(notificationService.markAllAsRead).toHaveBeenCalledTimes(1);
    });
  });

  it('shows empty state when there are no notifications', async () => {
    notificationService.getNotifications.mockResolvedValue({
      success: true,
      data: {
        notifications: [],
        unreadCount: 0
      }
    });

    render(
      <BrowserRouter>
        <NotificationBell />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(notificationService.getNotifications).toHaveBeenCalled();
    });

    // No badge when unreadCount is 0
    expect(screen.queryByTestId('notification-badge')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Notifications/i }));
    expect(screen.getByText('No notifications yet')).toBeInTheDocument();
  });
});

