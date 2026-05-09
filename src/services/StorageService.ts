import type { Project } from '../models/Project';
import type { Story } from '../models/Story';
import type { Task } from '../models/Task';
import type { Notification } from '../models/Notification';
import type { User, Role } from '../models/User';

const SUPER_ADMIN_EMAIL = "roch.burmer@gmail.com";

export class LocalStorageService {
    private readonly PROJECTS_KEY = 'manageme_projects';
    private readonly STORIES_KEY = 'manageme_stories';
    private readonly TASKS_KEY = 'manageme_tasks';
    private readonly ACTIVE_PROJECT_KEY = 'manageme_active_project';
    private readonly NOTIFICATIONS_KEY = 'manageme_notifications';
    private readonly USERS_KEY = 'manageme_users';
    private readonly LOGGED_USER_KEY = 'manageme_logged_user';

    // ==========================================
    // AUTORYZACJA I UŻYTKOWNICY
    // ==========================================
    getUsers(): User[] {
        const data = localStorage.getItem(this.USERS_KEY);
        return data ? JSON.parse(data) : [];
    }

    getLoggedUser(): User | null {
        const data = localStorage.getItem(this.LOGGED_USER_KEY);
        return data ? JSON.parse(data) : null;
    }

    logout(): void {
        localStorage.removeItem(this.LOGGED_USER_KEY);
    }

    updateUser(id: string, updates: Partial<User>): void {
        const users = this.getUsers();
        const index = users.findIndex(u => u.id === id);
        if (index !== -1) {
            users[index] = { ...users[index], ...updates };
            localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
            
            // Jeśli aktualizujemy zalogowanego użytkownika (samego siebie)
            const logged = this.getLoggedUser();
            if (logged && logged.id === id) {
                localStorage.setItem(this.LOGGED_USER_KEY, JSON.stringify(users[index]));
            }
        }
    }

    handleGoogleLogin(email: string, imie: string, nazwisko: string): User {
        const users = this.getUsers();
        let user = users.find(u => u.email === email);

        if (!user) {
            // Rejestracja nowego użytkownika
            const rola: Role = email === SUPER_ADMIN_EMAIL ? 'admin' : 'gosc';
            user = { id: crypto.randomUUID(), email, imie, nazwisko, rola, isBlocked: false };
            users.push(user);
            localStorage.setItem(this.USERS_KEY, JSON.stringify(users));

            // POWIADOMIENIE O NOWYM KONCIE
            const admins = users.filter(u => u.rola === 'admin');
            admins.forEach(admin => {
                this.createNotification({
                    title: 'Nowe konto w systemie',
                    message: `Użytkownik ${imie} ${nazwisko} (${email}) zalogował się po raz pierwszy.`,
                    priority: 'high',
                    recipientId: admin.id
                });
            });
        }

        localStorage.setItem(this.LOGGED_USER_KEY, JSON.stringify(user));
        return user;
    }

    // ==========================================
    // LAB 2: AKTYWNY PROJEKT
    // ==========================================
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

    // ==========================================
    // LAB 2: PROJEKTY (CRUD)
    // ==========================================
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

    deleteProject(id: string): void {
        const projects = this.getProjects().filter(p => p.id !== id);
        localStorage.setItem(this.PROJECTS_KEY, JSON.stringify(projects));
    }

    // ==========================================
    // LAB 2: HISTORYJKI (CRUD)
    // ==========================================
    getStories(projektId?: string): Story[] {
        const data = localStorage.getItem(this.STORIES_KEY);
        const stories: Story[] = data ? JSON.parse(data) : [];
        if (projektId) {
            return stories.filter(s => s.projektId === projektId);
        }
        return stories;
    }

    createStory(story: Omit<Story, 'id' | 'dataUtworzenia'>): Story {
        const stories = this.getStories();
        const newStory: Story = {
            id: crypto.randomUUID(),
            dataUtworzenia: new Date().toISOString(),
            ...story
        };
        stories.push(newStory);
        localStorage.setItem(this.STORIES_KEY, JSON.stringify(stories));
        return newStory;
    }

    updateStory(id: string, updates: Partial<Story>): Story | undefined {
        const stories = this.getStories();
        const index = stories.findIndex(s => s.id === id);
        if (index !== -1) {
            stories[index] = { ...stories[index], ...updates };
            localStorage.setItem(this.STORIES_KEY, JSON.stringify(stories));
            return stories[index];
        }
        return undefined;
    }

    deleteStory(id: string): void {
        const stories = this.getStories().filter(s => s.id !== id);
        localStorage.setItem(this.STORIES_KEY, JSON.stringify(stories));
    }

    // ==========================================
    // LAB 3: ZADANIA I AUTOMATYZACJA STATUSÓW
    // ==========================================
    getTasks(historyjkaId?: string): Task[] {
        const data = localStorage.getItem(this.TASKS_KEY);
        const tasks: Task[] = data ? JSON.parse(data) : [];
        if (historyjkaId) {
            return tasks.filter(t => t.historyjkaId === historyjkaId);
        }
        return tasks;
    }

    createTask(task: Omit<Task, 'id' | 'dataDodania'>): Task {
        const tasks = this.getTasks();
        const newTask: Task = {
            id: crypto.randomUUID(),
            dataDodania: new Date().toISOString(),
            ...task
        };
        tasks.push(newTask);
        localStorage.setItem(this.TASKS_KEY, JSON.stringify(tasks));
        this.checkAndUpdateStoryState(newTask.historyjkaId);
        return newTask;
    }

    updateTask(id: string, updates: Partial<Task>): Task | undefined {
        const tasks = this.getTasks();
        const index = tasks.findIndex(t => t.id === id);
        if (index === -1) return undefined;

        let task = tasks[index];

        if (updates.przypisanyUzytkownikId && task.stan === 'todo' && updates.stan !== 'done') {
            updates.stan = 'doing';
            updates.dataStartu = new Date().toISOString();
        }

        if (updates.stan === 'done' && task.stan !== 'done') {
            updates.dataZakonczenia = new Date().toISOString();
        }

        tasks[index] = { ...task, ...updates };
        localStorage.setItem(this.TASKS_KEY, JSON.stringify(tasks));
        this.checkAndUpdateStoryState(tasks[index].historyjkaId);

        return tasks[index];
    }

    deleteTask(id: string): void {
        const tasks = this.getTasks();
        const taskToDelete = tasks.find(t => t.id === id);
        if (taskToDelete) {
            const filteredTasks = tasks.filter(t => t.id !== id);
            localStorage.setItem(this.TASKS_KEY, JSON.stringify(filteredTasks));
            this.checkAndUpdateStoryState(taskToDelete.historyjkaId);
        }
    }

    private checkAndUpdateStoryState(historyjkaId: string): void {
        const storyTasks = this.getTasks(historyjkaId);
        if (storyTasks.length === 0) {
            this.updateStory(historyjkaId, { stan: 'todo' });
            return;
        }

        const allDone = storyTasks.every(t => t.stan === 'done');
        const anyDoingOrDone = storyTasks.some(t => t.stan === 'doing' || t.stan === 'done');

        if (allDone) {
            this.updateStory(historyjkaId, { stan: 'done' });
        } else if (anyDoingOrDone) {
            this.updateStory(historyjkaId, { stan: 'doing' });
        } else {
            this.updateStory(historyjkaId, { stan: 'todo' });
        }
    }

    // ==========================================
    // LAB 5: POWIADOMIENIA
    // ==========================================
    getNotifications(userId: string): Notification[] {
        const data = localStorage.getItem(this.NOTIFICATIONS_KEY);
        const notifications: Notification[] = data ? JSON.parse(data) : [];
        return notifications
            .filter(n => n.recipientId === userId)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    createNotification(notif: Omit<Notification, 'id' | 'date' | 'isRead'>): Notification {
        const notifications = localStorage.getItem(this.NOTIFICATIONS_KEY) 
            ? JSON.parse(localStorage.getItem(this.NOTIFICATIONS_KEY)!) : [];
        const newNotif: Notification = { id: crypto.randomUUID(), date: new Date().toISOString(), isRead: false, ...notif };
        notifications.push(newNotif);
        localStorage.setItem(this.NOTIFICATIONS_KEY, JSON.stringify(notifications));
        return newNotif;
    }

    markNotificationAsRead(id: string): void {
        const data = localStorage.getItem(this.NOTIFICATIONS_KEY);
        if (!data) return;
        const notifications: Notification[] = JSON.parse(data);
        const index = notifications.findIndex(n => n.id === id);
        if (index !== -1) {
            notifications[index].isRead = true;
            localStorage.setItem(this.NOTIFICATIONS_KEY, JSON.stringify(notifications));
        }
    }
}