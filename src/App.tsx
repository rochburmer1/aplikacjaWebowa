import { useState, useEffect, type SyntheticEvent } from 'react';
import { LocalStorageService } from './services/StorageService';
import type { Project } from './models/Project';

const storage = new LocalStorageService();

function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  
  // Stany formularza
  const [nazwa, setNazwa] = useState('');
  const [opis, setOpis] = useState('');
  
  // Stan przechowujący ID edytowanego aktualnie elementu
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    setProjects(storage.getProjects());
  }, []);

  // Obsługa wysłania formularza (dodawanie lub zapis edycji)
  const handleSubmit = (e: SyntheticEvent) => {
    e.preventDefault();
    if (!nazwa.trim() || !opis.trim()) return;

    if (editingId) {
      storage.updateProject(editingId, { nazwa, opis });
      setEditingId(null);
    } else {
      storage.createProject({ nazwa, opis });
    }
    
    // Odświeżenie listy i wyczyszczenie formularza
    setProjects(storage.getProjects());
    setNazwa('');
    setOpis('');
  };

  // Usuwanie
  const handleDelete = (id: string) => {
    storage.deleteProject(id);
    setProjects(storage.getProjects());
  };

  // Wypełnienie formularza danymi edytowanego elementu
  const handleEdit = (project: Project) => {
    setEditingId(project.id);
    setNazwa(project.nazwa);
    setOpis(project.opis);
  };

  // Przerwanie edycji
  const cancelEdit = () => {
    setEditingId(null);
    setNazwa('');
    setOpis('');
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>ManageMe</h1>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '30px' }}>
        <input 
          type="text" 
          placeholder="Nazwa projektu" 
          value={nazwa}
          onChange={(e) => setNazwa(e.target.value)}
          required 
        />
        <textarea 
          placeholder="Opis projektu" 
          value={opis}
          onChange={(e) => setOpis(e.target.value)}
          required 
        />
        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="submit" style={{ cursor: 'pointer' }}>
            {editingId ? 'Zapisz zmiany' : 'Dodaj projekt'}
          </button>
          {editingId && (
            <button type="button" onClick={cancelEdit} style={{ cursor: 'pointer' }}>
              Anuluj edycję
            </button>
          )}
        </div>
      </form>

      <h2>Lista projektów</h2>
      {projects.length === 0 ? (
        <p>Brak projektów. Dodaj pierwszy!</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {projects.map((project) => (
            <li key={project.id} style={{ border: '1px solid #ccc', padding: '15px', marginBottom: '10px', borderRadius: '4px' }}>
              <h3 style={{ margin: '0 0 10px 0' }}>{project.nazwa}</h3>
              <p style={{ margin: '0 0 15px 0' }}>{project.opis}</p>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => handleEdit(project)} style={{ cursor: 'pointer' }}>
                  Edytuj
                </button>
                <button onClick={() => handleDelete(project.id)} style={{ cursor: 'pointer', color: 'red' }}>
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