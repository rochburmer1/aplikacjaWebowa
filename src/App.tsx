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

  useEffect(() => {
    if (loggedUser && loggedUser.rola !== 'gosc' && !loggedUser.isBlocked) {
      setProjects(storage.getProjects());
      setNotifications(storage.getNotifications(loggedUser.id));
      setAllUsers(storage.getUsers());
      const savedActiveId = storage.getActiveProjectId();
      if (savedActiveId) {
        setActiveProjectId(savedActiveId);
        setStories(storage.getStories(savedActiveId));
      }
    }
  }, [loggedUser]);

  // --- LOGOWANIE I WYLOGOWANIE ---
  const handleLoginSuccess = (credentialResponse: any) => {
    const decoded: any = jwtDecode(credentialResponse.credential);
    const user = storage.handleGoogleLogin(decoded.email, decoded.given_name, decoded.family_name);
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
          <p className="mb-8 text-gray-500 dark:text-gray-400">Zaloguj się, aby uzyskać dostęp do systemu.</p>
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
          <p className="mb-6 text-gray-500">Twoje konto zostało utworzone. Czekasz na przypisanie roli przez administratora.</p>
          <button onClick={handleLogout} className="px-4 py-2 bg-gray-500 text-white rounded">Wyloguj</button>
        </div>
      </div>
    );
  }

  // --- ZARZĄDZANIE UŻYTKOWNIKAMI (ADMIN) ---
  const handleUpdateRole = (userId: string, nowaRola: Role) => {
    storage.updateUser(userId, { rola: nowaRola });
    setAllUsers(storage.getUsers());
  };

  const handleToggleBlock = (userId: string, isBlocked: boolean) => {
    storage.updateUser(userId, { isBlocked: !isBlocked });
    setAllUsers(storage.getUsers());
  };

  // --- RESZTA LOGIKI APLIKACJI ---
  const assignableUsers = allUsers.filter(u => (u.rola === 'developer' || u.rola === 'devops') && !u.isBlocked);

  const handleGoHome = () => {
    setActiveProjectId(null); setActiveStoryId(null); setSelectedTaskId(null);
    setShowNotificationsList(false); setShowAdminUsers(false); setSelectedNotification(null);
    storage.setActiveProjectId(null);
  };

  const notifyAndRefresh = (newNotif: Notification) => {
    if (newNotif.recipientId === loggedUser.id) {
      setNotifications(storage.getNotifications(loggedUser.id));
      if (newNotif.priority === 'medium' || newNotif.priority === 'high') {
        setToastNotification(newNotif);
        setTimeout(() => setToastNotification(null), 5000);
      }
    }
  };

  const handleSelectProject = (id: string) => {
    storage.setActiveProjectId(id); setActiveProjectId(id); setStories(storage.getStories(id));
    setActiveStoryId(null); setSelectedTaskId(null); setShowNotificationsList(false); setShowAdminUsers(false);
  };

  const handleSelectStory = (id: string) => {
    setActiveStoryId(id);
    setTasks(storage.getTasks(id));
    setSelectedTaskId(null);
  };

  const handleAddProject = (e: SyntheticEvent) => {
    e.preventDefault();
    if (!projNazwa.trim() || !projOpis.trim()) return;
    const newProj = storage.createProject({ nazwa: projNazwa, opis: projOpis });
    allUsers.filter(u => u.rola === 'admin').forEach(admin => {
      const n = storage.createNotification({ title: 'Nowy Projekt', message: `Utworzono projekt: ${newProj.nazwa}`, priority: 'high', recipientId: admin.id });
      notifyAndRefresh(n);
    });
    setProjects(storage.getProjects()); setProjNazwa(''); setProjOpis('');
  };

  const handleAddStory = (e: SyntheticEvent) => {
    e.preventDefault();
    if (!activeProjectId || !storyNazwa.trim()) return;
    storage.createStory({ nazwa: storyNazwa, opis: storyOpis, priorytet: 'niski', stan: 'todo', projektId: activeProjectId, wlascicielId: loggedUser.id });
    setStories(storage.getStories(activeProjectId));
    setStoryNazwa(''); setStoryOpis('');
  };

  const handleAddTask = (e: SyntheticEvent) => {
    e.preventDefault();
    if (!activeStoryId || !taskNazwa.trim()) return;
    const newTask = storage.createTask({ nazwa: taskNazwa, opis: taskOpis, priorytet: 'niski', historyjkaId: activeStoryId, przewidywanyCzas: taskCzas, przepracowaneGodziny: 0, stan: 'todo' });
    
    const story = stories.find(s => s.id === activeStoryId);
    if (story) {
      const n = storage.createNotification({ title: 'Nowe Zadanie', message: `Dodano zadanie "${newTask.nazwa}" do historyjki.`, priority: 'medium', recipientId: story.wlascicielId });
      notifyAndRefresh(n);
    }
    setTasks(storage.getTasks(activeStoryId));
    setStories(storage.getStories(activeProjectId!));
    setTaskNazwa(''); setTaskOpis(''); setTaskCzas(1);
  };

  const handleDeleteTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    storage.deleteTask(taskId);
    
    const story = stories.find(s => s.id === activeStoryId);
    if (story && task) {
      const n = storage.createNotification({ title: 'Usunięto Zadanie', message: `Zadanie "${task.nazwa}" zostało usunięte.`, priority: 'medium', recipientId: story.wlascicielId });
      notifyAndRefresh(n);
    }
    setTasks(storage.getTasks(activeStoryId!));
    setStories(storage.getStories(activeProjectId!));
  };

  const handleAssignUser = (taskId: string, userId: string) => {
    storage.updateTask(taskId, { przypisanyUzytkownikId: userId });
    const task = tasks.find(t => t.id === taskId);
    const story = stories.find(s => s.id === activeStoryId);
    
    const n1 = storage.createNotification({ title: 'Nowe Zadanie!', message: `Zostałeś przypisany do zadania.`, priority: 'high', recipientId: userId });
    notifyAndRefresh(n1);

    if (task && story) {
      const n2 = storage.createNotification({ title: 'Zadanie w trakcie', message: `Zadanie "${task.nazwa}" jest teraz DOING.`, priority: 'low', recipientId: story.wlascicielId });
      notifyAndRefresh(n2);
    }
    setTasks(storage.getTasks(activeStoryId!));
    setStories(storage.getStories(activeProjectId!));
  };

  const handleFinishTask = (taskId: string) => {
    storage.updateTask(taskId, { stan: 'done' });
    const task = tasks.find(t => t.id === taskId);
    const story = stories.find(s => s.id === activeStoryId);
    if (task && story) {
      const n = storage.createNotification({ title: 'Zadanie ukończone', message: `Zadanie "${task.nazwa}" oznaczono jako DONE.`, priority: 'medium', recipientId: story.wlascicielId });
      notifyAndRefresh(n);
    }
    setTasks(storage.getTasks(activeStoryId!));
    setStories(storage.getStories(activeProjectId!));
    setSelectedTaskId(null);
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="max-w-5xl mx-auto p-5 text-gray-900 dark:text-gray-100 min-h-screen font-sans">
      <header className="flex justify-between items-center mb-8 border-b pb-4 border-gray-300 dark:border-gray-700">
        <div>
          <h1 onClick={handleGoHome} className="text-3xl font-bold cursor-pointer hover:text-blue-600 dark:hover:text-blue-400">ManageMe</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-sm font-bold text-gray-600 dark:text-gray-300">{loggedUser.imie} ({loggedUser.rola})</span>
            
            <button onClick={() => { setShowNotificationsList(true); setShowAdminUsers(false); setActiveProjectId(null); setSelectedNotification(null); }} className="relative text-sm px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-md">
              🔔 Powiadomienia {unreadCount > 0 && <span className="absolute -top-2 -right-2 bg-red-500 text-white px-1.5 py-0.5 rounded-full text-xs font-bold">{unreadCount}</span>}
            </button>
            
            {loggedUser.rola === 'admin' && (
              <button onClick={() => { setShowAdminUsers(true); setShowNotificationsList(false); setActiveProjectId(null); setSelectedNotification(null); }} className="text-sm px-3 py-1 bg-purple-500 text-white rounded-md hover:bg-purple-600">
                👥 Użytkownicy
              </button>
            )}
            
            <button onClick={handleLogout} className="text-sm px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600">Wyloguj</button>
          </div>
        </div>
        <button onClick={() => setIsDarkMode(!isDarkMode)} className="px-3 py-2 rounded-lg bg-gray-200 dark:bg-gray-700">
          {isDarkMode ? '☀️' : '🌙'}
        </button>
      </header>

      {/* TOAST NOTIFICATION */}
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
          <button onClick={handleGoHome} className="mb-4 text-blue-600 dark:text-blue-400 hover:underline">⬅ Wróć do projektów</button>
          <h2 className="text-2xl font-bold mb-6">Zarządzanie Użytkownikami</h2>
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
                  <tr key={u.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="p-4 font-bold">{u.imie} {u.nazwisko} {u.isBlocked && <span className="text-red-500 text-xs ml-2">(Zablokowany)</span>}</td>
                    <td className="p-4 text-gray-500">{u.email}</td>
                    <td className="p-4">
                      <select 
                        value={u.rola} 
                        onChange={(e) => handleUpdateRole(u.id, e.target.value as Role)}
                        disabled={u.email === loggedUser.email}
                        className="p-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                      >
                        <option value="gosc">Gość</option>
                        <option value="developer">Developer</option>
                        <option value="devops">DevOps</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="p-4">
                      <button 
                        onClick={() => handleToggleBlock(u.id, u.isBlocked || false)}
                        disabled={u.email === loggedUser.email}
                        className={`text-sm px-3 py-1 rounded text-white ${u.isBlocked ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}
                      >
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
          <button onClick={() => setSelectedNotification(null)} className="mb-4 text-blue-600 dark:text-blue-400 hover:underline">⬅ Wróć do listy powiadomień</button>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold mb-4">{selectedNotification.title}</h2>
            <p className="text-lg mb-4">{selectedNotification.message}</p>
            <p className="text-sm text-gray-500">Data: {new Date(selectedNotification.date).toLocaleString()}</p>
          </div>
        </div>
      ) : showNotificationsList ? (
        <div className="animate-fade-in">
          <button onClick={handleGoHome} className="mb-4 text-blue-600 dark:text-blue-400 hover:underline">⬅ Wróć do projektów</button>
          <h2 className="text-2xl font-bold mb-6">Twoje Powiadomienia</h2>
          <ul className="space-y-3">
            {notifications.length === 0 && <p className="text-gray-500">Brak powiadomień.</p>}
            {notifications.map(n => (
              <li key={n.id} onClick={() => { storage.markNotificationAsRead(n.id); setNotifications(storage.getNotifications(loggedUser.id)); setSelectedNotification(n); }} 
                className={`p-4 rounded-lg border cursor-pointer transition-colors ${n.isRead ? 'opacity-60 bg-gray-50 border-gray-200 dark:bg-gray-800/50 dark:border-gray-700' : 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'}`}>
                <div className="flex justify-between items-start">
                  <strong className="block text-lg text-gray-900 dark:text-gray-100">
                    {n.title} {!n.isRead && <span className="text-red-500 text-sm ml-2 animate-pulse">● Nowe</span>}
                  </strong>
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-4">{new Date(n.date).toLocaleString()}</span>
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
              <button onClick={() => setSelectedTaskId(null)} className="mb-4 text-blue-600 dark:text-blue-400 hover:underline">⬅ Wróć do tablicy zadań</button>
              <h2 className="text-2xl font-bold mb-4">Szczegóły Zadania: {task.nazwa}</h2>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                <p className="mb-2"><strong>Opis:</strong> {task.opis}</p>
                <p className="mb-2"><strong>Przypisana historyjka:</strong> {parentStory?.nazwa}</p>
                <p className="mb-2"><strong>Stan:</strong> <span className="uppercase font-semibold text-blue-500">{task.stan}</span></p>
                <p className="mb-2 text-sm text-gray-500"><strong>Data dodania:</strong> {new Date(task.dataDodania).toLocaleString()}</p>
                {task.dataStartu && <p className="mb-2 text-sm text-gray-500"><strong>Data startu:</strong> {new Date(task.dataStartu).toLocaleString()}</p>}
                {task.dataZakonczenia && <p className="mb-2 text-sm text-gray-500"><strong>Data zakończenia:</strong> {new Date(task.dataZakonczenia).toLocaleString()}</p>}
                
                <hr className="my-4 border-gray-300 dark:border-gray-600" />
                
                <div>
                  <p className="mb-2"><strong>Osoba przypisana:</strong> {przypisanaOsoba ? `${przypisanaOsoba.imie} ${przypisanaOsoba.nazwisko} (${przypisanaOsoba.rola})` : 'Brak'}</p>
                  {!task.przypisanyUzytkownikId && task.stan === 'todo' && (
                    <select onChange={(e) => handleAssignUser(task.id, e.target.value)} defaultValue="" className="p-2 border rounded dark:border-gray-600 dark:bg-gray-700 text-gray-900 dark:text-white">
                      <option value="" disabled>-- Przypisz osobę (DevOps / Dev) --</option>
                      {assignableUsers.map(u => <option key={u.id} value={u.id}>{u.imie} {u.nazwisko} ({u.rola})</option>)}
                    </select>
                  )}
                </div>
                <div className="mt-6">
                  {task.stan === 'doing' && (
                    <button onClick={() => handleFinishTask(task.id)} className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">✔ Oznacz jako Done</button>
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
              <button onClick={() => setActiveStoryId(null)} className="mb-4 text-blue-600 dark:text-blue-400 hover:underline">⬅ Wróć do historyjek</button>
              <h2 className="text-2xl font-bold mb-2">Zadania dla: {activeStory?.nazwa}</h2>
              <p className="mb-6 text-gray-600 dark:text-gray-400">Stan historyjki: <span className="uppercase font-bold">{activeStory?.stan}</span></p>
              
              <form onSubmit={handleAddTask} className="flex flex-wrap gap-3 mb-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <input type="text" placeholder="Nowe zadanie" value={taskNazwa} onChange={(e) => setTaskNazwa(e.target.value)} required className="flex-1 p-2 border rounded dark:border-gray-600 dark:bg-gray-700 text-gray-900 dark:text-white" />
                <input type="text" placeholder="Opis" value={taskOpis} onChange={(e) => setTaskOpis(e.target.value)} required className="flex-[2] p-2 border rounded dark:border-gray-600 dark:bg-gray-700 text-gray-900 dark:text-white" />
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">Czas (h):</span>
                  <input type="number" min="1" value={taskCzas} onChange={(e) => setTaskCzas(Number(e.target.value))} required className="w-16 p-2 border rounded dark:border-gray-600 dark:bg-gray-700 text-gray-900 dark:text-white" />
                </div>
                <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Dodaj Zadanie</button>
              </form>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { title: 'TODO', items: tasks.filter(t => t.stan === 'todo') },
                  { title: 'DOING', items: tasks.filter(t => t.stan === 'doing') },
                  { title: 'DONE', items: tasks.filter(t => t.stan === 'done') }
                ].map(col => (
                  <div key={col.title} className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <h4 className="font-bold mb-4">{col.title} ({col.items.length})</h4>
                    {col.items.map(task => (
                      <div key={task.id} className="bg-white dark:bg-gray-700 p-4 mb-3 rounded-md shadow-sm border border-gray-200 dark:border-gray-600">
                        <strong className="block mb-2 text-lg">{task.nazwa}</strong>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Estymacja: {task.przewidywanyCzas}h</p>
                        <div className="flex justify-between items-center">
                          <button onClick={() => setSelectedTaskId(task.id)} className="text-sm px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">Szczegóły</button>
                          <button onClick={() => handleDeleteTask(task.id)} className="text-sm text-red-500 hover:underline">Usuń</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          );
        })()
      ) : activeProjectId ? (
        (() => {
          const activeProject = storage.getProject(activeProjectId);
          return (
            <div className="animate-fade-in">
              <button onClick={handleGoHome} className="mb-4 text-blue-600 dark:text-blue-400 hover:underline">⬅ Wróć do listy projektów</button>
              <h2 className="text-2xl font-bold mb-6">Projekt: {activeProject?.nazwa}</h2>
              
              <form onSubmit={handleAddStory} className="flex gap-3 mb-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <input type="text" placeholder="Nazwa historyjki" value={storyNazwa} onChange={(e) => setStoryNazwa(e.target.value)} required className="flex-1 p-2 border rounded dark:border-gray-600 dark:bg-gray-700 text-gray-900 dark:text-white" />
                <input type="text" placeholder="Opis" value={storyOpis} onChange={(e) => setStoryOpis(e.target.value)} required className="flex-[2] p-2 border rounded dark:border-gray-600 dark:bg-gray-700 text-gray-900 dark:text-white" />
                <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Dodaj Historyjkę</button>
              </form>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {['todo', 'doing', 'done'].map(stan => (
                  <div key={stan} className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <h4 className="font-bold mb-4 uppercase">{stan}</h4>
                    {stories.filter(s => s.stan === stan).map(story => (
                      <div key={story.id} className="bg-white dark:bg-gray-700 p-4 mb-3 rounded-md shadow-sm border border-gray-200 dark:border-gray-600">
                        <strong className="block mb-3 text-lg">{story.nazwa}</strong>
                        <button onClick={() => handleSelectStory(story.id)} className="text-sm px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">Zarządzaj Zadaniami ➡</button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          );
        })()
      ) : (
        <div className="max-w-3xl mx-auto animate-fade-in">
          <form onSubmit={handleAddProject} className="flex gap-3 mb-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <input type="text" placeholder="Nazwa projektu" value={projNazwa} onChange={(e) => setProjNazwa(e.target.value)} required className="flex-1 p-2 border rounded dark:border-gray-600 dark:bg-gray-700 text-gray-900 dark:text-white" />
            <input type="text" placeholder="Krótki opis" value={projOpis} onChange={(e) => setProjOpis(e.target.value)} required className="flex-[2] p-2 border rounded dark:border-gray-600 dark:bg-gray-700 text-gray-900 dark:text-white" />
            <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Utwórz Projekt</button>
          </form>
          
          <ul className="space-y-4">
            {projects.map((project) => (
              <li key={project.id} className="p-5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg shadow-sm flex justify-between items-center transition-colors hover:border-blue-300 dark:hover:border-blue-700">
                <div>
                  <strong className="text-xl block mb-1 text-gray-900 dark:text-white">{project.nazwa}</strong>
                  <p className="text-gray-600 dark:text-gray-400">{project.opis}</p>
                </div>
                <button onClick={() => handleSelectProject(project.id)} className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 shadow-sm">
                  Otwórz Projekt
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;
