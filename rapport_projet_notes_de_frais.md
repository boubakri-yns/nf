# RAPPORT DE PROJET

## Application Web de Gestion des Notes de Frais

**Entreprise d'accueil :** GNF  
**Nature du projet :** Conception et développement d'une application web de gestion des notes de frais  
**Technologies principales :** React, TypeScript, Vite, Laravel, PHP, MySQL, Docker  

---

# REMERCIEMENTS

Je tiens à exprimer ma profonde gratitude à l'ensemble des personnes qui ont contribué, de près ou de loin, à la réalisation de ce projet. Mes remerciements s'adressent en premier lieu à l'entreprise d'accueil GNF pour m'avoir offert l'opportunité de réaliser ce stage dans un environnement professionnel stimulant et formateur.

Je remercie également mon encadrant professionnel pour son accompagnement, ses orientations techniques et la confiance accordée tout au long du projet. Ses conseils ont été précieux pour mieux comprendre les contraintes métier liées à la gestion des notes de frais et pour faire évoluer l'application dans une direction pertinente.

Je remercie aussi mon encadrant pédagogique ainsi que l'ensemble des enseignants qui ont contribué à ma formation. Les connaissances acquises durant mon parcours ont constitué une base essentielle pour l'analyse, la conception et la réalisation de cette solution.

Enfin, j'adresse mes sincères remerciements à toutes les personnes qui m'ont soutenu moralement et techniquement durant la préparation de ce travail.

---

# LISTE DES ABRÉVIATIONS

| Abréviation | Signification |
|---|---|
| API | Application Programming Interface |
| CI | Continuous Integration |
| CSV | Comma-Separated Values |
| PDF | Portable Document Format |
| RH | Ressources Humaines |
| SPA | Single Page Application |
| SQL | Structured Query Language |
| UML | Unified Modeling Language |
| UI | User Interface |
| UX | User Experience |

---

# LISTE DES FIGURES

Figure 1 : Diagramme de cas d'utilisation global ........................................ [À compléter]  
Figure 2 : Diagramme de classes ........................................................ [À compléter]  
Figure 3 : Diagramme de séquence de l'authentification ................................. [À compléter]  
Figure 4 : Diagramme de séquence de création et soumission d'une note de frais ......... [À compléter]  
Figure 5 : Diagramme de séquence de validation manager ................................. [À compléter]  
Figure 6 : Diagramme de séquence de validation RH ...................................... [À compléter]  
Figure 7 : Architecture générale de l'application ...................................... [À compléter]  
Figure 8 : Interface de connexion ...................................................... [À compléter]  
Figure 9 : Tableau de bord principal ................................................... [À compléter]  
Figure 10 : Interface de gestion des notes de frais .................................... [À compléter]  
Figure 11 : Interface des rapports ..................................................... [À compléter]  
Figure 12 : Interface d'administration ................................................. [À compléter]  

---

# LISTE DES TABLEAUX

Tableau 1 : Besoins fonctionnels ....................................................... [À compléter]  
Tableau 2 : Besoins non fonctionnels ................................................... [À compléter]  
Tableau 3 : Description des acteurs .................................................... [À compléter]  
Tableau 4 : Technologies utilisées ..................................................... [À compléter]  
Tableau 5 : Principales tables de la base de données ................................... [À compléter]  
Tableau 6 : Cas de tests réalisés ...................................................... [À compléter]  

---

# INTRODUCTION GÉNÉRALE

Dans un contexte où la digitalisation des processus internes constitue un levier majeur d'amélioration de la performance organisationnelle, la gestion des notes de frais représente un domaine particulièrement sensible. En effet, les processus manuels ou semi-numériques génèrent souvent des retards, des erreurs de saisie, une faible traçabilité des validations et une charge administrative importante pour les collaborateurs, les managers et les services RH.

Le présent projet s'inscrit dans cette dynamique de transformation digitale. Il consiste à concevoir et développer une application web permettant de centraliser la création, la soumission, la validation, le suivi et le remboursement des notes de frais au sein de l'entreprise GNF. L'objectif principal est de proposer une solution fiable, sécurisée, ergonomique et alignée sur le workflow métier réel de l'entreprise.

L'application réalisée repose sur une architecture moderne séparant le frontend et le backend. L'interface utilisateur a été développée avec React, TypeScript et Vite, tandis que le backend repose sur Laravel 11, PHP 8.2 et MySQL. Le projet intègre également un déploiement conteneurisé avec Docker, une gestion des accès par rôles, des notifications, un module de reporting dynamique et des mécanismes d'audit.

Ce rapport présente de manière détaillée le contexte du projet, l'analyse des besoins, la conception, les choix techniques, les étapes de réalisation ainsi que les tests et les perspectives d'amélioration.

---

# CHAPITRE I : CONTEXTE GÉNÉRAL DU PROJET

## 1. Présentation de l'entreprise d'accueil

GNF est une entreprise industrielle reconnue dans le domaine des solutions de câblage et d'infrastructures électriques. Dans un tel environnement, les activités professionnelles impliquent des déplacements, des missions techniques, des visites clients, des achats ponctuels et diverses dépenses engagées par les collaborateurs dans le cadre de leur travail.

La gestion rigoureuse de ces dépenses est nécessaire pour assurer le contrôle financier, le respect des procédures internes, la rapidité de remboursement et la transparence des validations. C'est dans cette logique que s'inscrit le présent projet de développement d'une solution de gestion des notes de frais.

## 2. Contexte du stage

Au sein de l'entreprise, la gestion des notes de frais peut devenir complexe lorsque le nombre de collaborateurs et d'opérations augmente. Les principales difficultés rencontrées dans les processus classiques sont les suivantes :

- dispersion des informations entre plusieurs supports ;
- lenteur des circuits de validation ;
- manque de traçabilité des décisions ;
- difficulté de suivi des remboursements ;
- absence de tableaux de bord consolidés ;
- risque d'erreurs lors du contrôle administratif.

Le stage avait donc pour objectif de proposer et de réaliser une application web permettant d'automatiser ce processus, tout en respectant les rôles métiers de chaque intervenant.

## 3. Étude de l'existant

Avant la mise en place de la solution, la gestion des notes de frais repose généralement sur une suite d'étapes manuelles ou partiellement informatisées. L'employé prépare sa note, y joint les justificatifs, la transmet à son responsable hiérarchique, puis au service RH ou administratif pour validation et remboursement.

Cette approche présente plusieurs limites :

- les données ne sont pas centralisées ;
- le suivi d'état d'une note est peu visible ;
- les validations peuvent être retardées ;
- les justificatifs sont parfois perdus ou incomplets ;
- les analyses globales nécessitent des traitements supplémentaires ;
- la sécurité et la traçabilité sont insuffisantes.

Une solution numérique dédiée permet de centraliser les informations, de formaliser le workflow, de réduire les délais et de mieux piloter les dépenses.

## 4. Problématique

Comment concevoir une application web moderne permettant de gérer efficacement le cycle de vie complet des notes de frais, depuis la saisie par l'employé jusqu'au remboursement par le service RH, tout en garantissant la sécurité des accès, la traçabilité des actions, la fiabilité des données et la disponibilité de rapports d'analyse exploitables ?

## 5. Objectifs du projet

Les objectifs du projet sont les suivants :

- permettre à l'employé de créer et soumettre ses notes de frais ;
- permettre l'ajout de lignes de dépenses et de justificatifs ;
- automatiser le circuit de validation entre employé, manager et RH ;
- notifier les utilisateurs lors des changements d'état ;
- offrir une interface d'administration pour gérer les utilisateurs, catégories et paramètres ;
- fournir des rapports détaillés et exportables ;
- assurer la sécurité des accès selon les rôles ;
- rendre l'application facilement déployable grâce à Docker.

## 6. Méthodologie adoptée

La réalisation du projet s'est appuyée sur une démarche itérative. Une première phase d'analyse a permis d'identifier les rôles, les besoins métier et le workflow attendu. Ensuite, la conception des entités, des interfaces et des échanges API a servi de base au développement.

Le projet a été développé en plusieurs incréments fonctionnels :

- mise en place de l'authentification et de la gestion des rôles ;
- création du module de gestion des notes de frais ;
- implémentation du workflow de validation ;
- intégration des notifications ;
- ajout du module de reporting ;
- développement de l'administration et des audits ;
- mise en place des tests et du déploiement Docker.

Cette approche a permis de valider progressivement chaque brique fonctionnelle et de garantir la cohérence globale de la solution.

---

# CHAPITRE II : ANALYSE ET CONCEPTION

## 1. Analyse des besoins

### 1.1 Besoins fonctionnels

L'application doit répondre aux besoins fonctionnels suivants :

- authentifier les utilisateurs selon leurs identifiants ;
- permettre l'inscription d'un employé avec validation préalable par l'administrateur ;
- gérer plusieurs rôles : Employé, Manager, RH et Administrateur ;
- créer, modifier, consulter et supprimer des notes de frais ;
- ajouter, modifier et supprimer des lignes de dépense ;
- joindre des justificatifs aux dépenses ;
- soumettre une note au manager ;
- permettre au manager d'approuver, de refuser ou de demander une correction ;
- permettre au service RH de valider pour paiement, refuser ou marquer une note comme remboursée ;
- archiver les notes remboursées ;
- historiser les actions de validation ;
- envoyer des notifications aux utilisateurs concernés ;
- afficher des tableaux de bord synthétiques ;
- générer des rapports dynamiques selon plusieurs critères ;
- exporter les rapports aux formats CSV, XLSX et PDF ;
- administrer les utilisateurs, paramètres et catégories de dépense ;
- conserver des traces d'audit des connexions et des opérations sensibles.

### 1.2 Besoins non fonctionnels

L'application doit également satisfaire plusieurs contraintes non fonctionnelles :

- sécurité des accès par authentification et contrôle des rôles ;
- fiabilité du stockage et de la cohérence des données ;
- performance correcte sur les opérations de consultation et de filtrage ;
- ergonomie de l'interface utilisateur ;
- maintenabilité du code grâce à une architecture claire ;
- extensibilité pour accueillir de nouvelles fonctionnalités ;
- portabilité via Docker ;
- traçabilité des actions ;
- testabilité du backend ;
- compatibilité avec des exports de données et des justificatifs.

## 2. Identification des acteurs

### 2.1 Employé

L'employé est le principal initiateur du processus. Il peut s'inscrire, se connecter, créer une note de frais, ajouter des dépenses, joindre des justificatifs, soumettre la note, consulter son état, recevoir des notifications et télécharger le document de remboursement lorsque celui-ci est disponible.

### 2.2 Manager

Le manager intervient comme premier niveau de validation. Il peut consulter les notes de son équipe, approuver une note, refuser une note, demander une correction, suivre des indicateurs liés à son équipe et gérer les utilisateurs rattachés à son périmètre.

### 2.3 Ressources humaines

Le service RH intervient après validation managériale. Il peut consulter les notes en attente RH, valider une note pour paiement, refuser une note, marquer une note comme remboursée, générer des rapports globaux et consulter les tableaux de bord.

### 2.4 Administrateur

L'administrateur dispose des privilèges les plus étendus. Il peut gérer les demandes d'inscription, les utilisateurs, les catégories, les paramètres, les audits et intervenir sur les notes de frais.

## 3. Spécifications fonctionnelles

### 3.1 Authentification et gestion des accès

Le système d'authentification repose sur Laravel Sanctum. Chaque utilisateur peut se connecter via son adresse email et son mot de passe. Lors de la connexion, le système contrôle la validité des identifiants, l'état d'activation du compte et enregistre un audit de connexion avec l'adresse IP, l'agent utilisateur et le résultat de la tentative.

L'inscription d'un employé suit un processus particulier. La demande est enregistrée dans une table dédiée, puis validée ou refusée par un administrateur. Ce mécanisme permet d'éviter la création directe de comptes non contrôlés.

### 3.2 Gestion des notes de frais

Une note de frais contient principalement un titre de mission, le matricule de l'employé, la date de création, le montant total, le statut, l'email de l'employé, l'email du responsable et un commentaire éventuel. L'employé peut créer une note en brouillon puis y ajouter une ou plusieurs lignes de dépense. Le total de la note est recalculé à partir des lignes associées.

### 3.3 Processus de validation

Le workflow métier implémenté est le suivant :

1. création de la note en statut `brouillon` ;
2. ajout des lignes de dépense ;
3. soumission au manager avec passage au statut `en_attente_responsable` ;
4. décision du manager : approbation, refus ou demande de correction ;
5. décision RH : validation pour paiement, refus ou remboursement ;
6. archivage éventuel de la note remboursée.

Chaque décision génère une entrée dans l'historique des approbations.

### 3.4 Gestion des notifications

Le système envoie des notifications lors des événements importants : création ou soumission d'une note, attente de validation, approbation manager, demande de correction, refus, validation RH, remboursement, validation ou refus d'une demande d'inscription.

Les notifications permettent d'améliorer la réactivité des utilisateurs et de fluidifier le circuit métier.

### 3.5 Gestion des rapports

Le module de rapports permet aux profils RH et administrateur de sélectionner une période, choisir les colonnes à afficher, appliquer des filtres par statut, département, manager, employé ou montant, trier les résultats, afficher une synthèse globale, inclure des graphiques, exporter le rapport aux formats CSV, XLSX et PDF, et sauvegarder des configurations de rapports réutilisables.

### 3.6 Administration du système

L'administration couvre plusieurs fonctions : gestion des utilisateurs, traitement des demandes d'inscription, gestion des catégories de dépense, gestion des paramètres métier, consultation des journaux d'audit et possibilité d'intervenir sur les notes de frais.

## 4. Conception UML

### 4.1 Diagramme de cas d'utilisation global

[Espace réservé pour le diagramme de cas d'utilisation global]

### 4.2 Diagramme de classes

[Espace réservé pour le diagramme de classes]

### 4.3 Diagramme de séquence : authentification

[Espace réservé pour le diagramme de séquence d'authentification]

### 4.4 Diagramme de séquence : création et soumission d'une note de frais

[Espace réservé pour le diagramme de séquence de création et soumission]

### 4.5 Diagramme de séquence : validation par le manager

[Espace réservé pour le diagramme de séquence de validation manager]

### 4.6 Diagramme de séquence : validation par les ressources humaines

[Espace réservé pour le diagramme de séquence de validation RH]

## 5. Conception de la base de données

### 5.1 Modèle conceptuel de données

Le modèle conceptuel repose sur plusieurs entités principales :

- `User` : représente les utilisateurs de la plateforme ;
- `NoteDeFrais` : représente les notes de frais ;
- `LigneDepense` : représente les dépenses détaillées d'une note ;
- `CategorieDepense` : classe les dépenses ;
- `HistoriqueApprobation` : conserve les actions de validation ;
- `Notification` : mémorise les notifications envoyées ;
- `Parametre` : stocke les paramètres métier ;
- `RapportConfiguration` : conserve les modèles de rapports ;
- `RegistrationRequest` : gère les demandes d'inscription ;
- `LoginAudit` : trace les tentatives de connexion.

### 5.2 Modèle logique / physique de données

Les principales tables de la base de données sont :

- `users` : `id`, `nom`, `email`, `email_responsable`, `role`, `matricule`, `departement`, `password`, `active` ;
- `notes_de_frais` : `id`, `titre_mission`, `matricule_employe`, `date_creation`, `total_note`, `statut`, `email_employe`, `email_responsable`, `commentaire_employe`, dates de workflow, référence comptable et archivage ;
- `lignes_depense` : `id`, `note_de_frais_id`, `categorie_id`, `date_depense`, `montant`, `justificatif_path`, `commentaire` ;
- `historique_approbations` : `id`, `note_de_frais_id`, `validateur_email`, `action`, `date_decision`, `commentaire` ;
- `notifications` : informations de notification, lecture et métadonnées ;
- `categories_depense` : nom, code, plafond journalier, justificatif obligatoire, état actif ;
- `parametres` : clé, valeur, type, description ;
- `rapport_configurations` : nom, description, configuration JSON, créateur ;
- `registration_requests` : informations d'inscription, statut, administrateur traitant, commentaire et dates de traitement ;
- `login_audits` : traces des tentatives de connexion.

### 5.3 Relations et contraintes

Les relations importantes sont :

- un utilisateur peut créer plusieurs notes de frais ;
- une note de frais appartient à un employé et à un responsable ;
- une note de frais possède plusieurs lignes de dépense ;
- une ligne de dépense appartient à une catégorie ;
- une note de frais possède plusieurs actions d'historique ;
- un utilisateur peut recevoir plusieurs notifications ;
- une demande d'inscription est liée à un manager et éventuellement à un administrateur.

Les contraintes assurent la cohérence du système :

- unicité de l'email utilisateur ;
- unicité du matricule ;
- clés étrangères entre utilisateurs, notes, lignes et historiques ;
- contrôle des statuts ;
- restrictions de suppression selon les relations métier.

---

# CHAPITRE III : ENVIRONNEMENT TECHNIQUE ET ARCHITECTURE

## 1. Technologies utilisées

### 1.1 Frontend : React, TypeScript, Vite

Le frontend a été développé avec React 18 et TypeScript afin de construire une interface moderne, dynamique et fortement typée. Vite a été choisi comme outil de bundling et de développement pour sa rapidité et sa simplicité de configuration.

Le frontend utilise également :

- `react-router-dom` pour la navigation ;
- `axios` pour les appels API ;
- `react-hook-form` pour la gestion des formulaires ;
- `react-hot-toast` pour les messages utilisateur ;
- `react-dropzone` pour l'import de fichiers ;
- `recharts` pour la visualisation de données.

### 1.2 Backend : Laravel, PHP, Sanctum

Le backend repose sur Laravel 11 et PHP 8.2. Laravel a été retenu pour la richesse de son écosystème, la structuration MVC, la facilité de création d'API REST, la gestion native de la validation, la prise en charge des migrations et la robustesse de ses mécanismes de sécurité.

Laravel Sanctum est utilisé pour l'authentification par token des utilisateurs de l'application.

### 1.3 Base de données : MySQL

MySQL 8.0 assure le stockage persistant des données métier. Il permet de gérer les entités principales du système ainsi que leurs relations. L'utilisation des migrations Laravel facilite le suivi et l'évolution du schéma de données.

### 1.4 Outils et plateformes : Docker, Git, GitHub

Le projet est conteneurisé avec Docker et orchestré via `docker-compose`. La solution comprend notamment :

- un conteneur frontend ;
- un conteneur backend ;
- un conteneur MySQL ;
- un conteneur Mailpit pour le test des emails.

Git est utilisé pour le versionnement du code et GitHub pour l'hébergement et la collaboration.

## 2. Architecture générale de l'application

L'application adopte une architecture client-serveur découplée :

- le frontend React consomme des endpoints REST exposés par Laravel ;
- le backend traite la logique métier, l'accès aux données, l'authentification et les contrôles d'autorisation ;
- la base MySQL stocke les données persistantes ;
- le stockage local ou cloud conserve les justificatifs et documents générés ;
- le système de notifications et d'exports complète l'écosystème fonctionnel.

[Espace réservé pour le schéma d'architecture générale]

## 3. Organisation du projet

### 3.1 Structure du frontend

Le frontend est organisé autour de plusieurs répertoires clés :

- `src/pages` : pages principales de l'application ;
- `src/components` : composants réutilisables ;
- `src/layouts` : structure globale de l'interface ;
- `src/context` : contexte d'authentification ;
- `src/api` : services de communication avec le backend ;
- `src/types` : typage TypeScript ;
- `src/utils` : utilitaires métier et techniques.

Les routes principales couvrent la connexion, l'inscription, le tableau de bord, le profil, les notes de frais, les notifications, les rapports, la gestion manager et l'administration.

### 3.2 Structure du backend

Le backend suit l'organisation Laravel standard :

- `app/Http/Controllers/Api` : contrôleurs d'API ;
- `app/Models` : modèles Eloquent ;
- `app/Services` : services métiers ;
- `app/Policies` : règles d'autorisation ;
- `routes/api.php` : définition des routes API ;
- `database/migrations` : création et évolution de la base ;
- `database/seeders` : alimentation des données initiales ;
- `tests/Feature` : tests fonctionnels.

## 4. Sécurité et gestion des accès

La sécurité de l'application repose sur plusieurs mécanismes :

- authentification via Sanctum ;
- vérification du rôle de l'utilisateur avant l'accès à certaines routes ;
- politiques d'autorisation sur les notes de frais ;
- validation serveur de toutes les données reçues ;
- audit des connexions ;
- activation ou désactivation des comptes ;
- prise en charge d'un stockage contrôlé pour les justificatifs ;
- possibilité de forcer HTTPS en production.

Cette approche permet de limiter les accès non autorisés et d'assurer la traçabilité des opérations sensibles.

---

# CHAPITRE IV : RÉALISATION DU PROJET

## 1. Mise en place de l'environnement de développement

La mise en place du projet a commencé par la création d'un monorepo contenant deux sous-projets : le backend et le frontend. Ensuite, un environnement Docker a été défini afin de standardiser l'exécution de l'application sur toute machine de développement.

Le fichier `docker-compose.yml` déclare les services nécessaires et relie les différents conteneurs. Le backend applique automatiquement certaines tâches à son démarrage, notamment l'installation des dépendances si besoin, la génération de la clé d'application, l'exécution des migrations, le seeding et la création du lien de stockage.

Cette approche permet un démarrage rapide de l'application tout en réduisant les écarts entre environnements.

## 2. Réalisation du module d'authentification

Le module d'authentification constitue la porte d'entrée de l'application. Il gère l'inscription des employés via une demande soumise à validation, la connexion avec génération de token, la récupération du profil connecté, la mise à jour du profil et la déconnexion.

Le backend contrôle plusieurs cas métier : demande encore en attente de validation, demande refusée, identifiants invalides et compte désactivé. Chaque tentative de connexion est enregistrée dans la table `login_audits`. Cette fonctionnalité renforce la traçabilité et la sécurité.

## 3. Réalisation du module de gestion des notes de frais

Ce module permet à l'employé de gérer ses notes de frais de bout en bout. L'utilisateur peut créer une nouvelle note, consulter la liste de ses notes, filtrer et rechercher ses notes, consulter le détail d'une note, ajouter des lignes de dépense, modifier ou supprimer ses brouillons et télécharger les justificatifs lorsque l'accès est autorisé.

Le système recalcule le montant total de chaque note à partir des dépenses associées. Les catégories de dépense disposent d'un plafond journalier et d'une indication sur l'obligation de justificatif, ce qui structure les règles métier du formulaire.

## 4. Réalisation du workflow de validation

Le workflow de validation a été implémenté au niveau du contrôleur principal des notes de frais et des politiques d'autorisation. Il tient compte du rôle connecté et de l'état courant de la note.

Le manager peut valider, refuser ou demander une correction sur une note en attente de sa décision. De son côté, le service RH peut valider pour paiement, refuser ou marquer la note comme remboursée. Lors du remboursement, le système génère une référence comptable ainsi qu'un document de remboursement téléchargeable.

Toutes les décisions sont historisées dans la table `historique_approbations`, ce qui permet de suivre précisément le cycle de vie de chaque note.

## 5. Réalisation du module de notifications

Le module de notifications s'appuie sur un service dédié. Il centralise l'envoi d'informations aux acteurs concernés après chaque événement important. Les notifications sont visibles dans l'application et peuvent également être utilisées pour l'envoi d'emails, avec un mécanisme de repli vers les logs si le SMTP n'est pas disponible.

Ce module améliore la communication interne du processus. Par exemple :

- le manager reçoit une notification lors de la soumission d'une note ;
- l'employé est informé d'une approbation, d'un refus ou d'une demande de correction ;
- le service RH reçoit une notification lorsqu'une note validée par le manager est en attente de traitement ;
- l'utilisateur reçoit une confirmation en cas de remboursement.

## 6. Réalisation du module de rapports

Le module de rapports est l'une des fonctionnalités avancées de l'application. Il permet de produire des analyses dynamiques sur les notes de frais en fonction de plusieurs critères.

Les fonctionnalités implémentées sont :

- statistiques mensuelles ;
- regroupement par employé ;
- regroupement par département ;
- vue d'équipe pour les managers ;
- indicateurs globaux pour les profils RH et administrateur ;
- génération de rapports personnalisés ;
- prévisualisation paginée ;
- export CSV ;
- export Excel ;
- export PDF ;
- sauvegarde et suppression de configurations de rapports.

Le moteur de rapport permet de choisir les colonnes à afficher, d'appliquer des filtres et d'intégrer des graphiques par catégorie et par mois.

## 7. Réalisation du module d'administration

Le module d'administration couvre les opérations les plus sensibles du système. L'administrateur peut consulter les demandes d'inscription, approuver ou refuser une demande, gérer les comptes utilisateurs, activer ou désactiver un compte, usurper un compte dans un cadre administratif prévu par le système, gérer les catégories de dépense, gérer les paramètres métier, consulter les journaux d'audit et intervenir sur les notes de frais.

La gestion des demandes d'inscription constitue une fonctionnalité importante. Lorsqu'une demande est approuvée, un compte employé est créé automatiquement et un message d'accès est envoyé.

## 8. Gestion des erreurs et validations

Le système intègre plusieurs niveaux de validation :

- validation frontend pour guider l'utilisateur ;
- validation backend systématique sur toutes les requêtes ;
- contrôle d'accès basé sur le rôle ;
- contrôle des transitions de statut ;
- contrôle de la présence de dépenses avant soumission ;
- contrôle de certaines données obligatoires comme le mode de remboursement ;
- gestion des erreurs sous forme de réponses HTTP cohérentes.

Ces validations permettent de réduire les incohérences et de sécuriser le workflow métier.

## 9. Présentation des interfaces principales

Les interfaces principales de l'application sont :

- page de connexion ;
- page d'inscription ;
- tableau de bord ;
- page de liste des notes ;
- page de détail d'une note ;
- formulaire de création et d'édition d'une note ;
- page des notifications ;
- interface de rapports ;
- interface manager pour les utilisateurs ;
- espace d'administration ;
- page de paramétrage.

[Espace réservé pour les captures d'écran des interfaces principales]

---

# CHAPITRE V : TESTS ET DÉPLOIEMENT

## 1. Stratégie de test

Afin d'assurer la qualité de la solution, une stratégie de test centrée sur le backend a été mise en place à travers des tests fonctionnels automatisés. Les tests couvrent notamment l'authentification, le workflow métier des notes de frais et le générateur de rapports.

Cette approche permet de vérifier les scénarios critiques, de prévenir les régressions et de sécuriser les évolutions du projet.

## 2. Tests fonctionnels

Plusieurs scénarios fonctionnels ont été testés, parmi lesquels :

- connexion réussie d'un utilisateur ;
- connexion des comptes de démonstration générés par le seeder ;
- changement du statut d'une note de brouillon vers une note soumise ;
- refus d'une note par le manager ;
- remboursement d'une note par le service RH ;
- téléchargement du document de remboursement ;
- téléchargement d'un justificatif par un acteur autorisé ;
- notification de l'employé et du manager lors d'un refus RH.

Ces tests valident la conformité du workflow avec les règles métier attendues.

## 3. Tests du backend et des API

Le backend comporte notamment les fichiers de test suivants :

- `AuthTest` pour l'authentification ;
- `ExpenseWorkflowTest` pour le workflow des notes de frais ;
- `RapportBuilderTest` pour le module de rapports.

Les tests montrent que :

- le système d'authentification répond correctement aux scénarios usuels ;
- les transitions de statut respectent les rôles autorisés ;
- le document de remboursement est généré et stocké correctement ;
- les exports et la prévisualisation des rapports fonctionnent ;
- les configurations de rapports peuvent être sauvegardées et relues.

## 4. Déploiement avec Docker

Le déploiement local du projet s'effectue via Docker Compose. La commande principale utilisée est :

```bash
docker compose up -d --build
```

L'environnement fournit :

- le frontend sur `http://localhost:5173` ;
- l'API backend sur `http://localhost:8001/api` ;
- la base MySQL sur le port `3307` ;
- Mailpit sur `http://localhost:8026`.

Cette organisation simplifie les démonstrations, les tests et la mise en route rapide du projet sur un nouveau poste.

## 5. Résultats obtenus

À l'issue du projet, une application complète de gestion des notes de frais a été réalisée. Les principaux résultats obtenus sont :

- une authentification sécurisée avec gestion des rôles ;
- un workflow métier cohérent et traçable ;
- une gestion complète des notes de frais et justificatifs ;
- des notifications liées aux événements métier ;
- un tableau de bord synthétique ;
- un module de rapports avancé avec export ;
- une interface d'administration ;
- une conteneurisation opérationnelle avec Docker ;
- des tests automatisés sur les fonctionnalités critiques.

Le projet répond donc aux objectifs fixés au départ et constitue une base solide pour une mise en production ou une extension future.

## 6. Limites et difficultés rencontrées

Malgré les résultats obtenus, plusieurs limites peuvent être relevées :

- certains éléments de présentation restent dépendants des captures et diagrammes à finaliser ;
- la couverture de test peut encore être élargie au frontend ;
- certaines règles métier pourraient être rendues encore plus paramétrables ;
- les notifications temps réel ne sont pas encore implémentées ;
- le module de reporting peut encore être enrichi par des visualisations supplémentaires.

Les principales difficultés techniques rencontrées concernent généralement la gestion fine des rôles et des autorisations, la cohérence des transitions de statut, la génération des exports et la conservation d'une architecture propre dans un projet full stack.

## 7. Perspectives d'amélioration

Plusieurs évolutions peuvent être envisagées pour enrichir la solution :

- ajout de notifications en temps réel ;
- amélioration de la couverture de tests frontend ;
- intégration d'un circuit d'approbation configurable ;
- ajout de signatures ou validations multi-niveaux ;
- export avancé avec modèles personnalisables ;
- tableau de bord plus riche avec indicateurs prédictifs ;
- intégration d'un stockage cloud généralisé pour les pièces jointes ;
- historisation plus poussée des actions administratives ;
- internationalisation de l'interface.

---

# CONCLUSION GÉNÉRALE

Ce projet avait pour objectif de concevoir et réaliser une application web de gestion des notes de frais répondant à des besoins concrets d'organisation, de contrôle et de traçabilité. À travers une approche structurée, il a été possible de mettre en place une solution moderne, basée sur des technologies actuelles et adaptées au contexte professionnel.

L'application développée permet de couvrir les principales étapes du cycle de vie d'une note de frais : création, soumission, validation hiérarchique, validation RH, remboursement, notification et reporting. En parallèle, le système assure un niveau de sécurité satisfaisant grâce à l'authentification, à la séparation des rôles et aux contrôles d'accès.

Au-delà de l'aspect purement technique, ce projet a permis de mettre en pratique plusieurs compétences essentielles en ingénierie logicielle : analyse des besoins, conception orientée métier, modélisation des données, développement full stack, tests fonctionnels et déploiement conteneurisé.

Ainsi, ce travail représente une expérience formatrice et une réalisation concrète qui démontre la capacité à produire une application professionnelle utile, évolutive et alignée sur des exigences réelles.

---

# ANNEXES

## Annexe 1 : Extraits du code source

[Espace réservé pour les extraits de code source]

## Annexe 2 : Captures d'écran de l'application

[Espace réservé pour les captures d'écran]

## Annexe 3 : Manuel d'utilisation

### 1. Connexion

L'utilisateur accède à l'application via la page de connexion, saisit son email et son mot de passe, puis valide le formulaire. En cas de succès, il est redirigé vers son tableau de bord.

### 2. Création d'une note de frais

L'employé se rend dans le module des notes de frais, crée une nouvelle note, saisit les informations demandées puis ajoute les différentes lignes de dépense.

### 3. Soumission de la note

Une fois la note complétée, l'employé peut la soumettre au manager. La note change alors de statut et entre dans le circuit de validation.

### 4. Validation manager

Le manager consulte la note et décide soit de l'approuver, soit de la refuser, soit de demander une correction.

### 5. Validation RH et remboursement

Le service RH traite les notes validées par les managers. Il peut confirmer la note pour paiement puis la marquer comme remboursée.

### 6. Consultation des rapports

Les utilisateurs autorisés accèdent au module de rapports, définissent une période, choisissent les filtres et génèrent une vue synthétique ou un export.
