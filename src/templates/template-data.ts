import { CheckSquare, BarChart3, Briefcase, User, GraduationCap, Layout, BookOpen } from 'lucide-react';

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
    description: 'Track your daily tasks and priorities easily.',
    category: 'Live',
    icon: CheckSquare,
    file: '/templates/todo.html',
    emoji: '🎯'
  },
  {
    id: 'tracker',
    title: 'Daily Tracker',
    description: 'Monitor your health, habits and daily progress.',
    category: 'Live',
    icon: BarChart3,
    file: '/templates/tracker.html',
    emoji: '📊'
  },
  {
    id: 'meeting',
    title: 'Meeting Notes',
    description: 'Capture decisions and action items from meetings.',
    category: 'Work',
    icon: Briefcase,
    file: '/templates/meeting.html',
    emoji: '🤝'
  },
  {
    id: 'project',
    title: 'Project Roadmap',
    description: 'Sketch out timelines and milestones for your projects.',
    category: 'Work',
    icon: Layout,
    file: '/templates/project.html',
    emoji: '🗺️'
  },
  {
    id: 'study',
    title: 'Study Plan',
    description: 'Organize your learning path and exam preparation.',
    category: 'Work',
    icon: GraduationCap,
    file: '/templates/study.html',
    emoji: '🎓'
  },
  {
    id: 'journal',
    title: 'Personal Journal',
    description: 'Reflect on your day and capture personal growth.',
    category: 'Personal',
    icon: User,
    file: '/templates/journal.html',
    emoji: '📓'
  },
  {
    id: 'reading',
    title: 'Reading List',
    description: 'Keep track of books you want to read and key takeaways.',
    category: 'Personal',
    icon: BookOpen,
    file: '/templates/reading.html',
    emoji: '📚'
  }
];
