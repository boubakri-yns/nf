import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { User } from '../types';
import { readCache, writeCache } from '../utils/queryCache';

export function ProfilePage() {
  const cacheKey = 'profile:me';
  const { user } = useAuth();
  const [profile, setProfile] = useState<User | null>(user);
  const [form, setForm] = useState({ nom: '', matricule: '', departement: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!user) return;

      setLoading(true);
      const cached = readCache<User>(cacheKey);
      if (cached) {
        setProfile(cached);
        setForm({
          nom: cached.nom,
          matricule: cached.matricule,
          departement: cached.departement ?? '',
        });
        setLoading(false);
      }

      try {
        const { data } = await api.get<User>('/profile');
        setProfile(data);
        writeCache(cacheKey, data, 60_000);
        setForm({
          nom: data.nom,
          matricule: data.matricule,
          departement: data.departement ?? '',
        });
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [user]);

  if (user?.role !== 'Employe' && user?.role !== 'Manager' && user?.role !== 'RH' && user?.role !== 'Admin') {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return <div className="card">Chargement du profil...</div>;
  }

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put<User>('/profile', form);
      setProfile(data);
      localStorage.setItem('auth_user', JSON.stringify(data));
      writeCache(cacheKey, data, 60_000);
      setForm({
        nom: data.nom,
        matricule: data.matricule,
        departement: data.departement ?? '',
      });
      toast.success('Profil mis a jour');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="admin-page">
      <div className="card admin-hero">
        <div>
          <p className="admin-eyebrow">Profil</p>
          <h2>Informations du compte</h2>
          <p>
            {user?.role === 'Admin'
              ? 'Cette page vous permet de gerer les informations de votre compte administrateur.'
              : user?.role === 'RH'
              ? 'Cette page vous permet de mettre a jour les informations de votre compte RH.'
              : 'Cette fiche reprend les informations du compte apres validation et vous permet de mettre a jour vos donnees.'}
          </p>
        </div>
      </div>

      <div className="card admin-panel">
        <h3>Informations personnelles</h3>
        <div className="details-grid">
          <div className="card compact"><strong>Nom</strong><p>{profile?.nom}</p></div>
          <div className="card compact"><strong>Email</strong><p>{profile?.email}</p></div>
          <div className="card compact"><strong>Matricule</strong><p>{profile?.matricule}</p></div>
          <div className="card compact"><strong>Departement</strong><p>{profile?.departement ?? '-'}</p></div>
          {user?.role === 'Employe' && <div className="card compact"><strong>Manager</strong><p>{profile?.responsable?.nom ?? profile?.email_responsable ?? '-'}</p></div>}
          {user?.role === 'Manager' && <div className="card compact"><strong>RH referent</strong><p>{profile?.responsable?.nom ?? profile?.email_responsable ?? '-'}</p></div>}
          <div className="card compact"><strong>Role</strong><p>{profile?.role}</p></div>
        </div>
      </div>

      <div className="card admin-panel">
        <h3>Modifier mes informations</h3>
        <form onSubmit={saveProfile}>
          <input value={form.nom} onChange={(event) => setForm((current) => ({ ...current, nom: event.target.value }))} placeholder="Nom" />
          <input value={form.matricule} onChange={(event) => setForm((current) => ({ ...current, matricule: event.target.value }))} placeholder="Matricule" />
          <input value={form.departement} onChange={(event) => setForm((current) => ({ ...current, departement: event.target.value }))} placeholder="Departement" />
          <button type="submit" disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
        </form>
      </div>
    </section>
  );
}
