import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

type BackendErrorPayload = {
  message?: string;
  errors?: Record<string, string[]>;
};

function extractRegisterError(err: unknown) {
  if (!axios.isAxiosError(err)) {
    return {
      summary: "L'inscription a echoue.",
      details: [] as string[],
    };
  }

  const response = err.response?.data as BackendErrorPayload | string | undefined;

  if (typeof response === 'string' && response.trim()) {
    return {
      summary: response,
      details: [] as string[],
    };
  }

  const payload = typeof response === 'string' ? undefined : response;

  const details = payload?.errors
    ? Object.entries(payload.errors).flatMap(([, messages]) => messages.map((message) => String(message)))
    : [];

  const summary = details[0]
    ?? payload?.message
    ?? err.message
    ?? "L'inscription a echoue.";

  return { summary, details };
}

export function RegisterPage() {
  const { register } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    nom: '',
    email: '',
    email_responsable: '',
    matricule: '',
    departement: '',
    password: '',
    password_confirmation: '',
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      ...form,
      role: 'Employe',
      email_responsable: form.email_responsable.trim(),
      departement: form.departement.trim(),
      matricule: form.matricule.trim(),
      nom: form.nom.trim(),
      email: form.email.trim(),
    };

    setError(null);
    setErrorDetails([]);
    setSubmitted(false);

    try {
      await register(payload);
      toast.success('Inscription envoyee pour validation administrateur.');
      setSubmitted(true);
    } catch (err) {
      const extracted = extractRegisterError(err);
      setError(extracted.summary);
      setErrorDetails(extracted.details);
      toast.error(extracted.summary);
    }
  };

  return (
    <section className="auth-shell auth-shell-simple">
      <div className="auth-simple-card auth-simple-card-wide">
        <div className="auth-panel-head auth-panel-head-simple">
          <span className="auth-badge">Inscription</span>
          <h2>Creer un compte</h2>
          <p>Renseignez les informations necessaires pour envoyer votre demande.</p>
        </div>

        <form onSubmit={onSubmit} className="auth-form">
          <div className="auth-form-grid">
            <label className="auth-field auth-field-full">
              <span>Nom complet</span>
              <input placeholder="Nom complet" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} required />
            </label>
            <label className="auth-field">
              <span>Email professionnel</span>
              <input type="email" placeholder="vous@exemple.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </label>
            <label className="auth-field">
              <span>Email responsable</span>
              <input type="email" placeholder="manager1.app@nf.com" value={form.email_responsable} onChange={(e) => setForm({ ...form, email_responsable: e.target.value })} required />
            </label>
            <label className="auth-field">
              <span>Matricule</span>
              <input placeholder="Ex: MA12" value={form.matricule} onChange={(e) => setForm({ ...form, matricule: e.target.value })} required />
            </label>
            <label className="auth-field">
              <span>Departement</span>
              <input placeholder="Ex: Industrialisation" value={form.departement} onChange={(e) => setForm({ ...form, departement: e.target.value })} required />
            </label>
            <label className="auth-field">
              <span>Mot de passe</span>
              <input type="password" placeholder="Au moins 8 caracteres" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </label>
            <label className="auth-field">
              <span>Confirmation du mot de passe</span>
              <input type="password" placeholder="Retapez le mot de passe" value={form.password_confirmation} onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })} required />
            </label>
          </div>

          <div className="auth-info-banner">
            La demande est verifiee par l administrateur avant activation du compte.
          </div>

          {error && (
            <div className="auth-error-box">
              <p>{error}</p>
              {errorDetails.length > 1 && (
                <ul>
                  {errorDetails.map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <button type="submit" className={submitted ? 'success' : ''}>{submitted ? 'Demande envoyee' : 'Envoyer la demande'}</button>
        </form>

        <p className="auth-switch">Deja inscrit ? <Link to="/login">Connexion</Link></p>
      </div>
    </section>
  );
}
