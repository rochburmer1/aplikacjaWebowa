import type { Project } from '../models/Project';
import type { User } from '../models/User';
import type { Story } from '../models/Story';

export class LocalStorageService {
    private readonly PROJECTS_KEY = 'manageme_projects';
    private readonly STORIES_KEY = 'manageme_stories';
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
}