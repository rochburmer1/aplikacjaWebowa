import type { Project } from '../models/Project';

export class LocalStorageService {
    private readonly STORAGE_KEY = 'manageme_projects';

    // R - Read (pobierz wszystkie)
    getProjects(): Project[] {
        const data = localStorage.getItem(this.STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    }

    // R - Read (pobierz jeden po ID)
    getProject(id: string): Project | undefined {
        return this.getProjects().find(p => p.id === id);
    }

    // C - Create (dodaj nowy)
    createProject(project: Omit<Project, 'id'>): Project {
        const projects = this.getProjects();
        const newProject: Project = {
            id: crypto.randomUUID(), // Generuje bezpieczne, unikalne ID
            ...project
        };
        
        projects.push(newProject);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(projects));
        
        return newProject;
    }

    // U - Update (aktualizuj istniejący)
    updateProject(id: string, projectData: Partial<Project>): Project {
        const projects = this.getProjects();
        const index = projects.findIndex(p => p.id === id);
        
        if (index === -1) {
            throw new Error('Nie znaleziono projektu');
        }

        projects[index] = { ...projects[index], ...projectData };
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(projects));
        
        return projects[index];
    }

    // D - Delete (usuń)
    deleteProject(id: string): void {
        const projects = this.getProjects();
        const filteredProjects = projects.filter(p => p.id !== id);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredProjects));
    }
}