/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DataManager } from './storage/DataManager';
import { Note, ReminderItem } from '../types/note';

export class ReminderService {
  private static intervalId: any = null;

  static init() {
    if (this.intervalId) return;

    // Check every 30 seconds for due reminders
    this.intervalId = setInterval(() => {
      this.checkReminders();
    }, 30000);

    // Initial immediate check
    this.checkReminders();
  }

  static async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported in this browser.');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }

  static async checkReminders() {
    try {
      const allNotes = await DataManager.getAllNotes();
      const now = Date.now();

      for (const note of allNotes as Note[]) {
        if (!note.reminders || note.reminders.length === 0) continue;

        let updated = false;
        const reminders = [...note.reminders];

        for (const rem of reminders) {
          if (!rem.sent && rem.at <= now) {
            this.fireNotification(note, rem);
            rem.sent = true;
            updated = true;
          }
        }

        if (updated) {
          await DataManager.saveNote({
            ...note,
            reminders
          });
        }
      }
    } catch (err) {
      console.error('Failed to check reminders:', err);
    }
  }

  private static fireNotification(note: Note, reminder: ReminderItem) {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    try {
      new Notification(`${note.emoji || '⏰'} ${note.title || 'স্মারক (Reminder)'}`, {
        body: reminder.message || 'আপনার স্মারকের সময় হয়েছে!',
        icon: '/pwa-192x192.png'
      });
    } catch (e) {
      console.error('Error firing notification:', e);
    }
  }

  static async addReminder(noteId: string, atTime: number, message: string) {
    await this.requestPermission();
    const note = await DataManager.getNoteById(noteId);
    if (!note) return;

    const newReminder: ReminderItem = {
      id: `rem-${Date.now()}`,
      at: atTime,
      message,
      sent: false
    };

    const reminders = [...(note.reminders || []), newReminder];
    await DataManager.saveNote({
      ...note,
      reminders
    });
  }
}
