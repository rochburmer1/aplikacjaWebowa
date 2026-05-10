import { useState, useEffect, type SyntheticEvent } from 'react';
import { LocalStorageService } from './services/StorageService';
import type { Project } from './models/Project';
import type { Story } from './models/Story';
import type { Task } from './models/Task';
import type { Notification } from './models/Notification';
import type { User, Role } from './models/User';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode";

const storage = new LocalStorageService();

function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches));

  useEffect(() => {
    if (isDarkMode) { document.documentElement.classList.add('dark'); localStorage.theme = 'dark'; } 
    else { document.documentElement.classList.remove('dark'); localStorage.theme = 'light'; }
  }, [isDarkMode]);

  // --- SESJA UŻYTKOWNIKA ---
  const [loggedUser, setLoggedUser] = useState<User | null>(storage.getLoggedUser());
  const [allUsers, setAllUsers] = useState<User[]>([]);
  
  // --- STANY NAWIGACJI ---
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeStoryId, setActiveStoryId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showNotificationsList, setShowNotificationsList] = useState(false);
  const [showAdminUsers, setShowAdminUsers] = useState(false);

  // --- DANE ---
  const [projects, setProjects] = useState<Project[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [toastNotification, setToastNotification] = useState<Notification | null>(null);

  // --- FORMULARZE ---
  const [projNazwa, setProjNazwa] = useState('');
  const [projOpis, setProjOpis] = useState('');
  const [storyNazwa, setStoryNazwa] = useState('');
  const [storyOpis, setStoryOpis] = useState('');
  const [taskNazwa, setTaskNazwa] = useState('');
  const [taskOpis, setTaskOpis] = useState('');
  const [taskCzas, setTaskCzas] = useState(1);

  // --- ASYNCHRONICZNE ŁADOWANIE DANYCH ---
  const loadInitialData = async () => {
    if (loggedUser && loggedUser.rola !== 'gosc' && !loggedUser.isBlocked) {
      const [projs, notifs, users] = await Promise.all([
        storage.getProjects(),
        storage.getNotifications(loggedUser.id),
        storage.getUsers()
      ]);
      setProjects(projs);
      setNotifications(notifs);
      setAllUsers(users);

      const savedActiveId = storage.getActiveProjectId();
      if (savedActiveId) {
        setActiveProjectId(savedActiveId);
        const projectStories = await storage.getStories(savedActiveId);
        setStories(projectStories);
      }
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [loggedUser]);

  // --- LOGOWANIE I WYLOGOWANIE ---
  const handleLoginSuccess = async (credentialResponse: any) => {
    const decoded: any = jwtDecode(credentialResponse.credential);
    
    // ZABEZPIECZENIE: Jeśli Google nie zwróci imienia/nazwiska, używamy pustego tekstu
    const bezpieczneImie = decoded.given_name || "Użytkownik";
    const bezpieczneNazwisko = decoded.family_name || "";

    const user = await storage.handleGoogleLogin(decoded.email, bezpieczneImie, bezpieczneNazwisko);
    setLoggedUser(user);
  };

  const handleLogout = () => {
    storage.logout();
    setLoggedUser(null);
  };

  // --- WIDOKI BEZ UPRAWNIEŃ ---
  if (!loggedUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white">
        <div className="bg-white dark:bg-gray-800 p-10 rounded-xl shadow-xl text-center max-w-md w-full border border-gray-200 dark:border-gray-700">
          <h1 className="text-4xl font-bold mb-6">ManageMe</h1>
          <p className="mb-8 text-gray-500 dark:text-gray-400">Zaloguj się kontem Google, aby uzyskać dostęp do chmury Firestore.</p>
          <div className="flex justify-center">
            <GoogleLogin onSuccess={handleLoginSuccess} onError={() => console.log('Login Failed')} />
          </div>
        </div>
      </div>
    );
  }

  if (loggedUser.isBlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center p-5 text-gray-900 dark:text-white">
        <div>
          <h1 className="text-4xl font-bold text-red-500 mb-4">Konto zablokowane</h1>
          <p className="mb-6">Skontaktuj się z administratorem systemu.</p>
          <button onClick={handleLogout} className="px-4 py-2 bg-gray-500 text-white rounded">Wyloguj</button>
        </div>
      </div>
    );
  }

  if (loggedUser.rola === 'gosc') {
    return (
      <div className="min-h-screen flex items-center justify-center text-center p-5 text-gray-900 dark:text-white">
        <div>
          <h1 className="text-3xl font-bold mb-4">Oczekiwanie na zatwierdzenie</h1>
          <p className="mb-6 text-gray-500">Konto utworzone w Firestore. Administrator musi przypisać Ci rolę.</p>
          <button onClick={handleLogout} className="px-4 py-2 bg-gray-500 text-white rounded">Wyloguj</button>
        </div>
      </div>
    );
  }

  // --- ZARZĄDZANIE UŻYTKOWNIKAMI (ADMIN) ---
  const handleUpdateRole = async (userId: string, nowaRola: Role) => {
    await storage.updateUser(userId, { rola: nowaRola });
    const users = await storage.getUsers();
    setAllUsers(users);
  };

  const handleToggleBlock = async (userId: string, isBlocked: boolean) => {
    await storage.updateUser(userId, { isBlocked: !isBlocked });
    const users = await storage.getUsers();
    setAllUsers(users);
  };

  // --- RESZTA LOGIKI APLIKACJI ---
  const assignableUsers = allUsers.filter(u => (u.rola === 'developer' || u.rola === 'devops') && !u.isBlocked);

  const handleGoHome = () => {
    setActiveProjectId(null); setActiveStoryId(null); setSelectedTaskId(null);
    setShowNotificationsList(false); setShowAdminUsers(false); setSelectedNotification(null);
    storage.setActiveProjectId(null);
  };

  const notifyAndRefresh = async (newNotif: Notification) => {
    if (newNotif.recipientId === loggedUser.id) {
      const notifs = await storage.getNotifications(loggedUser.id);
      setNotifications(notifs);
      if (newNotif.priority === 'medium' || newNotif.priority === 'high') {
        setToastNotification(newNotif);
        setTimeout(() => setToastNotification(null), 5000);
      }
    }
  };

  const handleSelectProject = async (id: string) => {
    storage.setActiveProjectId(id);
    setActiveProjectId(id);
    const projStories = await storage.getStories(id);
    setStories(projStories);
    setActiveStoryId(null); setSelectedTaskId(null); setShowNotificationsList(false); setShowAdminUsers(false);
  };

  const handleSelectStory = async (id: string) => {
    setActiveStoryId(id);
    const storyTasks = await storage.getTasks(id);
    setTasks(storyTasks);
    setSelectedTaskId(null);
  };

  const handleAddProject = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (!projNazwa.trim() || !projOpis.trim()) return;
    const newProj = await storage.createProject({ nazwa: projNazwa, opis: projOpis });
    
    // Powiadomienia w chmurze
    const admins = allUsers.filter(u => u.rola === 'admin');
    for (const admin of admins) {
      const n = await storage.createNotification({ title: 'Nowy Projekt', message: `Utworzono projekt w Firestore: ${newProj.nazwa}`, priority: 'high', recipientId: admin.id });
      await notifyAndRefresh(n);
    }
    
    const projs = await storage.getProjects();
    setProjects(projs); setProjNazwa(''); setProjOpis('');
  };

  const handleAddStory = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (!activeProjectId || !storyNazwa.trim()) return;
    await storage.createStory({ nazwa: storyNazwa, opis: storyOpis, priorytet: 'niski', stan: 'todo', projektId: activeProjectId, wlascicielId: loggedUser.id });
    const projStories = await storage.getStories(activeProjectId);
    setStories(projStories);
    setStoryNazwa(''); setStoryOpis('');
  };

  const handleAddTask = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (!activeStoryId || !taskNazwa.trim()) return;
    const newTask = await storage.createTask({ nazwa: taskNazwa, opis: taskOpis, priorytet: 'niski', historyjkaId: activeStoryId, przewidywanyCzas: taskCzas, przepracowaneGodziny: 0, stan: 'todo' });
    
    const story = stories.find(s => s.id === activeStoryId);
    if (story) {
      const n = await storage.createNotification({ title: 'Nowe Zadanie', message: `Dodano zadanie do chmury.`, priority: 'medium', recipientId: story.wlascicielId });
      await notifyAndRefresh(n);
    }
    const storyTasks = await storage.getTasks(activeStoryId);
    setTasks(storyTasks);
    setTaskNazwa(''); setTaskOpis(''); setTaskCzas(1);
  };

  const handleDeleteTask = async (taskId: string) => {
    // Wywołujemy naszą nową funkcję usuwającą z bazy/dysku!
    await storage.deleteTask(taskId); 
    
    // Odświeżamy listę zadań
    const storyTasks = await storage.getTasks(activeStoryId!);
    setTasks(storyTasks);
  };

  const handleAssignUser = async (taskId: string, userId: string) => {
    await storage.updateTask(taskId, { przypisanyUzytkownikId: userId, stan: 'doing', dataStartu: new Date().toISOString() });
    const storyTasks = await storage.getTasks(activeStoryId!);
    setTasks(storyTasks);
    
    const n = await storage.createNotification({ title: 'Zadanie przypisane', message: `Zostałeś przypisany w Firestore.`, priority: 'high', recipientId: userId });
    await notifyAndRefresh(n);
  };

  const handleFinishTask = async (taskId: string) => {
    await storage.updateTask(taskId, { stan: 'done', dataZakonczenia: new Date().toISOString() });
    const storyTasks = await storage.getTasks(activeStoryId!);
    setTasks(storyTasks);
    setSelectedTaskId(null);
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="max-w-5xl mx-auto p-5 text-gray-900 dark:text-gray-100 min-h-screen font-sans">
      {/* NAGŁÓWEK */}
      <header className="flex justify-between items-center mb-8 border-b pb-4 border-gray-300 dark:border-gray-700">
        <div>
          <h1 onClick={handleGoHome} className="text-3xl font-bold cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors">ManageMe Cloud</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-sm font-bold text-gray-600 dark:text-gray-300">{loggedUser.imie} ({loggedUser.rola})</span>
            <button onClick={() => { setShowNotificationsList(true); setShowAdminUsers(false); setActiveProjectId(null); setSelectedNotification(null); }} className="relative text-sm px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600">
              🔔 Powiadomienia {unreadCount > 0 && <span className="absolute -top-2 -right-2 bg-red-500 text-white px-1.5 py-0.5 rounded-full text-xs font-bold">{unreadCount}</span>}
            </button>
            {loggedUser.rola === 'admin' && (
              <button onClick={() => { setShowAdminUsers(true); setShowNotificationsList(false); setActiveProjectId(null); setSelectedNotification(null); }} className="text-sm px-3 py-1 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors">
                👥 Użytkownicy
              </button>
            )}
            <button onClick={handleLogout} className="text-sm px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors">Wyloguj</button>
          </div>
        </div>
        <button onClick={() => setIsDarkMode(!isDarkMode)} className="px-3 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 transition-colors">
          {isDarkMode ? '☀️ Jasny' : '🌙 Ciemny'}
        </button>
      </header>

      {/* TOAST POWIADOMIEŃ */}
      {toastNotification && (
        <div className="fixed bottom-5 right-5 w-80 bg-white dark:bg-gray-800 border-l-4 border-blue-500 shadow-2xl rounded-lg p-4 z-50 animate-bounce">
          <div className="flex justify-between items-start">
            <h4 className="font-bold text-gray-800 dark:text-white">{toastNotification.title}</h4>
            <span className={`text-xs px-2 py-1 rounded-full uppercase font-bold ${toastNotification.priority === 'high' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{toastNotification.priority}</span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{toastNotification.message}</p>
        </div>
      )}

      {/* DRZEWO WIDOKÓW */}
      {showAdminUsers ? (
        <div className="animate-fade-in">
          <button onClick={handleGoHome} className="mb-4 text-blue-600 dark:text-blue-400 hover:underline font-semibold">⬅ Wróć do projektów</button>
          <h2 className="text-2xl font-bold mb-6">Zarządzanie Użytkownikami (Cloud)</h2>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-700 border-b dark:border-gray-600">
                  <th className="p-4">Użytkownik</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Rola</th>
                  <th className="p-4">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {allUsers.map(u => (
                  <tr key={u.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <td className="p-4 font-bold">{u.imie} {u.nazwisko} {u.isBlocked && <span className="text-red-500 text-xs ml-2">(Zablokowany)</span>}</td>
                    <td className="p-4 text-gray-500 dark:text-gray-400">{u.email}</td>
                    <td className="p-4">
                      <select value={u.rola} onChange={(e) => handleUpdateRole(u.id, e.target.value as Role)} disabled={u.email === loggedUser.email} className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none">
                        <option value="gosc">Gość</option>
                        <option value="developer">Developer</option>
                        <option value="devops">DevOps</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="p-4">
                      <button onClick={() => handleToggleBlock(u.id, u.isBlocked || false)} disabled={u.email === loggedUser.email} className={`text-sm px-4 py-2 rounded text-white font-medium transition-colors ${u.isBlocked ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}>
                        {u.isBlocked ? 'Odblokuj' : 'Zablokuj'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : selectedNotification ? (
        <div className="animate-fade-in">
          <button onClick={() => setSelectedNotification(null)} className="mb-4 text-blue-600 dark:text-blue-400 hover:underline font-semibold">⬅ Wróć do listy powiadomień</button>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold mb-4">{selectedNotification.title}</h2>
            <p className="text-lg mb-4 text-gray-800 dark:text-gray-200">{selectedNotification.message}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Data: {new Date(selectedNotification.date).toLocaleString()}</p>
          </div>
        </div>
      ) : showNotificationsList ? (
        <div className="animate-fade-in">
          <button onClick={handleGoHome} className="mb-4 text-blue-600 dark:text-blue-400 hover:underline font-semibold">⬅ Wróć do projektów</button>
          <h2 className="text-2xl font-bold mb-6">Twoje Powiadomienia</h2>
          <ul className="space-y-3">
            {notifications.length === 0 && <p className="text-gray-500 dark:text-gray-400 text-lg">Brak powiadomień.</p>}
            {notifications.map(n => (
              <li key={n.id} onClick={async () => { await storage.markNotificationAsRead(n.id); loadInitialData(); setSelectedNotification(n); }} 
                  className={`p-4 rounded-lg border cursor-pointer transition-colors shadow-sm hover:shadow-md ${n.isRead ? 'opacity-60 bg-gray-50 border-gray-200 dark:bg-gray-800/50 dark:border-gray-700' : 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'}`}>
                <div className="flex justify-between items-start">
                  <strong className="block text-lg text-gray-900 dark:text-gray-100">
                    {n.title} {!n.isRead && <span className="text-red-500 text-sm ml-2 animate-pulse">● Nowe</span>}
                  </strong>
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-4 whitespace-nowrap">{new Date(n.date).toLocaleString()}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : selectedTaskId ? (
        (() => {
          const task = tasks.find(t => t.id === selectedTaskId);
          const parentStory = stories.find(s => s.id === task?.historyjkaId);
          if (!task) return null;
          const przypisanaOsoba = assignableUsers.find(u => u.id === task.przypisanyUzytkownikId);

          return (
            <div className="max-w-2xl mx-auto p-5 animate-fade-in">
              <button onClick={() => setSelectedTaskId(null)} className="mb-4 text-blue-600 dark:text-blue-400 hover:underline font-semibold">⬅ Wróć do tablicy zadań</button>
              <h2 className="text-2xl font-bold mb-4">Szczegóły Zadania: <span className="text-blue-600 dark:text-blue-400">{task.nazwa}</span></h2>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                <p className="mb-3 text-lg text-gray-800 dark:text-gray-200"><strong>Opis:</strong> {task.opis}</p>
                <p className="mb-2 text-gray-700 dark:text-gray-300"><strong>Przypisana historyjka:</strong> {parentStory?.nazwa}</p>
                <p className="mb-2 text-gray-700 dark:text-gray-300"><strong>Estymacja:</strong> {task.przewidywanyCzas}h</p>
                <p className="mb-4"><strong>Stan:</strong> <span className="uppercase font-bold text-white bg-blue-500 px-2 py-1 rounded text-sm ml-2">{task.stan}</span></p>
                
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-md mb-4 border border-gray-200 dark:border-gray-600">
                  <p className="mb-1 text-sm text-gray-600 dark:text-gray-400"><strong>Data dodania:</strong> {new Date(task.dataDodania).toLocaleString()}</p>
                  {task.dataStartu && <p className="mb-1 text-sm text-gray-600 dark:text-gray-400"><strong>Data startu:</strong> {new Date(task.dataStartu).toLocaleString()}</p>}
                  {task.dataZakonczenia && <p className="mb-1 text-sm text-gray-600 dark:text-gray-400"><strong>Data zakończenia:</strong> {new Date(task.dataZakonczenia).toLocaleString()}</p>}
                </div>
                
                <hr className="my-5 border-gray-300 dark:border-gray-600" />
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="mb-2 text-gray-800 dark:text-gray-200"><strong>Przypisano do:</strong> {przypisanaOsoba ? <span className="font-semibold text-blue-600 dark:text-blue-400">{przypisanaOsoba.imie} {przypisanaOsoba.nazwisko} ({przypisanaOsoba.rola})</span> : <span className="text-gray-500 italic">Brak</span>}</p>
                    {!task.przypisanyUzytkownikId && task.stan === 'todo' && (
                      <select onChange={(e) => handleAssignUser(task.id, e.target.value)} defaultValue="" className="p-2 border rounded-md dark:border-gray-600 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-auto">
                        <option value="" disabled>-- Przypisz osobę (DevOps / Dev) --</option>
                        {assignableUsers.map(u => <option key={u.id} value={u.id}>{u.imie} {u.nazwisko} ({u.rola})</option>)}
                      </select>
                    )}
                  </div>
                  {task.stan === 'doing' && (
                    <button onClick={() => handleFinishTask(task.id)} className="px-5 py-2.5 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 shadow-md transition-all">✔ Oznacz jako Done</button>
                  )}
                </div>
              </div>
            </div>
          );
        })()
      ) : activeStoryId ? (
        (() => {
          const activeStory = stories.find(s => s.id === activeStoryId);
          return (
            <div className="animate-fade-in">
              <button onClick={() => setActiveStoryId(null)} className="mb-4 text-blue-600 dark:text-blue-400 hover:underline font-semibold">⬅ Wróć do historyjek</button>
              <h2 className="text-2xl font-bold mb-2">Zadania dla: <span className="text-blue-600 dark:text-blue-400">{activeStory?.nazwa}</span></h2>
              <p className="mb-6 text-gray-600 dark:text-gray-400">Stan historyjki: <span className="uppercase font-bold text-gray-800 dark:text-gray-200">{activeStory?.stan}</span></p>
              
              <form onSubmit={handleAddTask} className="flex flex-col sm:flex-row flex-wrap gap-3 mb-8 p-5 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <input type="text" placeholder="Nowe zadanie" value={taskNazwa} onChange={(e) => setTaskNazwa(e.target.value)} required className="flex-1 p-3 border rounded-lg dark:border-gray-600 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                <input type="text" placeholder="Opis zadania" value={taskOpis} onChange={(e) => setTaskOpis(e.target.value)} required className="flex-[2] p-3 border rounded-lg dark:border-gray-600 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                <div className="flex items-center gap-2 bg-white dark:bg-gray-700 px-3 rounded-lg border border-gray-300 dark:border-gray-600">
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap">Czas (h):</span>
                  <input type="number" min="1" value={taskCzas} onChange={(e) => setTaskCzas(Number(e.target.value))} required className="w-16 p-2 bg-transparent text-gray-900 dark:text-white outline-none font-semibold text-center" />
                </div>
                <button type="submit" className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md transition-all">Dodaj Zadanie</button>
              </form>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { title: 'TODO', items: tasks.filter(t => t.stan === 'todo'), color: 'border-l-4 border-gray-400' },
                  { title: 'DOING', items: tasks.filter(t => t.stan === 'doing'), color: 'border-l-4 border-blue-500' },
                  { title: 'DONE', items: tasks.filter(t => t.stan === 'done'), color: 'border-l-4 border-green-500' }
                ].map(col => (
                  <div key={col.title} className="bg-gray-100 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-inner min-h-[300px]">
                    <h4 className="font-bold text-lg mb-4 pb-2 border-b border-gray-300 dark:border-gray-600">{col.title} <span className="text-gray-500 text-sm font-normal">({col.items.length})</span></h4>
                    <div className="space-y-3">
                      {col.items.map(task => (
                        <div key={task.id} className={`bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow ${col.color}`}>
                          <strong className="block mb-2 text-lg text-gray-900 dark:text-gray-100">{task.nazwa}</strong>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2" title={task.opis}>{task.opis}</p>
                          <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 p-2 rounded -mx-2 -mb-2 mt-2">
                             <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">⏱ {task.przewidywanyCzas}h</span>
                            <div className="flex gap-2">
                               <button onClick={() => handleDeleteTask(task.id)} className="text-xs text-red-500 hover:text-red-700 hover:underline px-2 py-1">Usuń</button>
                               <button onClick={() => setSelectedTaskId(task.id)} className="text-xs font-bold px-3 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors">Szczegóły ➡</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()
      ) : activeProjectId ? (
        (() => {
          const activeProject = projects.find(p => p.id === activeProjectId); // Pobieramy ze stanu projektów
          return (
            <div className="animate-fade-in">
              <button onClick={handleGoHome} className="mb-4 text-blue-600 dark:text-blue-400 hover:underline font-semibold">⬅ Wróć do listy projektów</button>
              <h2 className="text-3xl font-bold mb-6">Projekt: <span className="text-blue-600 dark:text-blue-400">{activeProject?.nazwa}</span></h2>
              
              <form onSubmit={handleAddStory} className="flex flex-col sm:flex-row gap-3 mb-8 p-5 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <input type="text" placeholder="Nazwa historyjki (np. Logowanie)" value={storyNazwa} onChange={(e) => setStoryNazwa(e.target.value)} required className="flex-1 p-3 border rounded-lg dark:border-gray-600 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                <input type="text" placeholder="Szczegółowy opis" value={storyOpis} onChange={(e) => setStoryOpis(e.target.value)} required className="flex-[2] p-3 border rounded-lg dark:border-gray-600 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                <button type="submit" className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md transition-all whitespace-nowrap">Dodaj Historyjkę</button>
              </form>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {['todo', 'doing', 'done'].map(stan => (
                  <div key={stan} className="bg-gray-100 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-inner min-h-[300px]">
                    <h4 className="font-bold text-lg mb-4 pb-2 border-b border-gray-300 dark:border-gray-600 uppercase">{stan} <span className="text-gray-500 text-sm font-normal">({stories.filter(s => s.stan === stan).length})</span></h4>
                    <div className="space-y-3">
                      {stories.filter(s => s.stan === stan).map(story => (
                        <div key={story.id} className="bg-white dark:bg-gray-700 p-5 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 hover:shadow-md transition-all flex flex-col">
                          <strong className="block mb-2 text-xl text-gray-900 dark:text-gray-100">{story.nazwa}</strong>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-3" title={story.opis}>{story.opis}</p>
                          <button onClick={() => handleSelectStory(story.id)} className="mt-auto text-sm font-bold px-4 py-2 w-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded hover:bg-blue-100 dark:hover:bg-blue-800/50 transition-colors">
                            Zarządzaj Zadaniami ➡
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()
      ) : (
        <div className="max-w-4xl mx-auto animate-fade-in">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800 p-6 rounded-2xl mb-10 border border-blue-100 dark:border-gray-700 shadow-sm">
             <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-100">Utwórz nowy projekt</h2>
            <form onSubmit={handleAddProject} className="flex flex-col md:flex-row gap-4">
              <input type="text" placeholder="Nazwa projektu" value={projNazwa} onChange={(e) => setProjNazwa(e.target.value)} required className="flex-1 p-3 border rounded-xl dark:border-gray-600 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
              <input type="text" placeholder="Krótki opis" value={projOpis} onChange={(e) => setProjOpis(e.target.value)} required className="flex-[2] p-3 border rounded-xl dark:border-gray-600 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
              <button type="submit" className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-md transition-all whitespace-nowrap">Utwórz w Cloud</button>
            </form>
          </div>
          
          <h3 className="text-xl font-bold mb-4 text-gray-700 dark:text-gray-300">Twoje aktywne projekty ({projects.length})</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {projects.length === 0 && <p className="text-gray-500 dark:text-gray-400 italic col-span-2">Brak projektów. Utwórz pierwszy powyżej!</p>}
            {projects.map((project) => (
              <div key={project.id} className="p-6 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-2xl shadow-sm flex flex-col justify-between transition-all hover:shadow-lg hover:border-blue-400 dark:hover:border-blue-500 group">
                <div className="mb-6">
                  <strong className="text-2xl block mb-2 text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{project.nazwa}</strong>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-3">{project.opis}</p>
                </div>
                <button onClick={() => handleSelectProject(project.id)} className="w-full py-3 bg-gray-50 dark:bg-gray-700 text-blue-700 dark:text-blue-300 font-bold rounded-xl border border-gray-200 dark:border-gray-600 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all">
                  Otwórz Projekt ➡
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;