import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const demoAccounts = [
  { role: 'Admin', email: 'admin.app@nf.com' },
  { role: 'RH', email: 'rh.app@nf.com' },
  { role: 'Manager 1', email: 'manager1.app@nf.com' },
  { role: 'Manager 2', email: 'manager2.app@nf.com' },
  { role: 'Employe 1', email: 'younesboubakri37@gmail.com' },
  { role: 'Employe 2', email: 'vaticanbaba@gmail.com' },
  { role: 'Employe 3', email: 'younesboubakripro@gmail.com' },
  { role: 'Employe 4', email: 'alikhat050@gmail.com' },
];

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get('email') ?? 'rh.app@nf.com');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const linkedEmail = searchParams.get('email');

    if (linkedEmail) {
      setEmail(linkedEmail);
    }
  }, [searchParams]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message ?? 'Connexion impossible ou trop lente');
      } else {
        setError('Connexion impossible ou trop lente');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="auth-shell auth-shell-simple">
      <div className="auth-simple-card">
        <div className="auth-panel-head auth-panel-head-simple">
          <span className="auth-badge">Connexion</span>
          <h2>Se connecter</h2>
          <p>Entrez votre email et votre mot de passe.</p>
        </div>

        <form onSubmit={onSubmit} className="auth-form">
          <label className="auth-field">
            <span>Email</span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@entreprise.com" disabled={submitting} />
          </label>
          <label className="auth-field">
            <span>Mot de passe</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Votre mot de passe" disabled={submitting} />
          </label>

          {error && <div className="auth-error-inline">{error}</div>}

          <button type="submit" disabled={submitting}>{submitting ? 'Connexion...' : 'Se connecter'}</button>
        </form>

        <div className="auth-demo-block">
          <div className="auth-demo-head">
            <strong>Comptes de demonstration</strong>
            <span>Mot de passe: <code>Password123!</code></span>
          </div>
          <div className="auth-demo-list">
            {demoAccounts.map((account) => (
              <button
                key={account.email}
                type="button"
                className="auth-demo-item"
                onClick={() => setEmail(account.email)}
                disabled={submitting}
              >
                <strong>{account.role}</strong>
                <span>{account.email}</span>
              </button>
            ))}
          </div>
        </div>

        <p className="auth-switch">Pas de compte ? <Link to="/register">S'inscrire</Link></p>
      </div>
    </section>
  );
}
