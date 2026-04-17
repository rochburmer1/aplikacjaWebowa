import { useState, useEffect, type SyntheticEvent } from 'react';
import { LocalStorageService } from './services/StorageService';
import { UserService } from './services/UserService';
import type { Project } from './models/Project';
import type { Story, Priority, Status } from './models/Story';
import type { Task } from './models/Task';

const storage = new LocalStorageService();
const userService = new UserService();
const loggedUser = userService.getLoggedUser();

const assignableUsers = userService.getAllUsers().filter(u => u.rola === 'developer' || u.rola === 'devops');

function App() {
  // --- OBSŁUGA MOTYWU (DARK/LIGHT MODE) ---
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      return true;
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
    }
  }, [isDarkMode]);

  // --- STANY NAWIGACJI I DANYCH ---
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  
  const [stories, setStories] = useState<Story[]>([]);
  const [activeStoryId, setActiveStoryId] = useState<string | null>(null);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const [projNazwa, setProjNazwa] = useState('');
  const [projOpis, setProjOpis] = useState('');
  const [storyNazwa, setStoryNazwa] = useState('');
  const [storyOpis, setStoryOpis] = useState('');
  const [taskNazwa, setTaskNazwa] = useState('');
  const [taskOpis, setTaskOpis] = useState('');
  const [taskCzas, setTaskCzas] = useState(1);

  useEffect(() => {
    setProjects(storage.getProjects());
    const savedActiveId = storage.getActiveProjectId();
    if (savedActiveId) {
      setActiveProjectId(savedActiveId);
      setStories(storage.getStories(savedActiveId));
    }
  }, []);

  const handleAddProject = (e: SyntheticEvent) => {
    e.preventDefault();
    if (!projNazwa.trim() || !projOpis.trim()) return;
    storage.createProject({ nazwa: projNazwa, opis: projOpis });
    setProjects(storage.getProjects());
    setProjNazwa(''); setProjOpis('');
  };

  const handleSelectProject = (id: string) => {
    storage.setActiveProjectId(id);
    setActiveProjectId(id);
    setStories(storage.getStories(id));
    setActiveStoryId(null);
    setSelectedTaskId(null);
  };

  const handleDeleteProject = (id: string) => {
    storage.deleteProject(id);
    setProjects(storage.getProjects());
  };

  const handleAddStory = (e: SyntheticEvent) => {
    e.preventDefault();
    if (!activeProjectId || !storyNazwa.trim()) return;
    storage.createStory({ nazwa: storyNazwa, opis: storyOpis, priorytet: 'niski', stan: 'todo', projektId: activeProjectId, wlascicielId: loggedUser.id });
    setStories(storage.getStories(activeProjectId));
    setStoryNazwa(''); setStoryOpis('');
  };

  const handleSelectStory = (id: string) => {
    setActiveStoryId(id);
    setTasks(storage.getTasks(id));
  };

  const handleAddTask = (e: SyntheticEvent) => {
    e.preventDefault();
    if (!activeStoryId || !taskNazwa.trim()) return;
    storage.createTask({ nazwa: taskNazwa, opis: taskOpis, priorytet: 'niski', historyjkaId: activeStoryId, przewidywanyCzas: taskCzas, przepracowaneGodziny: 0 });
    setTasks(storage.getTasks(activeStoryId));
    setStories(storage.getStories(activeProjectId!)); 
    setTaskNazwa(''); setTaskOpis(''); setTaskCzas(1);
  };

  const handleAssignUser = (taskId: string, userId: string) => {
    storage.updateTask(taskId, { przypisanyUzytkownikId: userId });
    setTasks(storage.getTasks(activeStoryId!));
    setStories(storage.getStories(activeProjectId!));
  };

  const handleAddHours = (taskId: string, currentHours: number) => {
    const additional = parseFloat(window.prompt('Ile godzin chcesz dodać?', '1') || '0');
    if (!isNaN(additional) && additional > 0) {
      storage.updateTask(taskId, { przepracowaneGodziny: (currentHours || 0) + additional });
      setTasks(storage.getTasks(activeStoryId!));
    }
  };

  const handleFinishTask = (taskId: string) => {
    storage.updateTask(taskId, { stan: 'done' });
    setTasks(storage.getTasks(activeStoryId!));
    setStories(storage.getStories(activeProjectId!));
    setSelectedTaskId(null); 
  };

  // ==========================================
  // WIDOK 4: SZCZEGÓŁY ZADANIA
  // ==========================================
  if (selectedTaskId) {
    const task = storage.getTasks().find(t => t.id === selectedTaskId);
    const parentStory = stories.find(s => s.id === task?.historyjkaId);
    if (!task) return null;

    const przypisanaOsoba = assignableUsers.find(u => u.id === task.przypisanyUzytkownikId);

    return (
      <div className="max-w-2xl mx-auto p-5 font-sans">
        <button onClick={() => setSelectedTaskId(null)} className="mb-4 text-blue-600 dark:text-blue-400 hover:underline">⬅ Wróć do tablicy zadań</button>
        <h2 className="text-2xl font-bold mb-4">Szczegóły Zadania: {task.nazwa}</h2>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
          <p className="mb-2"><strong>Opis:</strong> {task.opis}</p>
          <p className="mb-2"><strong>Przypisana historyjka:</strong> {parentStory?.nazwa}</p>
          <p className="mb-2"><strong>Stan:</strong> <span className="uppercase font-semibold text-blue-500">{task.stan}</span></p>
          <p className="mb-2 text-sm text-gray-600 dark:text-gray-400"><strong>Data dodania:</strong> {new Date(task.dataDodania).toLocaleString()}</p>
          {task.dataStartu && <p className="mb-2 text-sm text-gray-600 dark:text-gray-400"><strong>Data startu:</strong> {new Date(task.dataStartu).toLocaleString()}</p>}
          {task.dataZakonczenia && <p className="mb-2 text-sm text-gray-600 dark:text-gray-400"><strong>Data zakończenia:</strong> {new Date(task.dataZakonczenia).toLocaleString()}</p>}
          <p className="mb-4"><strong>Czas:</strong> Przewidywany: {task.przewidywanyCzas}h | Przepracowano: <span className="font-bold">{task.przepracowaneGodziny || 0}h</span></p>
          
          <hr className="my-4 border-gray-300 dark:border-gray-600" />
          
          <div>
            <p className="mb-2"><strong>Osoba przypisana:</strong> {przypisanaOsoba ? `${przypisanaOsoba.imie} ${przypisanaOsoba.nazwisko} (${przypisanaOsoba.rola})` : 'Brak'}</p>
            
            {!task.przypisanyUzytkownikId && task.stan === 'todo' && (
              <select 
                onChange={(e) => handleAssignUser(task.id, e.target.value)} 
                defaultValue=""
                className="p-2 border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="" disabled>-- Przypisz osobę (DevOps / Dev) --</option>
                {assignableUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.imie} {u.nazwisko} ({u.rola})</option>
                ))}
              </select>
            )}
          </div>

          <div className="flex gap-3 mt-6">
            {task.stan === 'doing' && (
              <>
                <button onClick={() => handleAddHours(task.id, task.przepracowaneGodziny || 0)} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
                  + Raportuj godziny
                </button>
                <button onClick={() => handleFinishTask(task.id)} className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors">
                  ✔ Oznacz jako Done
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // WIDOK 3: TABLICA KANBAN ZADAŃ
  // ==========================================
  if (activeStoryId) {
    const activeStory = stories.find(s => s.id === activeStoryId);
    const todoTasks = tasks.filter(t => t.stan === 'todo');
    const doingTasks = tasks.filter(t => t.stan === 'doing');
    const doneTasks = tasks.filter(t => t.stan === 'done');

    return (
      <div className="max-w-5xl mx-auto p-5 font-sans">
        <button onClick={() => setActiveStoryId(null)} className="mb-4 text-blue-600 dark:text-blue-400 hover:underline">⬅ Wróć do historyjek projektu</button>
        <h2 className="text-2xl font-bold mb-2">Zadania dla historyjki: {activeStory?.nazwa}</h2>
        <p className="mb-6">Stan historyjki: <strong className="uppercase">{activeStory?.stan}</strong></p>

        <form onSubmit={handleAddTask} className="flex flex-wrap items-center gap-3 mb-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <input type="text" placeholder="Nowe zadanie" value={taskNazwa} onChange={(e) => setTaskNazwa(e.target.value)} required className="flex-1 p-2 border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
          <input type="text" placeholder="Opis" value={taskOpis} onChange={(e) => setTaskOpis(e.target.value)} required className="flex-[2] p-2 border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
          
          <div className="flex items-center gap-2">
            <label htmlFor="czas-input" className="text-sm font-bold text-gray-700 dark:text-gray-300">Estymacja (h):</label>
            <input id="czas-input" type="number" value={taskCzas} onChange={(e) => setTaskCzas(Number(e.target.value))} min="1" required className="w-16 p-2 border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
          </div>
          
          <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">Dodaj Zadanie</button>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { title: 'TODO', items: todoTasks },
            { title: 'DOING', items: doingTasks },
            { title: 'DONE', items: doneTasks }
          ].map(col => (
            <div key={col.title} className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <h4 className="font-bold mb-4 text-gray-700 dark:text-gray-300">{col.title} ({col.items.length})</h4>
              {col.items.map(task => (
                <div key={task.id} className="bg-white dark:bg-gray-700 p-4 mb-3 border border-gray-200 dark:border-gray-600 rounded-md shadow-sm">
                  <strong className="block mb-1">{task.nazwa}</strong>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Estymacja: {task.przewidywanyCzas}h</p>
                  <button onClick={() => setSelectedTaskId(task.id)} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Szczegóły ➡</button>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ==========================================
  // WIDOK 2: TABLICA KANBAN HISTORYJEK
  // ==========================================
  if (activeProjectId) {
    const activeProject = storage.getProject(activeProjectId);
    return (
      <div className="max-w-5xl mx-auto p-5 font-sans">
        <button onClick={() => { storage.setActiveProjectId(null); setActiveProjectId(null); }} className="mb-4 text-blue-600 dark:text-blue-400 hover:underline">⬅ Wróć do projektów</button>
        <h2 className="text-2xl font-bold mb-6">Projekt: {activeProject?.nazwa}</h2>
        
        <form onSubmit={handleAddStory} className="flex gap-3 mb-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <input type="text" placeholder="Nazwa historyjki" value={storyNazwa} onChange={(e) => setStoryNazwa(e.target.value)} required className="flex-1 p-2 border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
          <input type="text" placeholder="Opis" value={storyOpis} onChange={(e) => setStoryOpis(e.target.value)} required className="flex-[2] p-2 border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
          <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">Dodaj Historyjkę</button>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { title: 'TODO', items: stories.filter(s => s.stan === 'todo') },
            { title: 'DOING', items: stories.filter(s => s.stan === 'doing') },
            { title: 'DONE', items: stories.filter(s => s.stan === 'done') }
          ].map(col => (
            <div key={col.title} className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <h4 className="font-bold mb-4 text-gray-700 dark:text-gray-300">{col.title}</h4>
              {col.items.map(story => (
                <div key={story.id} className="bg-white dark:bg-gray-700 p-4 mb-3 rounded-md shadow-sm border border-gray-200 dark:border-gray-600">
                  <strong className="block mb-3">{story.nazwa}</strong>
                  <button onClick={() => handleSelectStory(story.id)} className="text-sm px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors">
                    Zarządzaj Zadaniami
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ==========================================
  // WIDOK 1: LISTA PROJEKTÓW
  // ==========================================
  return (
    <div className="max-w-3xl mx-auto p-5 font-sans">
      <header className="flex justify-between items-center mb-8 border-b pb-4 dark:border-gray-700">
        <div>
          <h1 className="text-3xl font-bold">ManageMe</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Zalogowany: {loggedUser.imie} ({loggedUser.rola})</p>
        </div>
        
        {/* Przełącznik Dark Mode */}
        <button 
          onClick={() => setIsDarkMode(!isDarkMode)} 
          className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium text-gray-800 dark:text-gray-200"
        >
          {isDarkMode ? '☀️ Jasny Motyw' : '🌙 Ciemny Motyw'}
        </button>
      </header>

      <form onSubmit={handleAddProject} className="flex gap-3 mb-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <input type="text" placeholder="Nazwa" value={projNazwa} onChange={(e) => setProjNazwa(e.target.value)} required className="flex-1 p-2 border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
        <input type="text" placeholder="Opis" value={projOpis} onChange={(e) => setProjOpis(e.target.value)} required className="flex-[2] p-2 border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
        <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">Utwórz projekt</button>
      </form>
      
      <ul className="space-y-4">
        {projects.map((project) => (
          <li key={project.id} className="p-5 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg shadow-sm flex justify-between items-center">
            <div>
              <strong className="text-lg block mb-1">{project.nazwa}</strong>
              <p className="text-gray-600 dark:text-gray-400">{project.opis}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleSelectProject(project.id)} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">Otwórz</button>
              <button onClick={() => handleDeleteProject(project.id)} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors">Usuń</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;