# Grand Marché — serveur

Serveur réel pour l'application Grand Marché : comptes, boutiques et commandes
partagés entre tous les appareils, séquestre sur les commandes, et paiements
Mobile Money réels (MTN MoMo Congo, Airtel Money Congo) via pawaPay.

## 1. Installer et lancer en local (mode simulation, sans argent réel)

```bash
npm install --omit=dev    # aucune dépendance externe : juste pour créer node_modules si besoin
cp .env.example .env
npm start
```

Le serveur écoute sur `http://localhost:3000`. Ouvrez cette adresse dans un
navigateur : c'est l'application (le dossier `public/` est servi tel quel).
En mode simulation (`PAYMENT_PROVIDER=mock`), les paiements Mobile Money sont
simulés — aucun argent réel ne bouge. C'est le mode par défaut, fait pour
tester tranquillement.

## 2. Vérifier que tout fonctionne

```bash
npm test                              # 38 tests d'intégration (API)
node test/pawapay.js                  # vérifie le connecteur pawaPay
node test/browser.js                  # test du vrai front-end dans un navigateur (nécessite `npx playwright install chromium` une première fois)
```

## 3. Passer aux vrais paiements Mobile Money (pawaPay)

1. Créez un compte sur [pawapay.io](https://pawapay.io) (sandbox pour tester,
   puis production).
2. Récupérez votre jeton API et configurez, dans `.env` :
   ```
   PAYMENT_PROVIDER=pawapay
   PAWAPAY_TOKEN=votre_jeton
   PAWAPAY_BASE_URL=https://api.sandbox.pawapay.io   # puis https://api.pawapay.io en production
   WEBHOOK_SECRET=une_longue_chaine_aleatoire
   ```
3. Dans le tableau de bord pawaPay, configurez l'URL de callback :
   `https://votre-domaine.com/api/webhooks/pawapay/VOTRE_WEBHOOK_SECRET`
4. **Important — argent réel à partir d'ici.** Testez d'abord entièrement en
   sandbox pawaPay (qui simule MTN/Airtel sans vrai argent) avant de passer
   en production.

## 4. Mettre en ligne

Ce serveur est un simple processus Node.js (aucune dépendance externe) avec
une base SQLite. Il peut être déployé sur n'importe quel hébergeur qui
exécute du Node.js avec un disque persistant : Render, Railway, Fly.io, un
VPS (Contabo, DigitalOcean…), etc. Trois choses à faire avant la mise en
ligne :

- Placer `DATA_DIR` sur un disque **persistant** (sinon la base est effacée
  à chaque redéploiement).
- Définir `TOKEN_SECRET` (48+ caractères aléatoires) — sinon toutes les
  sessions sautent à chaque redémarrage.
- Mettre le vrai domaine dans `PUBLIC_URL` et `ALLOWED_ORIGINS`.

Je peux m'occuper du déploiement avec toi quand tu es prêt.

## 5. Rendre les données persistantes (Turso — gratuit, sans carte)

Par défaut, les données (comptes, boutiques, commandes) vivent dans un fichier sur le
disque du serveur. Sur un hébergeur gratuit comme Render, ce disque est effacé à
chaque redémarrage du service. Pour que les données survivent, branchez une base
Turso :

1. Créez un compte gratuit sur [turso.tech](https://turso.tech) (aucune carte requise).
2. Créez une base de données (depuis leur tableau de bord web, ou leur CLI).
3. Récupérez son **URL** (commence par `libsql://...`) et un **jeton d'accès** (auth token).
4. Dans Render (ou votre `.env` en local), renseignez :
   ```
   TURSO_DATABASE_URL=libsql://votre-base.turso.io
   TURSO_AUTH_TOKEN=votre_jeton
   ```
5. Redéployez. Le serveur détecte automatiquement ces variables et bascule dessus —
   rien d'autre à changer. Sans elles, il continue de fonctionner comme avant (fichier
   local, non persistant), donc aucun risque à déployer ce changement avant d'avoir
   configuré Turso.

## 6. Activer les vrais e-mails (mot de passe oublié)

Par défaut, les e-mails (code de réinitialisation du mot de passe) ne sont pas
réellement envoyés (mode simulation). Pour les activer :

1. Créez un compte gratuit sur [Brevo](https://www.brevo.com) (300 e-mails/jour
   gratuits, aucune carte requise).
2. Dans leur tableau de bord, allez dans **Paramètres → Expéditeurs**, ajoutez et
   vérifiez une adresse e-mail (n'importe laquelle, pas besoin de nom de domaine).
3. Créez une clé API (**Paramètres → Clés API**).
4. Renseignez dans Render :
   ```
   EMAIL_PROVIDER=brevo
   BREVO_API_KEY=votre_clé
   BREVO_SENDER_EMAIL=l_adresse_que_vous_avez_vérifiée@exemple.com
   ```

⚠️ **Note honnête sur la connexion à Turso** : cette partie n'a pas pu être testée en
conditions réelles avant livraison (environnement de développement sans accès
Internet pour installer le logiciel nécessaire). Le reste de l'application a été
testé intensément ; cette seule brique (la connexion à Turso) mérite d'être
vérifiée après la première connexion — testez simplement l'application normalement
une fois les deux variables renseignées, et signalez tout souci.

## Comment l'argent circule

- **Boost d'un produit** (1 500 FCFA / 7 jours) et **certification boutique**
  (30 000 FCFA) : le client paie par Mobile Money, l'argent va directement
  sur le compte pawaPay de la plateforme. C'est un revenu direct.
- **Commande d'un client** : l'argent est mis en **séquestre** (bloqué) dès
  le paiement. Le vendeur le reçoit sur son solde interne seulement quand le
  client confirme avoir reçu sa commande (ou automatiquement après 72h si le
  vendeur a marqué « livré » sans réponse du client).
- **Retrait vendeur** : le vendeur retire son solde vers son Mobile Money ;
  la plateforme prélève 5 % de commission à ce moment-là. C'est le deuxième
  revenu direct.
- Un litige (marchandise non reçue, etc.) peut être tranché par un compte
  administrateur (`ADMIN_PHONE` dans `.env`), qui peut libérer les fonds au
  vendeur ou rembourser l'acheteur.

## Limites actuelles (à connaître avant la mise en ligne)

- **Pas de vérification par SMS** du numéro de téléphone à l'inscription :
  n'importe qui peut créer un compte avec n'importe quel numéro. Une vraie
  vérification (code SMS envoyé via un fournisseur comme Twilio ou un
  agrégateur local) réduirait la fraude — je peux l'ajouter si tu veux.
- **Pas de modération automatique** des boutiques et produits créés.
- **Livraison** : l'application organise la mise en relation et le paiement,
  mais pas le transport physique — c'est au vendeur de livrer.
- **Photos de produits** : actuellement stockées telles quelles dans la base
  (en base64 ou en URL) ; pour un usage à grande échelle, il vaudrait mieux
  les mettre sur un service de stockage dédié (moins cher, plus rapide).
