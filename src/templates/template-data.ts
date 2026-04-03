import { CheckSquare, BarChart3, Briefcase, User } from 'lucide-react';

export interface Template {
  id: string;
  title: string;
  description: string;
  category: 'Live' | 'Work' | 'Personal';
  icon: any;
  file: string;
  emoji: string;
}

export const TEMPLATES: Template[] = [
  {
    id: 'todo',
    title: 'To-Do List',
    description: 'Track your daily tasks easily.',
    category: 'Live',
    icon: CheckSquare,
    file: '/templates/todo.html',
    emoji: '✅'
  },
  {
    id: 'tracker',
    title: 'Daily Tracker',
    description: 'Monitor your progress and habits.',
    category: 'Live',
    icon: BarChart3,
    file: '/templates/tracker.html',
    emoji: '📊'
  },
  {
    id: 'meeting',
    title: 'Meeting Notes',
    description: 'Capture key points from your meetings.',
    category: 'Work',
    icon: Briefcase,
    file: '/templates/meeting.html',
    emoji: '💼'
  },
  {
    id: 'journal',
    title: 'Personal Journal',
    description: 'Write down your thoughts and reflections.',
    category: 'Personal',
    icon: User,
    file: '/templates/journal.html',
    emoji: '📓'
  }
];
