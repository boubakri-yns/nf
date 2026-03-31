# Presentation de Soutenance - Application Web de Gestion des Notes de Frais

## Slide 1 - Titre
- Application Web de Gestion des Notes de Frais
- Projet de fin d'etudes / stage
- Realise pour GNF
- Presente par : [Votre nom]
- Encadre par : [Nom encadrant]

## Slide 2 - Contexte et problematique
- La gestion manuelle des notes de frais entraine des retards, erreurs et manque de tracabilite.
- Les justificatifs sont disperses et le suivi des validations est difficile.
- L'entreprise a besoin d'une solution centralisee, fiable et securisee.
- Problematique : comment digitaliser tout le cycle de vie d'une note de frais ?

## Slide 3 - Objectifs du projet
- Permettre la creation et la soumission des notes de frais.
- Assurer un circuit de validation Employe -> Manager -> RH.
- Centraliser les justificatifs et l'historique des decisions.
- Offrir des tableaux de bord, notifications et rapports exportables.
- Garantir la securite, la tracabilite et la facilite de deploiement.

## Slide 4 - Acteurs du systeme
- Employe : cree, modifie, soumet et suit ses notes.
- Manager : approuve, refuse ou demande une correction.
- RH : valide pour paiement, refuse ou marque comme remboursee.
- Administrateur : gere comptes, demandes d'inscription, categories, parametres et audits.

## Slide 5 - Solution proposee
- Application web full stack de gestion des notes de frais.
- Interface moderne separee du backend.
- Workflow metier conforme au processus reel de l'entreprise.
- Gestion des roles, des pieces justificatives et des notifications.
- Reporting dynamique avec export CSV, XLSX et PDF.

## Slide 6 - Architecture technique
- Frontend : React 18, TypeScript, Vite
- Backend : Laravel 11, PHP 8.2, Sanctum
- Base de donnees : MySQL 8
- Deploiement : Docker Compose
- Services complementaires : Mailpit, stockage fichiers, exports PDF/XLSX

## Slide 7 - Fonctionnalites principales
- Authentification et inscription avec validation administrative.
- Gestion complete des notes de frais et lignes de depense.
- Upload des justificatifs.
- Notifications metier.
- Tableau de bord selon le role.
- Module d'administration.
- Module de rapports dynamiques.

## Slide 8 - Workflow metier
- 1. L'employe cree une note en brouillon.
- 2. Il ajoute les lignes de depense et les justificatifs.
- 3. Il soumet la note au manager.
- 4. Le manager approuve, refuse ou demande correction.
- 5. RH valide pour paiement puis marque la note comme remboursee.
- 6. Le systeme historise les actions et envoie les notifications.

## Slide 9 - Base de donnees
- Tables principales : users, notes_de_frais, lignes_depense, categories_depense.
- Tables de suivi : historique_approbations, notifications, login_audits.
- Tables avancees : registration_requests, rapport_configurations, parametres.
- Points forts : coherence des relations, controle des statuts, indexes de performance.

## Slide 10 - Securite et qualite
- Authentification par Laravel Sanctum.
- Controle d'acces par roles et policies.
- Validation frontend + backend.
- Audit des connexions.
- Gestion de l'activation/desactivation des comptes.
- Tests automatises backend sur authentification, workflow et rapports.

## Slide 11 - Demonstration de l'application
- Connexion et gestion des acces.
- Creation d'une note de frais.
- Ajout des lignes et justificatifs.
- Soumission et validation manager.
- Validation RH et remboursement.
- Consultation des notifications.
- Generation d'un rapport exportable.

## Slide 12 - Resultats obtenus
- Application fonctionnelle couvrant le cycle complet des notes de frais.
- Processus de validation fluidifie et tracable.
- Meilleure centralisation des donnees et justificatifs.
- Reporting et exports disponibles.
- Solution portable et rapide a lancer avec Docker.

## Slide 13 - Difficultes rencontrees
- Gestion fine des roles et autorisations.
- Coherence des transitions de statut.
- Generation des exports et documents.
- Conservation d'une architecture claire entre frontend et backend.

## Slide 14 - Limites et perspectives
- Etendre la couverture de tests au frontend.
- Ajouter des notifications en temps reel.
- Rendre le circuit d'approbation plus configurable.
- Enrichir les tableaux de bord et visualisations.
- Generaliser davantage l'integration cloud pour les fichiers.

## Slide 15 - Conclusion
- Le projet a permis de digitaliser un processus metier sensible.
- La solution repond aux besoins fonctionnels et techniques identifies.
- Elle constitue une base solide pour une mise en production et des evolutions futures.
- Merci pour votre attention.

## Questions possibles du jury
- Pourquoi avoir choisi React + Laravel ?
- Pourquoi avoir separe frontend et backend ?
- Comment la securite est-elle assuree ?
- Comment gerer la scalabilite et l'evolution future ?
- Quelles ameliorations seraient prioritaires en production ?

## Conseils de presentation orale
- Duree conseillee : 10 a 15 minutes.
- Consacrer 1 minute au contexte, 2 minutes a l'analyse, 3 minutes a la conception, 4 minutes a la demonstration, 2 minutes au bilan.
- Ajouter des captures d'ecran reelles dans les slides 7, 8 et 11.
- Ajouter un schema d'architecture et un diagramme UML si disponibles.
