# Walkthrough : Automatisation de la Remédiation & Profil comportemental 360°

Toutes les étapes d'intégration de l'automatisation pédagogique et du suivi comportemental ont été réalisées. 

---

## 🛠️ Modifications réalisées

### 1. Structure de Base de Données (Schemas)
* **[lms.ts](file:///c:/Users/User/Desktop/Edut/web/src/infrastructure/database/schema/lms.ts)** : Ajout d'une colonne optionnelle `studentId` dans la table `lms_assignments` pour permettre l'affectation individuelle de devoirs de renforcement.
* **[discipline.ts](file:///c:/Users/User/Desktop/Edut/web/src/infrastructure/database/schema/discipline.ts)** : Création des tables `behavior_rewards` (récompenses et sanctions) et `counselor_notes` (journal de bord confidentiel du conseiller).

### 2. Déclencheur Automatique de Remédiation (Grade listener)
* **[exams.actions.ts](file:///c:/Users/User/Desktop/Edut/web/src/domains/academics/actions/exams.actions.ts)** : Lors de la soumission des notes, si une note est inférieure à **50%** de la note maximale (ex: < 10/20) :
  1. Un plan de remédiation actif est créé dans `pedagogie_remediations`.
  2. Un devoir individuel LMS (devoir de renforcement) est automatiquement généré pour cet élève.

### 3. Actions Serveur Comportement & Conseiller
* **[discipline.actions.ts](file:///c:/Users/User/Desktop/Edut/web/src/domains/students/actions/discipline.actions.ts)** :
  * `saveBehaviorReward` : Enregistre les récompenses (Félicitations, Tableau d'honneur...) et ajuste dynamiquement le `behaviorScore` de l'élève.
  * `saveCounselorNote` : Enregistre des observations confidentielles avec vérification stricte du rôle de l'utilisateur (autorisé uniquement pour Admin, Directeur et Conseiller).

### 4. Interface Utilisateur (Pages & Components)
* **[ActionMenu de la liste des élèves](file:///c:/Users/User/Desktop/Edut/web/src/app/dashboard/students/page.tsx)** : Ajout de l'action **"Profil & Notes"** permettant d'accéder au profil complet de l'étudiant.
* **[page.tsx du profil](file:///c:/Users/User/Desktop/Edut/web/src/app/dashboard/students/[id]/profile/page.tsx)** : Récupère côté serveur toutes les données académiques, comportementales et confidentielles de l'élève ciblé.
* **[StudentProfileClient.tsx](file:///c:/Users/User/Desktop/Edut/web/src/app/dashboard/students/[id]/profile/StudentProfileClient.tsx)** : Client interactif premium composé de 3 onglets :
  1. **Dossier Académique** : Affichage des notes récentes (avec alertes visuelles), plans de remédiation en cours, et devoirs de soutien.
  2. **Profil Comportemental** : Score de conduite global, historique des incidents, et possibilité d'octroyer des récompenses/sanctions modifiant le score.
  3. **Notes Confidentielles** : Espace sécurisé permettant de lire et de rédiger des comptes-rendus de séances d'écoute ou observations (réservé au staff autorisé).

---

## 🧪 Plan de Vérification

1. **Soumission d'une note basse :**
   * Enregistrer une note de `8/20` pour un élève lors d'un examen.
   * Consulter la page **Profil & Notes** de cet élève : vérifier la présence de l'alerte soutien, de la remédiation active dans la colonne droite, et du devoir LMS individuel de renforcement.

2. **Octroi de Récompense :**
   * Dans l'onglet **Profil Comportemental**, attribuer des "Félicitations" (+15 pts).
   * Confirmer que le score de conduite global de l'élève est instantanément augmenté de 15 points.

3. **Confidentialité des Notes :**
   * Se connecter avec un compte Enseignant (simple professeur) et essayer d'accéder à l'onglet "Notes Confidentielles" ou de soumettre une note : vérifier que l'accès est strictement refusé.
