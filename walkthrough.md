# Walkthrough : Automatisation de la Remédiation, Profil comportemental 360° et Analyses Prédictives BI

Toutes les étapes d'intégration de l'automatisation pédagogique, du suivi comportemental, et de la لوحة تحكم ذكاء الأعمال (BI Dashboard) ont été réalisées.

---

## 🛠️ Modifications réalisées

### 1. Structure de Base de Données (Schemas)
* **[lms.ts](file:///c:/Users/User/Desktop/Edut/web/src/infrastructure/database/schema/lms.ts)** : Ajout d'une colonne optionnelle `studentId` dans la table `lms_assignments` pour permettre l'affectation individuelle de devoirs de renforcement.
* **[discipline.ts](file:///c:/Users/User/Desktop/Edut/web/src/infrastructure/database/schema/discipline.ts)** : Création des tables `behavior_rewards` (récompenses et sanctions) et `counselor_notes` (journal de bord confidentiel du conseiller).

### 2. Déclencheur Automatique de Remédiation (Grade listener)
* **[exams.actions.ts](file:///c:/Users/User/Desktop/Edut/web/src/domains/academics/actions/exams.actions.ts)** : Lors de la soumission des notes, si une note est inférieure à **50%** de la note maximale (ex: < 10/20) :
  1. Un plan de remédiation actif est créé dans `pedagogie_remediations`.
  2. Un devoir individuel LMS (devoir de renforcement) est automatiquement généré pour cet élève.

### 3. Actions Serveur Comportement, Conseiller & BI
* **[discipline.actions.ts](file:///c:/Users/User/Desktop/Edut/web/src/domains/students/actions/discipline.actions.ts)** :
  * `saveBehaviorReward` : Enregistre les récompenses (Félicitations, Tableau d'honneur...) et ajuste le `behaviorScore` de l'élève.
  * `saveCounselorNote` : Enregistre des observations confidentielles avec vérification du rôle.
* **[bi.actions.ts](file:///c:/Users/User/Desktop/Edut/web/src/domains/analytics/actions/bi.actions.ts)** : Calcul prédictif du risque de décrochage scolaire (absences consécutives, taux de présence) et des baisses de performances par classe/matière (régression > 15%).

### 4. Interface Utilisateur (Pages & Components)
* **[ActionMenu de la liste des élèves](file:///c:/Users/User/Desktop/Edut/web/src/components/common/ActionMenu.tsx)** : Intégration de l'action **"Profil & Notes"** pour accéder au profil complet.
* **[page.tsx du profil](file:///c:/Users/User/Desktop/Edut/web/src/app/dashboard/students/[id]/profile/page.tsx)** : Récupération des données académiques et comportementales de l'élève ciblé.
* **[StudentProfileClient.tsx](file:///c:/Users/User/Desktop/Edut/web/src/app/dashboard/students/[id]/profile/StudentProfileClient.tsx)** : Client interactif premium composé de 3 onglets (Dossier Académique, Profil Comportemental, Notes Confidentielles).
* **[page.tsx de l'analyse BI](file:///c:/Users/User/Desktop/Edut/web/src/app/dashboard/analytics/page.tsx)** : Page de récupération des données prédictives.
* **[BIClient.tsx](file:///c:/Users/User/Desktop/Edut/web/src/app/dashboard/analytics/BIClient.tsx)** : لوحة تحكم ذكاء الأعمال (BI Dashboard) premium interactive pour visualiser les élèves critiques et les classes en régression.
* **[sidebar.tsx](file:///c:/Users/User/Desktop/Edut/web/src/app/dashboard/sidebar.tsx)** : Ajout du lien **"Analyses prédictives & BI"** dans la catégorie **PÉDAGOGIE**.

---

## 🧪 Plan de Vérification

1. **Vérification du Tableau BI (Analytics) :**
   * Se connecter à la plateforme et cliquer sur **Analyses prédictives & BI** dans la barre latérale.
   * Confirmer l'affichage des KPIs de présence et des listes d'alertes prédictives (Décrochage et Régression).
   * Cliquer sur "Alerter" pour un élève et vérifier l'apparition du toast de confirmation.
   * Cliquer sur "Fiche Profil" pour naviguer directement vers le dossier de l'élève.
