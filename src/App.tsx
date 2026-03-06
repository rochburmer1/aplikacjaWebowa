import { useState, useEffect, type SyntheticEvent } from 'react';
import { LocalStorageService } from './services/StorageService';
import { UserService } from './services/UserService'; 
import type { Project } from './models/Project';
import type { Story, Priority, Status } from './models/Story';

const storage = new LocalStorageService();
const userService = new UserService();

const loggedUser = userService.getLoggedUser();

function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [stories, setStories] = useState<Story[]>([]);

  const [projNazwa, setProjNazwa] = useState('');
  const [projOpis, setProjOpis] = useState('');

  const [storyNazwa, setStoryNazwa] = useState('');
  const [storyOpis, setStoryOpis] = useState('');
  const [storyPriorytet, setStoryPriorytet] = useState<Priority>('niski');
  const [storyStan, setStoryStan] = useState<Status>('todo');

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
    setProjNazwa('');
    setProjOpis('');
  };

  const handleSelectProject = (id: string) => {
    storage.setActiveProjectId(id);
    setActiveProjectId(id);
    setStories(storage.getStories(id));
  };

  const handleClearActiveProject = () => {
    storage.setActiveProjectId(null);
    setActiveProjectId(null);
  };

  const handleDeleteProject = (id: string) => {
    storage.deleteProject(id);
    setProjects(storage.getProjects());
  };

  const handleAddStory = (e: SyntheticEvent) => {
    e.preventDefault();
    if (!activeProjectId || !storyNazwa.trim()) return;

    storage.createStory({
      nazwa: storyNazwa,
      opis: storyOpis,
      priorytet: storyPriorytet,
      stan: storyStan,
      projektId: activeProjectId,
      wlascicielId: loggedUser.id 
    });

    setStories(storage.getStories(activeProjectId));
    setStoryNazwa('');
    setStoryOpis('');
    setStoryPriorytet('niski');
    setStoryStan('todo');
  };

  const handleDeleteStory = (id: string) => {
    storage.deleteStory(id);
    if (activeProjectId) setStories(storage.getStories(activeProjectId));
  };


  const handleStatusChange = (id: string, newStan: Status) => {
    storage.updateStory(id, { stan: newStan });
    if (activeProjectId) setStories(storage.getStories(activeProjectId));
  };

  
  if (activeProjectId) {
    const activeProject = storage.getProject(activeProjectId);
    
    const todoStories = stories.filter(s => s.stan === 'todo');
    const doingStories = stories.filter(s => s.stan === 'doing');
    const doneStories = stories.filter(s => s.stan === 'done');

    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h1 style={{ margin: 0 }}>Projekt: {activeProject?.nazwa}</h1>
            <p style={{ margin: 0, color: 'gray' }}>Zalogowany: {loggedUser.imie} {loggedUser.nazwisko}</p>
          </div>
          <button onClick={handleClearActiveProject} style={{ cursor: 'pointer', padding: '8px 16px' }}>
            &larr; Wróć do listy projektów
          </button>
        </header>

        {/* Formularz dodawania historyjki */}
        <div style={{ background: '#f5f5f5', padding: '15px', borderRadius: '8px', marginBottom: '30px' }}>
          <h3>Dodaj nowe zadanie</h3>
          <form onSubmit={handleAddStory} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input type="text" placeholder="Nazwa zadania" value={storyNazwa} onChange={(e) => setStoryNazwa(e.target.value)} required />
            <textarea placeholder="Opis" value={storyOpis} onChange={(e) => setStoryOpis(e.target.value)} required />
            <div style={{ display: 'flex', gap: '10px' }}>
              <select value={storyPriorytet} onChange={(e) => setStoryPriorytet(e.target.value as Priority)}>
                <option value="niski">Priorytet: Niski</option>
                <option value="średni">Priorytet: Średni</option>
                <option value="wysoki">Priorytet: Wysoki</option>
              </select>
              <select value={storyStan} onChange={(e) => setStoryStan(e.target.value as Status)}>
                <option value="todo">Stan: Do zrobienia (Todo)</option>
                <option value="doing">Stan: W trakcie (Doing)</option>
                <option value="done">Stan: Zakończone (Done)</option>
              </select>
              <button type="submit" style={{ cursor: 'pointer' }}>Dodaj historyjkę</button>
            </div>
          </form>
        </div>

        {/* Tablica zadań (podział na 3 kolumny dla czytelności) */}
        <div style={{ display: 'flex', gap: '20px' }}>
          {[
            { title: 'Do zrobienia (TODO)', items: todoStories, nextState: 'doing' as Status },
            { title: 'W trakcie (DOING)', items: doingStories, nextState: 'done' as Status },
            { title: 'Zakończone (DONE)', items: doneStories, nextState: 'todo' as Status }
          ].map(column => (
            <div key={column.title} style={{ flex: 1, background: '#eee', padding: '10px', borderRadius: '8px' }}>
              <h4>{column.title} ({column.items.length})</h4>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {column.items.map(story => (
                  <li key={story.id} style={{ background: 'white', padding: '10px', marginBottom: '10px', borderRadius: '4px', borderLeft: `4px solid ${story.priorytet === 'wysoki' ? 'red' : story.priorytet === 'średni' ? 'orange' : 'green'}` }}>
                    <strong>{story.nazwa}</strong>
                    <p style={{ fontSize: '12px', margin: '5px 0' }}>{story.opis}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                      <button onClick={() => handleStatusChange(story.id, column.nextState)} style={{ fontSize: '12px', cursor: 'pointer' }}>
                        Zmień stan
                      </button>
                      <button onClick={() => handleDeleteStory(story.id)} style={{ fontSize: '12px', cursor: 'pointer', color: 'red' }}>Usuń</button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <header style={{ marginBottom: '20px' }}>
        <h1>ManageMe - Moje Projekty</h1>
        <p style={{ color: 'gray' }}>Zalogowany: {loggedUser.imie} {loggedUser.nazwisko}</p>
      </header>
      
      <form onSubmit={handleAddProject} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '30px' }}>
        <input type="text" placeholder="Nazwa projektu" value={projNazwa} onChange={(e) => setProjNazwa(e.target.value)} required />
        <textarea placeholder="Opis projektu" value={projOpis} onChange={(e) => setProjOpis(e.target.value)} required />
        <button type="submit" style={{ cursor: 'pointer' }}>Utwórz projekt</button>
      </form>

      <h2>Wybierz projekt do pracy:</h2>
      {projects.length === 0 ? (
        <p>Brak projektów. Dodaj pierwszy!</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {projects.map((project) => (
            <li key={project.id} style={{ border: '1px solid #ccc', padding: '15px', marginBottom: '10px', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: '0 0 5px 0' }}>{project.nazwa}</h3>
                <p style={{ margin: 0, fontSize: '14px', color: '#555' }}>{project.opis}</p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => handleSelectProject(project.id)} style={{ cursor: 'pointer', padding: '8px 12px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}>
                  Otwórz projekt
                </button>
                <button onClick={() => handleDeleteProject(project.id)} style={{ cursor: 'pointer', padding: '8px 12px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px' }}>
                  Usuń
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default App;