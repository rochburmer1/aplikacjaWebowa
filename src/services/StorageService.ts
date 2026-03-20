import type { Project } from '../models/Project';
import type { User } from '../models/User';
import type { Story } from '../models/Story';
import type { Task } from '../models/Task';

export class LocalStorageService {
    private readonly PROJECTS_KEY = 'manageme_projects';
    private readonly STORIES_KEY = 'manageme_stories';
    private readonly TASKS_KEY = "manageme_tasks";
    private readonly ACTIVE_PROJECT_KEY = 'manageme_active_project';


    getActiveProjectId(): string | null {
        return localStorage.getItem(this.ACTIVE_PROJECT_KEY);
    }

    setActiveProjectId(id: string | null): void {
        if (id) {
            localStorage.setItem(this.ACTIVE_PROJECT_KEY, id);
        } else {
            localStorage.removeItem(this.ACTIVE_PROJECT_KEY);
        }
    }

    getProjects(): Project[] {
        const data = localStorage.getItem(this.PROJECTS_KEY);
        return data ? JSON.parse(data) : [];
    }

    getProject(id: string): Project | undefined {
        return this.getProjects().find(p => p.id === id);
    }

    createProject(project: Omit<Project, 'id'>): Project {
        const projects = this.getProjects();
        const newProject: Project = { id: crypto.randomUUID(), ...project };
        projects.push(newProject);
        localStorage.setItem(this.PROJECTS_KEY, JSON.stringify(projects));
        return newProject;
    }

    updateProject(id: string, projectData: Partial<Project>): Project {
        const projects = this.getProjects();
        const index = projects.findIndex(p => p.id === id);
        if (index === -1) throw new Error('Nie znaleziono projektu');
        projects[index] = { ...projects[index], ...projectData };
        localStorage.setItem(this.PROJECTS_KEY, JSON.stringify(projects));
        return projects[index];
    }

    deleteProject(id: string): void {
        const projects = this.getProjects();
        const filteredProjects = projects.filter(p => p.id !== id);
        localStorage.setItem(this.PROJECTS_KEY, JSON.stringify(filteredProjects));
        
        if (this.getActiveProjectId() === id) {
            this.setActiveProjectId(null);
        }
    }

    getStories(projectId?: string): Story[] {
        const data = localStorage.getItem(this.STORIES_KEY);
        const stories: Story[] = data ? JSON.parse(data) : [];
        if (projectId) {
            return stories.filter(s => s.projektId === projectId);
        }
        return stories;
    }

    createStory(story: Omit<Story, 'id' | 'dataUtworzenia'>): Story {
        const stories = this.getStories();
        const newStory: Story = {
            id: crypto.randomUUID(),
            dataUtworzenia: new Date().toISOString(), // Data generuje się sama
            ...story
        };
        stories.push(newStory);
        localStorage.setItem(this.STORIES_KEY, JSON.stringify(stories));
        return newStory;
    }

    updateStory(id: string, storyData: Partial<Story>): Story {
        const stories = this.getStories();
        const index = stories.findIndex(s => s.id === id);
        if (index === -1) throw new Error('Nie znaleziono historyjki');
        stories[index] = { ...stories[index], ...storyData };
        localStorage.setItem(this.STORIES_KEY, JSON.stringify(stories));
        return stories[index];
    }

    deleteStory(id: string): void {
        const stories = this.getStories();
        const filtered = stories.filter(s => s.id !== id);
        localStorage.setItem(this.STORIES_KEY, JSON.stringify(filtered));
    }
    
    getTasks(historyjkaId?: string): Task[] {
        const data = localStorage.getItem(this.TASKS_KEY);
        const tasks: Task[] = data ? JSON.parse(data) : [];
        if (historyjkaId) {
            return tasks.filter(t => t.historyjkaId === historyjkaId);
        }
        return tasks;
    }

    createTask(task: Omit<Task, 'id' | 'dataDodania' | 'stan'>): Task {
        const tasks = this.getTasks();
        const newTask: Task = {
            id: crypto.randomUUID(),
            dataDodania: new Date().toISOString(),
            stan: 'todo', 
            ...task
        };
        tasks.push(newTask);
        localStorage.setItem(this.TASKS_KEY, JSON.stringify(tasks));
        
        this.checkAndUpdateStoryState(newTask.historyjkaId);
        
        return newTask;
    }

    updateTask(id: string, taskData: Partial<Task>): Task {
        const tasks = this.getTasks();
        const index = tasks.findIndex(t => t.id === id);
        if (index === -1) throw new Error('Nie znaleziono zadania');

        const oldTask = tasks[index];
        const updatedTask = { ...oldTask, ...taskData };

        if (taskData.przypisanyUzytkownikId && oldTask.stan === 'todo' && updatedTask.stan !== 'done') {
            updatedTask.stan = 'doing';
            updatedTask.dataStartu = new Date().toISOString();
        }

        if (updatedTask.stan === 'doing' && oldTask.stan === 'todo' && !updatedTask.dataStartu) {
            updatedTask.dataStartu = new Date().toISOString();
        }

        if (updatedTask.stan === 'done' && oldTask.stan !== 'done') {
            updatedTask.dataZakonczenia = new Date().toISOString();
        }

        tasks[index] = updatedTask;
        localStorage.setItem(this.TASKS_KEY, JSON.stringify(tasks));

        this.checkAndUpdateStoryState(updatedTask.historyjkaId);

        return updatedTask;
    }

    deleteTask(id: string): void {
        const tasks = this.getTasks();
        const taskToDelete = tasks.find(t => t.id === id);
        if (taskToDelete) {
            const filtered = tasks.filter(t => t.id !== id);
            localStorage.setItem(this.TASKS_KEY, JSON.stringify(filtered));
            
            this.checkAndUpdateStoryState(taskToDelete.historyjkaId);
        }
    }

    private checkAndUpdateStoryState(historyjkaId: string): void {
        const stories = this.getStories();
        const story = stories.find(s => s.id === historyjkaId);
        if (!story) return;

        const storyTasks = this.getTasks(historyjkaId);
        
        if (storyTasks.length === 0) {
            if (story.stan !== 'todo') this.updateStory(historyjkaId, { stan: 'todo' });
            return;
        }

        const allDone = storyTasks.every(t => t.stan === 'done');
        const anyDoingOrDone = storyTasks.some(t => t.stan === 'doing' || t.stan === 'done');

        if (allDone) {
            if (story.stan !== 'done') this.updateStory(historyjkaId, { stan: 'done' });
        } 

        else if (anyDoingOrDone) {
            if (story.stan !== 'doing') this.updateStory(historyjkaId, { stan: 'doing' });
        } 

        else {
            if (story.stan !== 'todo') this.updateStory(historyjkaId, { stan: 'todo' });
        }
    }
}