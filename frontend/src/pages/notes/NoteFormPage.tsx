import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { prependNoteToCachedCollections } from '../../utils/appData';

export function NoteFormPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [titre_mission, setTitre] = useState('');
  const [date_creation, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [commentaire_employe, setCommentaire] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (user?.role !== 'Employe') {
      toast.error('Seul un employe peut creer une note de frais.');
      return;
    }

    setSubmitting(true);

    try {
      const { data } = await api.post('/notes-de-frais', { titre_mission, date_creation, commentaire_employe, statut: 'brouillon' });
      prependNoteToCachedCollections(data, user);
      toast.success('Note creee');
      navigate(`/notes/${data.id}`);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = (error.response?.data as { message?: string } | undefined)?.message ?? 'Impossible de creer la note.';

        if (error.response?.status === 401 || message.toLowerCase().includes('unauthenticated')) {
          await logout();
          toast.error('Session invalide. Reconnectez-vous puis recreez la note.');
          navigate('/login');
          return;
        }

        toast.error(message);
      } else {
        toast.error('Impossible de creer la note.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card auth-card" style={{ maxWidth: 600 }}>
      <h2>Nouvelle note de frais</h2>
      <form onSubmit={onCreate}>
        <input value={titre_mission} onChange={(e) => setTitre(e.target.value)} placeholder="Titre de mission" required />
        <input type="date" value={date_creation} onChange={(e) => setDate(e.target.value)} required />
        <textarea value={commentaire_employe} onChange={(e) => setCommentaire(e.target.value)} placeholder="Commentaire" />
        <small>La note est creee en brouillon. La soumission au responsable se fait apres ajout des depenses.</small>
        <button type="submit" disabled={submitting}>{submitting ? 'Creation...' : 'Creer'}</button>
      </form>
    </div>
  );
}
