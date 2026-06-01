
import { DataManager } from './DataManager';

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface BackgroundTask {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  progress: number;
  error?: string;
  result?: any;
  type: 'upload' | 'sync' | 'index';
  createdAt: number;
}

class OperationRunner {
  private tasks: BackgroundTask[] = [];
  private listeners: ((tasks: BackgroundTask[]) => void)[] = [];

  addTask(task: Omit<BackgroundTask, 'status' | 'progress' | 'createdAt'>): string {
    const newTask: BackgroundTask = {
      ...task,
      status: 'pending',
      progress: 0,
      createdAt: Date.now()
    };
    this.tasks.push(newTask);
    this.notify();
    return newTask.id;
  }

  updateTask(id: string, updates: Partial<BackgroundTask>) {
    const index = this.tasks.findIndex(t => t.id === id);
    if (index > -1) {
      this.tasks[index] = { ...this.tasks[index], ...updates };
      this.notify();
    }
  }

  getTasks() {
    return this.tasks;
  }

  getActiveTasksCount() {
    return this.tasks.filter(t => t.status === 'running' || t.status === 'pending').length;
  }

  subscribe(callback: (tasks: BackgroundTask[]) => void) {
    this.listeners.push(callback);
    callback(this.tasks);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notify() {
    this.listeners.forEach(l => l([...this.tasks]));
    // Also notify via BroadcastChannel if possible or just global event
    if (typeof window !== 'undefined') {
       window.dispatchEvent(new CustomEvent('task-runner-update', { detail: this.tasks }));
    }
  }

  async runUpload(file: File, noteId: string, workspaceId: string, existingTaskId?: string): Promise<string> {
    const taskId = existingTaskId || this.addTask({
      id: crypto.randomUUID(),
      title: `Uploading ${file.name}`,
      description: `Note: ${noteId}`,
      type: 'upload'
    });

    this.updateTask(taskId, { status: 'running' });

    try {
      this.updateTask(taskId, { progress: 30 });
      
      const mediaType = file.type.startsWith('image') ? 'image' : 
                        file.type.startsWith('video') ? 'video' : 
                        file.type.startsWith('audio') ? 'audio' : 'file';

      const path = `notes/${noteId}/${mediaType}`;
      const url = await DataManager.uploadMedia(file, path);
      
      this.updateTask(taskId, { status: 'completed', progress: 100, result: { url } });
      
      return url;
    } catch (err: any) {
      this.updateTask(taskId, { status: 'failed', error: err.message });
      throw err;
    }
  }
}

export const operationRunner = new OperationRunner();
