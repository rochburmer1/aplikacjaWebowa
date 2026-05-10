import { db } from './firebase';
import { collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore';
import { APP_CONFIG } from '../config';
import type { Project } from '../models/Project';
import type { Story } from '../models/Story';
import type { Task } from '../models/Task';
import type { Notification } from '../models/Notification';
import type { User, Role } from '../models/User';

const SUPER_ADMIN_EMAIL = "roch.burmer@gmail.com";

export class LocalStorageService {
    // Klucze dla LocalStorage (kompatybilność wsteczna)
    private readonly KEYS = {
        PROJECTS: 'manageme_projects',
        STORIES: 'manageme_stories',
        TASKS: 'manageme_tasks',
        USERS: 'manageme_users',
        NOTIFS: 'manageme_notifications',
        LOGGED: 'manageme_logged_user',
        ACTIVE: 'manageme_active_project'
    };

    private isFirestore() { return APP_CONFIG.STORAGE_MECHANISM === 'firestore'; }

    // ==========================================
    // UŻYTKOWNICY I SESJA
    // ==========================================
    async getUsers(): Promise<User[]> {
        if (this.isFirestore()) {
            const snap = await getDocs(collection(db, "users"));
            return snap.docs.map(d => d.data() as User);
        }
        const data = localStorage.getItem(this.KEYS.USERS);
        return data ? JSON.parse(data) : [];
    }

    getLoggedUser(): User | null { // Sesja zostaje w localStorage dla wygody
        const data = localStorage.getItem(this.KEYS.LOGGED);
        return data ? JSON.parse(data) : null;
    }

    logout(): void {
        localStorage.removeItem(this.KEYS.LOGGED);
    }

    async handleGoogleLogin(email: string, imie: string, nazwisko: string): Promise<User> {
        const users = await this.getUsers();
        let user = users.find(u => u.email === email);

        if (!user) {
            const rola: Role = email === SUPER_ADMIN_EMAIL ? 'admin' : 'gosc';
            user = { id: crypto.randomUUID(), email, imie, nazwisko, rola, isBlocked: false };
            
            if (this.isFirestore()) {
                await setDoc(doc(db, "users", user.id), user);
                // Powiadomienie dla adminów w chmurze
                const admins = users.filter(u => u.rola === 'admin');
                for (const admin of admins) {
                    await this.createNotification({
                        title: 'Nowe konto (Cloud)',
                        message: `Użytkownik ${imie} zalogował się przez Google.`,
                        priority: 'high',
                        recipientId: admin.id
                    });
                }
            } else {
                users.push(user);
                localStorage.setItem(this.KEYS.USERS, JSON.stringify(users));
            }
        }
        localStorage.setItem(this.KEYS.LOGGED, JSON.stringify(user));
        return user;
    }

    async updateUser(id: string, updates: Partial<User>): Promise<void> {
        if (this.isFirestore()) {
            await updateDoc(doc(db, "users", id), updates);
        } else {
            const users = await this.getUsers();
            const idx = users.findIndex(u => u.id === id);
            if (idx !== -1) {
                users[idx] = { ...users[idx], ...updates };
                localStorage.setItem(this.KEYS.USERS, JSON.stringify(users));
            }
        }
        const logged = this.getLoggedUser();
        if (logged && logged.id === id) {
            localStorage.setItem(this.KEYS.LOGGED, JSON.stringify({ ...logged, ...updates }));
        }
    }

    // ==========================================
    // PROJEKTY
    // ==========================================
    async getProjects(): Promise<Project[]> {
        if (this.isFirestore()) {
            const snap = await getDocs(collection(db, "projects"));
            return snap.docs.map(d => d.data() as Project);
        }
        const data = localStorage.getItem(this.KEYS.PROJECTS);
        return data ? JSON.parse(data) : [];
    }

    async createProject(project: Omit<Project, 'id'>): Promise<Project> {
        const newProj: Project = { id: crypto.randomUUID(), ...project };
        if (this.isFirestore()) {
            await setDoc(doc(db, "projects", newProj.id), newProj);
        } else {
            const projs = await this.getProjects();
            projs.push(newProj);
            localStorage.setItem(this.KEYS.PROJECTS, JSON.stringify(projs));
        }
        return newProj;
    }

    // ==========================================
    // HISTORYJKI
    // ==========================================
    async getStories(projectId: string): Promise<Story[]> {
        if (this.isFirestore()) {
            const q = query(collection(db, "stories"), where("projektId", "==", projectId));
            const snap = await getDocs(q);
            return snap.docs.map(d => d.data() as Story);
        }
        const data = localStorage.getItem(this.KEYS.STORIES);
        const stories: Story[] = data ? JSON.parse(data) : [];
        return stories.filter(s => s.projektId === projectId);
    }

    async createStory(story: Omit<Story, 'id' | 'dataUtworzenia'>): Promise<Story> {
        const newStory: Story = { id: crypto.randomUUID(), dataUtworzenia: new Date().toISOString(), ...story };
        if (this.isFirestore()) {
            await setDoc(doc(db, "stories", newStory.id), newStory);
        } else {
            const data = localStorage.getItem(this.KEYS.STORIES);
            const stories = data ? JSON.parse(data) : [];
            stories.push(newStory);
            localStorage.setItem(this.KEYS.STORIES, JSON.stringify(stories));
        }
        return newStory;
    }

    // ==========================================
    // ZADANIA
    // ==========================================
    async getTasks(storyId: string): Promise<Task[]> {
        if (this.isFirestore()) {
            const q = query(collection(db, "tasks"), where("historyjkaId", "==", storyId));
            const snap = await getDocs(q);
            return snap.docs.map(d => d.data() as Task);
        }
        const data = localStorage.getItem(this.KEYS.TASKS);
        const tasks: Task[] = data ? JSON.parse(data) : [];
        return tasks.filter(t => t.historyjkaId === storyId);
    }

    async createTask(task: Omit<Task, 'id' | 'dataDodania'>): Promise<Task> {
        const newTask: Task = { id: crypto.randomUUID(), dataDodania: new Date().toISOString(), ...task };
        if (this.isFirestore()) {
            await setDoc(doc(db, "tasks", newTask.id), newTask);
        } else {
            const data = localStorage.getItem(this.KEYS.TASKS);
            const tasks = data ? JSON.parse(data) : [];
            tasks.push(newTask);
            localStorage.setItem(this.KEYS.TASKS, JSON.stringify(tasks));
        }
        return newTask;
    }
    
    async deleteTask(id: string): Promise<void> {
        if (this.isFirestore()) {
            await deleteDoc(doc(db, "tasks", id));
        } else {
            const data = localStorage.getItem(this.KEYS.TASKS);
            if (data) {
                let tasks: Task[] = JSON.parse(data);
                tasks = tasks.filter(t => t.id !== id);
                localStorage.setItem(this.KEYS.TASKS, JSON.stringify(tasks));
            }
        }
    }

    async updateTask(id: string, updates: Partial<Task>): Promise<void> {
        if (this.isFirestore()) {
            await updateDoc(doc(db, "tasks", id), updates);
        } else {
            const data = localStorage.getItem(this.KEYS.TASKS);
            let tasks: Task[] = data ? JSON.parse(data) : [];
            tasks = tasks.map(t => t.id === id ? { ...t, ...updates } : t);
            localStorage.setItem(this.KEYS.TASKS, JSON.stringify(tasks));
        }
    }

    // ==========================================
    // POWIADOMIENIA
    // ==========================================
    async getNotifications(userId: string): Promise<Notification[]> {
        if (this.isFirestore()) {
            const q = query(collection(db, "notifications"), where("recipientId", "==", userId));
            const snap = await getDocs(q);
            return snap.docs.map(d => d.data() as Notification).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        }
        const data = localStorage.getItem(this.KEYS.NOTIFS);
        const notifs: Notification[] = data ? JSON.parse(data) : [];
        return notifs.filter(n => n.recipientId === userId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    async createNotification(notif: Omit<Notification, 'id' | 'date' | 'isRead'>): Promise<Notification> {
        const newNotif: Notification = { id: crypto.randomUUID(), date: new Date().toISOString(), isRead: false, ...notif };
        if (this.isFirestore()) {
            await setDoc(doc(db, "notifications", newNotif.id), newNotif);
        } else {
            const data = localStorage.getItem(this.KEYS.NOTIFS);
            const notifs = data ? JSON.parse(data) : [];
            notifs.push(newNotif);
            localStorage.setItem(this.KEYS.NOTIFS, JSON.stringify(notifs));
        }
        return newNotif;
    }

    async markNotificationAsRead(id: string): Promise<void> {
        if (this.isFirestore()) {
            await updateDoc(doc(db, "notifications", id), { isRead: true });
        } else {
            const data = localStorage.getItem(this.KEYS.NOTIFS);
            if (!data) return;
            const notifs: Notification[] = JSON.parse(data);
            const idx = notifs.findIndex(n => n.id === id);
            if (idx !== -1) {
                notifs[idx].isRead = true;
                localStorage.setItem(this.KEYS.NOTIFS, JSON.stringify(notifs));
            }
        }
    }

    // Pomocnicze (Sync)
    getActiveProjectId(): string | null { return localStorage.getItem(this.KEYS.ACTIVE); }
    setActiveProjectId(id: string | null): void { 
        if (id) localStorage.setItem(this.KEYS.ACTIVE, id); 
        else localStorage.removeItem(this.KEYS.ACTIVE); 
    }
}