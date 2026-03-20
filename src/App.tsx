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


  if (selectedTaskId) {
    const task = storage.getTasks().find(t => t.id === selectedTaskId);
    const parentStory = stories.find(s => s.id === task?.historyjkaId);
    if (!task) return null;

    const przypisanaOsoba = assignableUsers.find(u => u.id === task.przypisanyUzytkownikId);

    return (
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' }}>
        <button onClick={() => setSelectedTaskId(null)}>⬅ Wróć do tablicy zadań</button>
        <h2>Szczegóły Zadania: {task.nazwa}</h2>
        <div style={{ background: '#f9f9f9', padding: '15px', borderRadius: '8px' }}>
          <p><strong>Opis:</strong> {task.opis}</p>
          <p><strong>Przypisana historyjka:</strong> {parentStory?.nazwa}</p>
          <p><strong>Stan:</strong> {task.stan.toUpperCase()}</p>
          <p><strong>Data dodania:</strong> {new Date(task.dataDodania).toLocaleString()}</p>
          {task.dataStartu && <p><strong>Data startu:</strong> {new Date(task.dataStartu).toLocaleString()}</p>}
          {task.dataZakonczenia && <p><strong>Data zakończenia:</strong> {new Date(task.dataZakonczenia).toLocaleString()}</p>}
          <p><strong>Czas:</strong> Przewidywany: {task.przewidywanyCzas}h | Przepracowano: {task.przepracowaneGodziny || 0}h</p>
          
          <hr />
          
          <div style={{ marginTop: '15px' }}>
            <p><strong>Osoba przypisana:</strong> {przypisanaOsoba ? `${przypisanaOsoba.imie} ${przypisanaOsoba.nazwisko} (${przypisanaOsoba.rola})` : 'Brak'}</p>
            
            {/* Przypisywanie osoby - dozwolone tylko jeśli stan to 'todo' i nikt nie jest przypisany */}
            {!task.przypisanyUzytkownikId && task.stan === 'todo' && (
              <select onChange={(e) => handleAssignUser(task.id, e.target.value)} defaultValue="">
                <option value="" disabled>-- Przypisz osobę (DevOps / Dev) --</option>
                {assignableUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.imie} {u.nazwisko} ({u.rola})</option>
                ))}
              </select>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            {task.stan === 'doing' && (
              <>
                <button onClick={() => handleAddHours(task.id, task.przepracowaneGodziny || 0)}>+ Raportuj godziny</button>
                <button onClick={() => handleFinishTask(task.id)} style={{ background: '#28a745', color: 'white', border: 'none', padding: '5px 10px' }}>✔ Oznacz jako Done</button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (activeStoryId) {
    const activeStory = stories.find(s => s.id === activeStoryId);
    const todoTasks = tasks.filter(t => t.stan === 'todo');
    const doingTasks = tasks.filter(t => t.stan === 'doing');
    const doneTasks = tasks.filter(t => t.stan === 'done');

    return (
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' }}>
        <button onClick={() => setActiveStoryId(null)}>⬅ Wróć do historyjek projektu</button>
        <h2>Zadania dla historyjki: {activeStory?.nazwa}</h2>
        <p>Stan historyjki: <strong>{activeStory?.stan.toUpperCase()}</strong></p>

        <form onSubmit={handleAddTask} style={{ display: 'flex', gap: '10px', marginBottom: '20px', background: '#eee', padding: '15px', borderRadius: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="text" placeholder="Nowe zadanie" value={taskNazwa} onChange={(e) => setTaskNazwa(e.target.value)} required style={{ flex: '1 1 200px' }} />
          <input type="text" placeholder="Opis" value={taskOpis} onChange={(e) => setTaskOpis(e.target.value)} required style={{ flex: '2 1 300px' }} />
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <label htmlFor="czas-input" style={{ fontSize: '14px', fontWeight: 'bold', color: '#555' }}>
              Estymacja (h):
            </label>
            <input 
              id="czas-input" 
              type="number" 
              value={taskCzas} 
              onChange={(e) => setTaskCzas(Number(e.target.value))} 
              min="1" 
              required 
              style={{ width: '60px', padding: '5px' }} 
            />
          </div>
          
          <button type="submit" style={{ cursor: 'pointer', padding: '8px 16px' }}>Dodaj Zadanie</button>
        </form>

        <div style={{ display: 'flex', gap: '20px' }}>
          {[
            { title: 'TODO', items: todoTasks },
            { title: 'DOING', items: doingTasks },
            { title: 'DONE', items: doneTasks }
          ].map(col => (
            <div key={col.title} style={{ flex: 1, background: '#f5f5f5', padding: '10px', borderRadius: '8px' }}>
              <h4>{col.title} ({col.items.length})</h4>
              {col.items.map(task => (
                <div key={task.id} style={{ background: 'white', padding: '10px', marginBottom: '10px', border: '1px solid #ccc', borderRadius: '4px' }}>
                  <strong>{task.nazwa}</strong>
                  <p style={{ fontSize: '12px', margin: '5px 0' }}>Estymacja: {task.przewidywanyCzas}h</p>
                  <button onClick={() => setSelectedTaskId(task.id)} style={{ fontSize: '12px', cursor: 'pointer' }}>Szczegóły ➡</button>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activeProjectId) {
    const activeProject = storage.getProject(activeProjectId);
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' }}>
        <button onClick={() => { storage.setActiveProjectId(null); setActiveProjectId(null); }}>⬅ Wróć do projektów</button>
        <h2>Projekt: {activeProject?.nazwa}</h2>
        
        <form onSubmit={handleAddStory} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <input type="text" placeholder="Nazwa historyjki" value={storyNazwa} onChange={(e) => setStoryNazwa(e.target.value)} required />
          <input type="text" placeholder="Opis" value={storyOpis} onChange={(e) => setStoryOpis(e.target.value)} required />
          <button type="submit">Dodaj Historyjkę</button>
        </form>

        <div style={{ display: 'flex', gap: '20px' }}>
          {[
            { title: 'TODO', items: stories.filter(s => s.stan === 'todo') },
            { title: 'DOING', items: stories.filter(s => s.stan === 'doing') },
            { title: 'DONE', items: stories.filter(s => s.stan === 'done') }
          ].map(col => (
            <div key={col.title} style={{ flex: 1, background: '#eee', padding: '10px', borderRadius: '8px' }}>
              <h4>{col.title}</h4>
              {col.items.map(story => (
                <div key={story.id} style={{ background: 'white', padding: '10px', marginBottom: '10px', borderRadius: '4px' }}>
                  <strong>{story.nazwa}</strong>
                  <div style={{ marginTop: '10px' }}>
                    <button onClick={() => handleSelectStory(story.id)}>Zarządzaj Zadaniami</button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>ManageMe <span style={{ fontSize: '14px', color: 'gray' }}>Zalogowany: {loggedUser.imie} ({loggedUser.rola})</span></h1>
      <form onSubmit={handleAddProject} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input type="text" placeholder="Nazwa" value={projNazwa} onChange={(e) => setProjNazwa(e.target.value)} required />
        <input type="text" placeholder="Opis" value={projOpis} onChange={(e) => setProjOpis(e.target.value)} required />
        <button type="submit">Utwórz projekt</button>
      </form>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {projects.map((project) => (
          <li key={project.id} style={{ border: '1px solid #ccc', padding: '15px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
            <div><strong>{project.nazwa}</strong><p>{project.opis}</p></div>
            <div>
              <button onClick={() => handleSelectProject(project.id)}>Otwórz</button>
              <button onClick={() => handleDeleteProject(project.id)} style={{ color: 'red', marginLeft: '5px' }}>Usuń</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;