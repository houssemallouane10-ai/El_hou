// Français. Plural entries follow CLDR categories (one, many, other).
export default {
  common: {
    appName: 'Khedmati',
    tagline: 'Emploi et recrutement en Algérie',
    country: 'Algérie',
    currency: 'DA',
    listSeparator: ', ',
    loading: 'Chargement…',
    retry: 'Réessayer',
    save: 'Enregistrer',
    unsave: 'Retirer des favoris',
    addedToSaved: 'Ajouté aux favoris',
    removedFromSaved: 'Retiré des favoris',
    cancel: 'Annuler',
    confirm: 'Confirmer',
    delete: 'Supprimer',
    edit: 'Modifier',
    close: 'Fermer',
    back: 'Retour',
    all: 'Tout',
    new: 'Nouveau',
    optional: 'facultatif',
    search: 'Rechercher',
    filters: 'Filtres',
    reset: 'Réinitialiser',
    resetFilters: 'Effacer les filtres',
    remove: 'Retirer',
    seeAll: 'Voir tout',
    loadMore: 'Voir plus',
    share: 'Partager',
    report: 'Signaler',
    call: 'Appeler',
    whatsapp: 'WhatsApp',
    message: 'Message',
    send: 'Envoyer',
    copy: 'Copier',
    copied: 'Copié',
    linkCopied: 'Lien copié',
    learnMore: 'En savoir plus',
    verified: 'Compte vérifié',
    memberSince: 'Membre depuis {date}',
    offline: 'Vous êtes hors ligne — affichage des dernières données chargées',
    backOnline: 'Connexion rétablie',
  },

  nav: {
    home: 'Accueil',
    jobs: 'Offres',
    post: 'Publier',
    workers: 'Talents',
    account: 'Mon compte',
    messages: 'Messages',
    notifications: 'Notifications',
  },

  time: {
    justNow: 'à l’instant',
  },

  places: {
    wilaya: 'Wilaya',
    commune: 'Commune',
    unknown: 'Lieu non précisé',
    chooseWilaya: 'Choisir la wilaya…',
    chooseCommune: 'Choisir la commune…',
    chooseWilayaFirst: 'Choisissez d’abord la wilaya',
    anyCommune: 'Toutes les communes',
    allWilayas: 'Toutes les wilayas',
    pickRegion: 'Choisir la wilaya',
    searchWilaya: 'Nom ou numéro de wilaya…',
    noMatch: 'Aucune wilaya ne correspond',
    regionLabel: 'Région : {region}. Touchez pour changer',
    browseAll: 'Voir toutes les wilayas',
    communeNeedsWilaya: 'Choisissez une wilaya en haut de la page pour filtrer par commune.',
  },

  salary: {
    negotiable: 'Salaire à négocier',
  },

  home: {
    welcome: 'Bienvenue sur Khedmati 👋',
    greeting: 'Bonjour {name} 👋',
    heroTitle: 'Trouvez un emploi ou un travailleur près de chez vous',
    heroTitleIn: 'Trouvez un emploi ou un travailleur à {region}',
    heroText: 'Des offres, des travailleurs et des artisans dans toutes les wilayas d’Algérie, avec un contact direct par téléphone ou WhatsApp.',
    searchPlaceholder: 'Ex. : vendeur, chauffeur, maçon…',
    postJob: 'Publier une offre',
    createProfile: 'Créer mon profil pro',
    myProfile: 'Mon profil pro',
    stats: {
      activeJobs: 'offres actives',
      availableWorkers: 'talents disponibles',
      employers: 'employeurs',
    },
    categories: 'Parcourir par domaine',
    allCategories: 'Tous les domaines',
    moreCategories: { one: '{count} autre domaine', other: '{count} autres domaines' },
    offers: { one: '{count} offre', other: '{count} offres' },
    urgent: 'Offres urgentes',
    latest: 'Dernières offres',
    workers: 'Travailleurs et artisans disponibles',
    noJobsTitle: 'Aucune offre pour le moment',
    noJobsInTitle: 'Aucune offre à {region} pour le moment',
    noJobsText: 'Publiez la première offre de votre wilaya, c’est gratuit.',
    noWorkersTitle: 'Aucun talent dans l’annuaire pour l’instant',
    safetyTitle: 'Restez prudent',
    safetyText: 'Ne payez jamais pour obtenir un emploi et rencontrez les employeurs dans des lieux publics.',
    safetyLink: 'Conseils de sécurité',
    footer: '© {year} Khedmati — une plateforme algérienne née à Bir El Ater',
  },

  jobs: {
    title: 'Offres d’emploi',
    detailTitle: 'Détails de l’offre',
    searchPlaceholder: 'Poste, métier ou lieu…',
    results: { one: '{count} offre', other: '{count} offres' },
    sort: {
      label: 'Trier',
      recent: 'Plus récentes',
      urgent: 'Urgentes d’abord',
      popular: 'Plus vues',
    },
    filters: {
      category: 'Domaine',
      jobType: 'Type de contrat',
      postedWithin: 'Date de publication',
    },
    posted: {
      any: 'N’importe quand',
      1: 'Dernières 24 h',
      3: '3 derniers jours',
      7: 'Dernière semaine',
      30: 'Dernier mois',
    },
    urgentOnly: 'Offres urgentes uniquement',
    withSalary: 'Salaire indiqué',
    withSalaryHint: 'Masquer les offres « à négocier »',
    showResults: 'Voir les résultats',
    emptyTitle: 'Aucune offre ne correspond',
    emptyText: 'Essayez d’autres mots ou retirez des filtres. Vous pouvez aussi activer une alerte pour les nouvelles offres.',
    alertCta: 'M’alerter des nouvelles offres',
    alertOn: 'Vous serez notifié de chaque nouvelle offre en « {category} » — {scope}',
    urgent: 'Urgent',
    featured: 'À la une',
    state: {
      active: 'Active',
      closed: 'Fermée',
      expired: 'Expirée',
      hidden: 'Masquée',
    },
    stateLabel: 'Statut',
    notice: {
      closed: 'L’employeur a clôturé les candidatures pour cette offre.',
      expired: 'La durée de publication de cette offre est terminée.',
      hidden: 'Cette offre a été masquée par la modération et n’est pas visible publiquement.',
    },
    postedAgo: 'Publiée {time}',
    salary: 'Salaire',
    jobType: 'Type de contrat',
    place: 'Lieu',
    positionsLabel: 'Postes',
    positions: { one: '{count} poste', other: '{count} postes' },
    deadline: 'Date limite',
    interest: 'Intérêt',
    views: { one: '{count} vue', other: '{count} vues' },
    applicants: { one: '{count} candidat', other: '{count} candidats' },
    viewsLabel: 'vues',
    applicantsLabel: 'candidats',
    expiresIn: { one: 'Expire dans {count} jour', other: 'Expire dans {count} jours' },
    description: 'Description du poste',
    requirements: 'Profil recherché',
    messagePoster: 'Écrire à l’employeur',
    safetyNote: 'Ne payez jamais pour obtenir un emploi et signalez toute offre suspecte.',
    similar: 'Offres similaires',
    apply: 'Postuler',
    applied: 'Candidature envoyée',
    appliedOn: 'Vous avez postulé le {date}.',
    notAccepting: 'Cette offre n’accepte plus de candidatures',
    applyTitle: 'Postuler à l’offre',
    applyMessage: 'Message à l’employeur',
    applyMessageHint: 'Présentez-vous en quelques mots : expérience et disponibilité.',
    applyMessagePlaceholder: 'Bonjour, j’ai de l’expérience en…',
    applyPrivacy: 'L’employeur verra votre profil et votre numéro pour vous contacter.',
    sendApplication: 'Envoyer ma candidature',
    applicationSent: 'Candidature envoyée, bonne chance ! 🎉',
    completeProfileTip: 'Complétez votre profil pour augmenter vos chances.',
    completeProfile: 'Compléter',
    whatsappMessage: 'Bonjour, j’ai vu votre offre « {title} » sur Khedmati et elle m’intéresse.',
    viewApplicants: 'Candidats',
    close: 'Clôturer',
    reopen: 'Rouvrir',
    renew: 'Republier',
    statusChanged: {
      close: 'Offre clôturée',
      reopen: 'Offre rouverte',
      renew: 'Offre republiée',
    },
    deleteTitle: 'Supprimer l’offre',
    deleteMessage: 'L’offre et toutes ses candidatures seront supprimées définitivement. Continuer ?',
    deleted: 'Offre supprimée',
  },

  jobForm: {
    newTitle: 'Publier une offre',
    editTitle: 'Modifier l’offre',
    welcome: 'Bienvenue ! Publiez votre première offre en moins de deux minutes.',
    basics: 'Informations principales',
    title: 'Intitulé du poste',
    titleHint: 'Soyez clair, par ex. « Recherche chauffeur poids lourd ».',
    titlePlaceholder: 'Recherche vendeur pour supérette',
    category: 'Domaine',
    choose: 'Choisir…',
    jobType: 'Type de contrat',
    positions: 'Nombre de postes',
    place: 'Lieu',
    address: 'Quartier ou adresse',
    addressPlaceholder: 'Ex. : centre-ville, près du marché',
    pay: 'Rémunération',
    salaryPeriod: 'Mode de paiement',
    salaryMin: 'De',
    salaryMax: 'À',
    details: 'Détails',
    description: 'Description',
    descriptionHint: 'Missions, horaires et toute information utile au candidat.',
    descriptionPlaceholder: 'Nous recherchons une personne sérieuse pour…',
    requirements: 'Profil recherché',
    requirementsPlaceholder: 'Ex. : permis C, un an d’expérience minimum',
    contact: 'Contact',
    contactPhone: 'Téléphone',
    contactWhatsapp: 'WhatsApp',
    contactWhatsappHint: 'Laissez vide si vous n’utilisez pas WhatsApp.',
    options: 'Options de publication',
    isUrgent: 'Offre urgente',
    isUrgentHint: 'Affiche le badge « Urgent » et apparaît dans le filtre dédié.',
    duration: 'Durée de publication',
    days: { one: '{count} jour', other: '{count} jours' },
    publish: 'Publier l’offre',
    saveChanges: 'Enregistrer les modifications',
    published: 'Votre offre est en ligne 🎉',
    updated: 'Modifications enregistrées',
    draftRestored: 'Nous avons restauré votre brouillon',
    discardDraft: 'Effacer',
  },

  applicants: {
    title: 'Candidats',
    filter: 'Filtrer les candidats',
    decision: 'Décision',
    noHeadline: 'Métier non renseigné',
    emptyTitle: 'Aucun candidat pour l’instant',
    emptyText: 'Partagez votre offre sur WhatsApp et Facebook pour toucher plus de monde.',
    emptyFiltered: 'Aucun candidat dans cette liste',
    whatsappMessage: 'Bonjour {name}, au sujet de votre candidature à « {title} » sur Khedmati.',
    actions: {
      shortlisted: 'Présélection',
      accepted: 'Accepter',
      rejected: 'Refuser',
    },
    updated: {
      pending: 'Candidature remise en attente',
      shortlisted: 'Ajouté à la présélection',
      accepted: 'Candidat accepté et notifié',
      rejected: 'Candidature refusée, le candidat est notifié',
    },
  },

  applications: {
    status: {
      pending: 'En attente',
      shortlisted: 'Présélectionné',
      accepted: 'Accepté',
      rejected: 'Non retenu',
    },
  },

  workers: {
    title: 'Travailleurs et artisans',
    searchPlaceholder: 'Métier ou compétence : électricien, plombier…',
    results: { one: '{count} personne', other: '{count} personnes' },
    available: 'Disponible',
    unavailable: 'Indisponible',
    availableOnly: 'Disponibles uniquement',
    experience: { one: '{count} an d’expérience', other: '{count} ans d’expérience' },
    emptyTitle: 'Aucun profil ne correspond',
    emptyText: 'Essayez un autre domaine ou une autre commune, ou élargissez à toutes les wilayas.',
    ctaTitle: 'Proposez vos services',
    ctaText: 'Créez votre profil pro pour être contacté directement par les employeurs.',
  },

  profile: {
    edit: 'Modifier mon profil',
    about: 'À propos',
    work: 'Informations professionnelles',
    field: 'Domaine',
    experience: 'Expérience',
    expectedPay: 'Rémunération souhaitée',
    memberSince: 'Membre depuis',
    skills: 'Compétences',
    activeJobs: 'Offres en cours',
    activeNow: 'En ligne',
    lastSeen: 'Actif {time}',
    emptyTitle: 'Ce profil n’est pas encore complété',
    whatsappMessage: 'Bonjour {name}, j’ai trouvé votre profil sur Khedmati.',
  },

  profileFields: {
    name: 'nom',
    headline: 'métier',
    category: 'domaine',
    bio: 'présentation',
    skills: 'compétences',
    experienceYears: 'années d’expérience',
    whatsapp: 'WhatsApp',
    companyName: 'nom de l’entreprise',
  },

  me: {
    guestTitle: 'Bienvenue sur Khedmati',
    guestText: 'Créez un compte gratuit pour postuler, publier vos offres et contacter directement les gens.',
    viewProfile: 'Mon profil',
    completion: 'Profil complété à {percent} %',
    complete: 'Compléter',
    completionHint: 'Ajoutez : {fields}',
    activity: 'Mon activité',
    account: 'Compte',
    myJobs: 'Mes offres',
    myApplications: 'Mes candidatures',
    saved: 'Favoris',
    editProfile: 'Modifier le profil',
    settings: 'Paramètres',
    settingsFull: 'Paramètres et alertes',
    admin: 'Administration',
    logout: 'Se déconnecter',
    logoutConfirm: 'Se déconnecter de cet appareil ?',
    loggedOut: 'Vous êtes déconnecté',
    ownerBadge: 'Propriétaire',
  },

  editProfile: {
    title: 'Modifier le profil',
    welcome: 'Bonjour {name} ! Complétez votre profil pour être trouvé facilement.',
    personal: 'Informations personnelles',
    name: 'Nom complet',
    role: 'Type de compte',
    companyName: 'Entreprise ou commerce',
    companyPlaceholder: 'Ex. : Entreprise Al Amel BTP',
    workProfile: 'Profil professionnel',
    workProfileHint: 'Ces informations sont visibles par les employeurs quand vous postulez.',
    isListed: 'Afficher mon profil dans l’annuaire',
    isListedHint: 'Tout le monde pourra vous trouver et vous contacter.',
    isAvailable: 'Disponible pour travailler',
    headline: 'Métier',
    headlineHint: 'Une ligne qui résume ce que vous proposez.',
    headlinePlaceholder: 'Ex. : Électricien bâtiment, 6 ans d’expérience',
    category: 'Domaine',
    experienceYears: 'Années d’expérience',
    skills: 'Compétences',
    skillsPlaceholder: 'Tapez une compétence puis Entrée',
    skillsHint: { other: 'Jusqu’à {count} compétences.' },
    skillsLimit: { other: '{count} compétences maximum' },
    bio: 'Présentation',
    bioPlaceholder: 'Votre expérience, vos réalisations, vos disponibilités…',
    expectedPay: 'Rémunération souhaitée',
    expectedPayPlaceholder: 'Ex. : 2 500 DA par jour',
    contact: 'Contact',
    phone: 'Téléphone',
    whatsapp: 'WhatsApp',
    whatsappHint: 'Vide = votre numéro de téléphone.',
    saved: 'Profil enregistré',
  },

  myJobs: {
    title: 'Mes offres',
    tabs: {
      all: 'Toutes',
      active: 'Actives',
      closed: 'Fermées',
      expired: 'Expirées',
      hidden: 'Masquées',
    },
    newApplicants: { one: '{count} nouveau', other: '{count} nouveaux' },
    emptyTitle: 'Aucune offre ici',
    emptyText: 'Publiez votre première offre pour recevoir des candidatures de la région.',
  },

  myApplications: {
    title: 'Mes candidatures',
    appliedAgo: 'Envoyée {time}',
    unavailable: 'Cette offre n’est plus disponible',
    acceptedHint: 'Félicitations ! Contactez l’employeur pour organiser votre début.',
    withdraw: 'Retirer',
    withdrawConfirm: 'Retirer votre candidature à cette offre ?',
    withdrawn: 'Candidature retirée',
    emptyTitle: 'Aucune candidature',
    emptyText: 'Parcourez les offres et postulez en un geste.',
    browse: 'Voir les offres',
  },

  saved: {
    title: 'Favoris',
    jobs: 'Offres',
    workers: 'Talents',
    empty: {
      jobs: 'Aucune offre enregistrée',
      workers: 'Aucun talent enregistré',
    },
    emptyText: 'Touchez l’icône favori pour retrouver ici ce qui vous intéresse.',
    browse: {
      jobs: 'Voir les offres',
      workers: 'Voir les talents',
    },
  },

  notifications: {
    title: 'Notifications',
    markAllRead: 'Tout lire',
    unread: 'Non lue',
    emptyTitle: 'Aucune notification',
    emptyText: 'Vous verrez ici les nouvelles candidatures, les réponses des employeurs et vos alertes.',
    applicationReceived: '{name} a postulé à votre offre « {job} »',
    applicationStatus: {
      shortlisted: 'Votre candidature à « {job} » est présélectionnée',
      accepted: 'Votre candidature à « {job} » est acceptée 🎉',
      rejected: 'Votre candidature à « {job} » n’a pas été retenue',
      pending: 'Votre candidature à « {job} » est en attente',
    },
    jobAlert: 'Nouvelle offre en {category} : « {job} » — {place}',
    jobHidden: 'La modération a masqué votre offre « {job} ». Consultez les conditions d’utilisation.',
    accountVerified: 'Votre compte est vérifié, le badge apparaît près de votre nom ✔',
  },

  messages: {
    emptyTitle: 'Aucun message',
    emptyText: 'Écrivez aux employeurs ou aux artisans depuis leurs pages.',
    browse: 'Voir les offres',
    you: 'Vous :',
    deletedUser: 'Compte supprimé',
    about: 'À propos de : {job}',
    viewJob: 'Voir l’offre',
    placeholder: 'Écrivez votre message…',
    loadOlder: 'Messages précédents',
    startHint: 'Commencez par saluer et vous présenter 👋',
    today: 'Aujourd’hui',
    yesterday: 'Hier',
    sent: 'Envoyé',
    read: 'Lu',
    unavailable: 'Ce compte ne peut plus recevoir de messages.',
    options: 'Options de la conversation',
    viewProfile: 'Voir le profil',
    reportUser: 'Signaler cette personne',
  },

  blocking: {
    block: 'Bloquer cette personne',
    unblock: 'Débloquer',
    confirmTitle: 'Bloquer {name} ?',
    confirmText: 'Cette personne ne pourra plus vous écrire, vous ne recevrez plus ses messages et la conversation disparaîtra de votre messagerie. Elle n’en sera pas informée ; vous pouvez débloquer à tout moment depuis les paramètres.',
    blocked: '{name} est bloqué',
    unblocked: '{name} est débloqué',
    youBlocked: 'Vous avez bloqué cette personne.',
    cannotReply: 'Vous ne pouvez pas envoyer de message dans cette conversation.',
    listTitle: 'Personnes bloquées',
    listHint: 'Ces personnes ne peuvent pas vous écrire et vous ne recevez pas leurs messages.',
    listEmpty: 'Vous n’avez bloqué personne.',
  },

  settings: {
    title: 'Paramètres',
    language: 'Langue',
    theme: 'Apparence',
    themes: {
      system: 'Automatique',
      light: 'Clair',
      dark: 'Sombre',
    },
    alerts: 'Alertes emploi',
    alertsHint: 'Choisissez vos domaines et la wilaya : vous serez notifié de chaque nouvelle offre.',
    alertsWhere: 'Alertes pour',
    saveAlerts: 'Enregistrer les alertes',
    alertsSaved: { one: 'Alertes activées pour {count} domaine — {scope}', other: 'Alertes activées pour {count} domaines — {scope}' },
    alertsOff: 'Alertes emploi désactivées',
    password: 'Mot de passe',
    currentPassword: 'Mot de passe actuel',
    newPassword: 'Nouveau mot de passe',
    changePassword: 'Changer le mot de passe',
    passwordChanged: 'Mot de passe changé, vos autres appareils sont déconnectés',
    dangerZone: 'Zone sensible',
    deleteHint: 'La suppression est définitive : offres, candidatures et messages seront effacés.',
    deleteAccount: 'Supprimer mon compte',
    deleteConfirm: 'Saisissez votre mot de passe pour supprimer définitivement votre compte.',
    deleteForever: 'Supprimer définitivement',
    accountDeleted: 'Votre compte a été supprimé. Bonne continuation !',
    version: 'Khedmati — version {version}',
    ownerClaim: 'Propriétaire ? Saisissez le code propriétaire',
    ownerTitle: 'Code propriétaire',
    ownerText: 'Saisissez le code secret défini sur le serveur (OWNER_CODE) pour obtenir tous les droits d’administration.',
    ownerDone: 'Vous êtes propriétaire de la plateforme 👑 Voici la console d’administration',
  },

  auth: {
    login: 'Se connecter',
    loginTitle: 'Connexion',
    loginSubtitle: 'Entrez votre numéro et votre mot de passe',
    loginButton: 'Se connecter',
    createAccount: 'Créer un compte',
    registerTitle: 'Créer un compte',
    registerSubtitle: 'Gratuit, en moins d’une minute',
    registerButton: 'Créer mon compte',
    roleQuestion: 'Que recherchez-vous ?',
    seekerHint: 'Je cherche un emploi ou je propose mes services',
    employerHint: 'Je veux recruter des travailleurs ou des artisans',
    name: 'Nom complet',
    namePlaceholder: 'Ex. : Mohamed Benali',
    phone: 'Téléphone',
    phoneHint: 'Mobile algérien (05 / 06 / 07). Il sert à vous connecter.',
    password: 'Mot de passe',
    passwordHint: { one: '{count} caractère minimum.', other: '{count} caractères minimum.' },
    show: 'Afficher',
    hide: 'Masquer',
    showPassword: 'Afficher le mot de passe',
    forgot: 'Mot de passe oublié ?',
    noAccount: 'Pas encore de compte ?',
    haveAccount: 'Déjà inscrit ?',
    agreePrefix: 'J’ai lu et j’accepte les',
    agreeAnd: ' et la ',
    agreeSuffix: '.',
    ownerToggle: 'Je suis le propriétaire (j’ai le code propriétaire)',
    ownerCode: 'Code propriétaire',
    ownerCodeHint: 'Le code secret défini sur le serveur (OWNER_CODE). Laissez vide si vous n’êtes pas le propriétaire.',
    ownerWelcome: 'Bienvenue {name} ! Vous êtes maintenant propriétaire de la plateforme 👑',
    wilaya: 'Votre wilaya',
    wilayaHint: 'Nous affichons d’abord les offres de votre wilaya ; vous pourrez en changer à tout moment.',
    welcome: 'Bienvenue {name} ! Votre compte est créé 🎉',
    welcomeBack: 'Bon retour {name}',
    loginToSave: 'Connectez-vous pour enregistrer des favoris',
    forgotTitle: 'Mot de passe oublié',
    forgotText: 'Pour protéger votre compte, le mot de passe est réinitialisé par l’équipe après vérification de votre identité.',
    forgotStep1: 'Écrivez à l’équipe depuis le numéro de votre compte.',
    forgotStep2: 'Vous recevrez un mot de passe temporaire après vérification.',
    forgotStep3: 'Connectez-vous puis changez-le dans les paramètres.',
    contactSupport: 'Contacter l’équipe sur WhatsApp',
    forgotWhatsapp: 'Bonjour, j’ai oublié le mot de passe de mon compte Khedmati.',
  },

  report: {
    title: 'Signaler un contenu',
    intro: 'Aidez-nous à garder Khedmati sûr. L’auteur ne saura pas qui l’a signalé.',
    reason: 'Motif',
    details: 'Précisions',
    detailsPlaceholder: 'Expliquez brièvement ce qui s’est passé…',
    submit: 'Envoyer le signalement',
    sent: 'Merci ! Votre signalement sera examiné rapidement.',
  },

  pwa: {
    installTitle: 'Installez Khedmati sur votre téléphone',
    installText: 'Ouvrez-le d’un geste depuis l’écran d’accueil, même avec une connexion faible.',
    install: 'Installer',
    installed: 'Khedmati est installé sur votre appareil',
    iosTitle: 'Ajouter Khedmati à l’écran d’accueil',
    iosStep1: 'Touchez le bouton Partager en bas de Safari.',
    iosStep2: 'Choisissez « Sur l’écran d’accueil ».',
    iosStep3: 'Touchez « Ajouter » : Khedmati apparaît avec vos applications.',
    updateReady: 'Une nouvelle version de Khedmati est prête',
    update: 'Mettre à jour',
  },

  admin: {
    title: 'Administration',
    tabs: {
      overview: 'Vue d’ensemble',
      reports: 'Signalements',
      users: 'Utilisateurs',
      jobs: 'Offres',
    },
    kpi: {
      users: 'utilisateurs',
      newUsers: 'nouveaux cette semaine',
      listedWorkers: 'talents dans l’annuaire',
      employers: 'employeurs',
      activeJobs: 'offres actives',
      newJobs: 'offres cette semaine',
      applications: 'candidatures',
      messages: 'messages',
      openReports: 'signalements ouverts',
      banned: 'comptes bannis',
      views: 'vues des offres',
      hiddenJobs: 'offres masquées',
    },
    reportFilters: {
      open: 'Ouverts',
      resolved: 'Traités',
      dismissed: 'Rejetés',
    },
    userFilters: {
      all: 'Tous',
      banned: 'Bannis',
      verified: 'Vérifiés',
      unverified_employers: 'Employeurs non vérifiés',
      admins: 'Administrateurs',
    },
    jobFilters: {
      all: 'Toutes',
      active: 'Actives',
      closed: 'Fermées',
      expired: 'Expirées',
      hidden: 'Masquées',
      featured: 'À la une',
    },
    flags: {
      owner: 'Propriétaire',
      admin: 'Admin',
      banned: 'Banni',
      listed: 'Annuaire',
    },
    byWilaya: 'Activité par wilaya',
    makeAdmin: 'Nommer modérateur',
    removeAdmin: 'Retirer la modération',
    makeAdminConfirm: 'Cette personne pourra traiter les signalements, masquer des offres et bannir des comptes. Continuer ?',
    removeAdminConfirm: 'Ce compte perdra ses droits de modération. Continuer ?',
    searchUsers: 'Nom ou téléphone…',
    searchJobs: 'Rechercher une offre…',
    empty: 'Rien à afficher',
    targetDeleted: 'Contenu supprimé',
    reportedBy: 'Signalé par : {name}',
    hideJob: 'Masquer l’offre',
    banUser: 'Bannir le compte',
    resolve: 'Traité',
    dismiss: 'Rejeter',
    hide: 'Masquer',
    unhide: 'Afficher',
    feature: 'Mettre à la une',
    unfeature: 'Retirer de la une',
    verify: 'Vérifier',
    unverify: 'Retirer la vérification',
    ban: 'Bannir',
    unban: 'Lever le bannissement',
    banConfirm: 'Ce compte sera déconnecté et ses offres masquées. Continuer ?',
    resetPassword: 'Mot de passe temporaire',
    resetConfirm: 'Un mot de passe temporaire sera créé et l’utilisateur déconnecté de tous ses appareils.',
    tempPasswordTitle: 'Mot de passe temporaire',
    tempPasswordText: 'Transmettez-le au titulaire après vérification et demandez-lui de le changer dès sa connexion.',
    done: 'C’est fait',
    jobHidden: 'Offre masquée, son auteur est notifié',
    userBanned: 'Compte banni',
  },

  pages: {
    about: {
      title: 'À propos de Khedmati',
      body: `Khedmati est une plateforme algérienne gratuite qui réunit employeurs et chercheurs d’emploi dans toutes les wilayas et communes du pays, de Bir El Ater à Tamanrasset.

## Ce que propose Khedmati
- Des offres d’emploi dans tous les domaines : bâtiment, commerce, agriculture, transport, mines, industrie et artisanat.
- Une recherche par wilaya et par commune : 69 wilayas et 1 541 communes.
- Un annuaire où travailleurs et artisans présentent leurs services.
- Une candidature en un geste et le suivi de chaque demande.
- Un contact direct par téléphone, WhatsApp ou messagerie intégrée.
- Des alertes pour les nouvelles offres dans vos domaines et votre wilaya.

## Pourquoi Khedmati ?
Parce que les offres d’emploi se perdent entre les publications Facebook et les groupes WhatsApp. Khedmati les rassemble en un seul endroit, clair, facile à fouiller et proche de chez vous.

## Nous contacter
Pour une suggestion ou un problème, utilisez le bouton de signalement ou écrivez à l’administration.`,
    },
    safety: {
      title: 'Conseils de sécurité',
      body: `Votre sécurité passe avant tout. Suivez ces conseils pour chercher un emploi ou recruter.

## Pour les chercheurs d’emploi
- Ne payez jamais pour obtenir un emploi ou « réserver » un poste : une offre qui demande de l’argent est une arnaque.
- Ne remettez pas vos documents originaux (carte d’identité, passeport) ; une copie suffit.
- Pour un premier rendez-vous, choisissez un lieu public ou l’adresse annoncée de l’entreprise.
- Mettez-vous d’accord sur le salaire et les horaires avant de commencer.

## Pour les employeurs
- Vérifiez l’identité et l’expérience du candidat avant de vous engager.
- Ne demandez pas de données bancaires ni de documents sensibles par message.
- Respectez les droits du travailleur et la législation du travail.

## Si quelqu’un vous importune
- Touchez « Bloquer cette personne » dans la conversation ou sur son profil : elle ne pourra plus vous écrire.
- Utilisez « Signaler » sur l’offre, le profil ou la conversation. L’administration examine chaque signalement, masque les contenus abusifs et bannit leurs auteurs.`,
    },
    terms: {
      title: 'Conditions d’utilisation',
      body: `En utilisant Khedmati, vous acceptez les conditions suivantes.

## Le compte
- Vous devez avoir au moins 18 ans.
- Les informations fournies doivent être exactes et le numéro de téléphone doit être le vôtre.
- Vous êtes responsable de la confidentialité de votre mot de passe et de toute activité sur votre compte.

## Les contenus publiés
- Vous êtes responsable des offres, profils et messages que vous publiez.
- Les offres fictives, trompeuses ou demandant de l’argent aux candidats sont interdites.
- Le harcèlement, les menaces et les contenus offensants, discriminatoires ou contraires à la loi algérienne sont interdits.
- La promotion d’activités illégales ou du travail de mineurs contraire à la loi est interdite.

## Signalement et blocage
- Vous pouvez signaler toute offre, tout compte ou toute conversation abusive, et bloquer toute personne.
- L’administration examine les signalements et peut masquer tout contenu abusif et bannir les comptes en infraction sans préavis.

## Responsabilité
Khedmati facilite seulement la mise en relation et n’est partie à aucun accord de travail entre utilisateurs. Vérifiez avant tout engagement.

## Modifications
Ces conditions peuvent évoluer ; continuer à utiliser la plateforme vaut acceptation de la version à jour.`,
    },
    privacy: {
      title: 'Politique de confidentialité',
      body: `Nous respectons votre vie privée et collectons le minimum de données, conformément à la loi 18-07 modifiée et complétée relative à la protection des personnes physiques dans le traitement des données à caractère personnel.

## Ce que nous collectons
- Votre nom, votre numéro de téléphone et votre mot de passe (stocké chiffré, illisible par quiconque).
- Votre wilaya et votre commune, et les informations de profil que vous choisissez d’ajouter.
- Les offres, candidatures, messages et signalements que vous créez sur la plateforme.
- Des données techniques nécessaires au service et à sa sécurité : type de navigateur, adresse IP et date de dernière activité.

## Pourquoi nous les utilisons
- Pour faire fonctionner votre compte, afficher offres et profils, acheminer messages et alertes.
- Pour protéger les utilisateurs : lutter contre la fraude et le harcèlement, traiter les signalements.
- Nous ne les utilisons pas à des fins publicitaires et ne les vendons à personne.

## Qui voit vos données ?
- Votre profil n’est public que si vous activez « Afficher mon profil dans l’annuaire ».
- Quand vous postulez, l’employeur voit votre profil et votre numéro.
- Les messages ne sont visibles que par les deux participants ; les modérateurs ne les consultent que pour traiter un signalement.

## Protection et conservation
- Les données transitent chiffrées entre votre appareil et nos serveurs (HTTPS).
- Nous les conservons tant que votre compte existe ; les anciennes notifications sont supprimées automatiquement.
- À la suppression du compte, ses données sont effacées immédiatement de la base, et des sauvegardes sous 30 jours.

## Vos droits
Vous pouvez consulter et modifier vos informations à tout moment, et supprimer définitivement votre compte depuis les paramètres ou sur demande (voir la page « Supprimer le compte »).`,
    },
    accountDeletion: {
      title: 'Supprimer le compte',
      body: `Vous pouvez supprimer définitivement votre compte Khedmati à tout moment.

## Depuis l’application
- Ouvrez « Mon compte » puis « Paramètres et alertes ».
- Touchez « Supprimer mon compte » en bas de la page.
- Confirmez avec votre mot de passe : le compte est supprimé immédiatement.

## Sans ouvrir l’application
Écrivez à l’administration depuis le numéro de téléphone de votre compte et demandez sa suppression. Après vérification du numéro, le compte est supprimé sous 7 jours au plus.

## Ce qui est supprimé
- Votre compte, votre profil et votre mot de passe.
- Les offres que vous avez publiées et les candidatures associées.
- Vos candidatures, messages, favoris, notifications et votre liste de blocage.

## Ce qui est conservé
- Les signalements que vous avez envoyés restent, sans votre nom, pour protéger les autres utilisateurs.
- Les traces éventuelles dans les sauvegardes sont effacées sous 30 jours.`,
      action: 'Supprimer mon compte',
    },
    contact: {
      title: 'Nous contacter',
      whatsapp: 'WhatsApp',
      email: 'E-mail',
    },
  },

  notFound: {
    title: 'Page introuvable',
    text: 'Cette page a peut-être été supprimée ou le lien est incorrect.',
    home: 'Retour à l’accueil',
  },

  errors: {
    default: 'Une erreur inattendue s’est produite, réessayez',
    NETWORK: 'Impossible de joindre le serveur, vérifiez votre connexion',
    OFFLINE: 'Vous êtes hors ligne',
    INTERNAL_ERROR: 'Erreur du serveur, réessayez dans un instant',
    RATE_LIMITED: 'Trop de tentatives, patientez un peu',
    AUTH_REQUIRED: 'Connectez-vous pour continuer',
    INVALID_CREDENTIALS: 'Numéro ou mot de passe incorrect',
    ACCOUNT_BANNED: 'Ce compte est suspendu. Contactez l’équipe.',
    PHONE_TAKEN: 'Ce numéro est déjà inscrit, essayez de vous connecter',
    VALIDATION_FAILED: 'Vérifiez les champs indiqués',
    JOB_NOT_FOUND: 'Cette offre n’existe pas ou a été supprimée',
    USER_NOT_FOUND: 'Ce compte n’existe pas',
    PROFILE_PRIVATE: 'Ce profil est privé',
    ALREADY_APPLIED: 'Vous avez déjà postulé à cette offre',
    OWN_JOB: 'Vous ne pouvez pas postuler à votre propre offre',
    JOB_NOT_ACTIVE: 'Cette offre n’accepte plus de candidatures',
    CANNOT_WITHDRAW: 'Impossible de retirer une candidature déjà traitée',
    APPLICATION_NOT_FOUND: 'Candidature introuvable',
    JOB_EXPIRED: 'L’offre a expiré, utilisez « Republier »',
    JOB_STILL_ACTIVE: 'L’offre est encore active',
    JOB_HIDDEN: 'Cette offre est masquée par la modération',
    JOB_NOT_CLOSED: 'L’offre n’est pas fermée',
    JOB_ALREADY_CLOSED: 'L’offre est déjà fermée',
    ALREADY_REPORTED: 'Vous avez déjà signalé ce contenu',
    CANNOT_REPORT_SELF: 'Vous ne pouvez pas vous signaler vous-même',
    TARGET_NOT_FOUND: 'Contenu introuvable',
    RECIPIENT_UNAVAILABLE: 'Ce compte n’est plus disponible',
    CONVERSATION_NOT_FOUND: 'Conversation introuvable',
    SAVED_LIMIT_REACHED: 'Nombre maximal de favoris atteint',
    ADMIN_ONLY: 'Page réservée aux administrateurs',
    CANNOT_MODERATE_ADMIN: 'Action impossible sur un administrateur',
    REPORT_NOT_FOUND: 'Signalement introuvable',
    BAD_ORIGIN: 'Requête non autorisée',
    PAYLOAD_TOO_LARGE: 'Contenu trop long',
    BLOCKED: 'Impossible d’écrire : l’un de vous a bloqué l’autre',
    CANNOT_BLOCK_SELF: 'Vous ne pouvez pas vous bloquer vous-même',
    BLOCK_LIMIT_REACHED: 'Nombre maximal de blocages atteint',
    OWNER_ONLY: 'Action réservée au propriétaire de la plateforme',
    CANNOT_CHANGE_OWNER: 'Les droits du propriétaire ne peuvent pas être modifiés',
    USER_BANNED: 'Ce compte est banni',
  },

  fieldErrors: {
    required: 'Ce champ est obligatoire',
    too_short: 'Trop court',
    too_long: 'Trop long',
    invalid: 'Valeur invalide',
    invalid_phone: 'Numéro invalide',
    invalid_mobile: 'Entrez un numéro mobile valide (05, 06 ou 07)',
    too_small: 'Valeur trop petite',
    too_large: 'Valeur trop grande',
    too_many: 'Trop d’éléments',
    item_too_long: 'Un élément est trop long',
    less_than_min: 'Doit être supérieur au minimum',
    required_for_listing: 'Requis pour apparaître dans l’annuaire',
    wrong_password: 'Mot de passe incorrect',
    must_accept: 'Vous devez accepter les conditions d’utilisation et la politique de confidentialité',
    wrong_code: 'Code incorrect',
    wrong_wilaya: 'Cette commune n’appartient pas à la wilaya choisie',
  },
};
