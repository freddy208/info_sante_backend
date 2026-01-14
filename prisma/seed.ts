/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  PrismaClient,
  AdminRole,
  AnnouncementStatus,
  ArticleStatus,
  AdviceStatus,
  Priority,
  OrganizationStatus,
  OrganizationType,
  TargetAudience,
  UserStatus,
  AdminStatus,
  Prisma,
  ContentType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Début du seeding...\n');

  // ============================================
  // 1. CATÉGORIES (OPTIMISÉES POUR LES CONSEILS)
  // ============================================
  console.log('📂 Création des catégories optimisées...');

  const categories = [
    {
      name: 'Vaccination',
      slug: 'vaccination',
      description: 'Campagnes de vaccination, rappels et calendriers',
      icon: '💉',
      color: '#10B981',
      order: 1,
    },
    {
      name: 'Paludisme (Malaria)',
      slug: 'paludisme',
      description: 'Prévention, symptômes et traitement du paludisme',
      icon: '🦟',
      color: '#F59E0B',
      order: 2,
    },
    {
      name: 'Hygiène & Prévention',
      slug: 'hygiene-prevention',
      description: "Conseils d'hygiène, lavage des mains et salubrité",
      icon: '🧼',
      color: '#6B7280',
      order: 3,
    },
    {
      name: 'Nutrition',
      slug: 'nutrition',
      description: 'Equilibre alimentaire, régimes et vitamines',
      icon: '🍎',
      color: '#84CC16',
      order: 4,
    },
    {
      name: 'Santé maternelle',
      slug: 'sante-maternelle',
      description: 'Grossesse, accouchement et post-partum',
      icon: '🤰',
      color: '#EC4899',
      order: 5,
    },
    {
      name: 'Santé infantile',
      slug: 'sante-infantile',
      description: 'Croissance, développement et soins des enfants',
      icon: '👶',
      color: '#3B82F6',
      order: 6,
    },
    {
      name: 'Maladies chroniques',
      slug: 'maladies-chroniques',
      description: 'Diabète, hypertension, asthme et suivi au long cours',
      icon: '💊',
      color: '#8B5CF6',
      order: 7,
    },
    {
      name: 'Urgences',
      slug: 'urgences',
      description: "Gestes de premiers secours et numéros d'urgence",
      icon: '🚨',
      color: '#EF4444',
      order: 8,
    },
    {
      name: 'Consultation gratuite',
      slug: 'consultation-gratuite',
      description: 'Journées médicales gratuites et consultations de proximité',
      icon: '🩺',
      color: '#0EA5E9',
      order: 9,
    },
    {
      name: 'Don de sang',
      slug: 'don-de-sang',
      description: 'Campagnes de collecte et donneurs de sang',
      icon: '🩸',
      color: '#DC2626',
      order: 10,
    },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: category,
    });
  }
  console.log(`✅ ${categories.length} catégories créées\n`);

  // ============================================
  // RÉCUPÉRATION DES IDs
  // ============================================
  const catVaccination = await prisma.category.findUnique({
    where: { slug: 'vaccination' },
  });
  const catUrgences = await prisma.category.findUnique({
    where: { slug: 'urgences' },
  });
  const catMaladies = await prisma.category.findUnique({
    where: { slug: 'maladies-chroniques' },
  });

  // IDs pour les Conseils
  const catPaludisme = await prisma.category.findUnique({
    where: { slug: 'paludisme' },
  });
  const catHygiene = await prisma.category.findUnique({
    where: { slug: 'hygiene-prevention' },
  });
  const catNutrition = await prisma.category.findUnique({
    where: { slug: 'nutrition' },
  });
  const catMaternelle = await prisma.category.findUnique({
    where: { slug: 'sante-maternelle' },
  });

  // ============================================
  // 2. SPÉCIALITÉS MÉDICALES
  // ============================================
  console.log('🩺 Création des spécialités médicales...');
  const specialties = [
    {
      name: 'Cardiologie',
      slug: 'cardiologie',
      description: 'Maladies du cœur et des vaisseaux',
      icon: '❤️',
    },
    {
      name: 'Pédiatrie',
      slug: 'pediatrie',
      description: 'Santé des enfants et nourrissons',
      icon: '👶',
    },
    {
      name: 'Médecine générale',
      slug: 'medecine-generale',
      description: 'Soins de santé généraux',
      icon: '🩺',
    },
    {
      name: 'Urgences',
      slug: 'urgences',
      description: 'Soins urgents 24/7',
      icon: '🚑',
    },
  ];

  for (const specialty of specialties) {
    await prisma.specialty.upsert({
      where: { slug: specialty.slug },
      update: {},
      create: specialty,
    });
  }
  console.log(`✅ ${specialties.length} spécialités créées\n`);

  // ============================================
  // 3. ADMIN & USERS
  // ============================================
  console.log('🔐 Création des comptes admin et test...');

  const adminRoleTemplates: Array<{
    role: AdminRole;
    name: string;
    description: string;
    permissions: Record<string, string[]>;
  }> = [
    {
      role: 'SUPER_ADMIN',
      name: 'Super Administrateur',
      description: 'Accès complet',
      permissions: {
        ORGANIZATION: ['VIEW_ORGANIZATIONS'],
        USER: ['VIEW_USERS'],
        ANNOUNCEMENT: ['MODERATE_ANNOUNCEMENT'],
      },
    },
  ];

  for (const template of adminRoleTemplates) {
    await prisma.adminRoleTemplate.upsert({
      where: { role: template.role },
      update: {},
      create: template,
    });
  }

  const hashedPassword = await bcrypt.hash('SuperAdmin@2025!', 10);
  const superAdmin = await prisma.administrator.upsert({
    where: { email: 'admin@infosante.cm' },
    update: {},
    create: {
      email: 'admin@infosante.cm',
      password: hashedPassword,
      firstName: 'Super',
      lastName: 'Admin',
      role: AdminRole.SUPER_ADMIN,
      isActive: true,
      status: AdminStatus.ACTIVE,
    },
  });

  const testOrgPassword = await bcrypt.hash('Hospital@2025!', 10);
  const testOrganization = await prisma.organization.upsert({
    where: { email: 'hopital.test@infosante.cm' },
    update: {},
    create: {
      name: 'Hôpital Général de Test',
      email: 'hopital.test@infosante.cm',
      password: testOrgPassword,
      type: OrganizationType.HOSPITAL_PUBLIC,
      phone: '+237670000000',
      address: 'Rue de la Santé, Yaoundé',
      city: 'Yaoundé',
      region: 'Centre',
      registrationNumber: 'TEST-001',
      isVerified: true,
      verifiedAt: new Date(),
      verifiedBy: superAdmin.id,
      status: OrganizationStatus.ACTIVE,
      latitude: new Prisma.Decimal(3.848),
      longitude: new Prisma.Decimal(11.5021),
    },
  });

  const testUserPassword = await bcrypt.hash('User@2025!1', 10);
  await prisma.user.upsert({
    where: { email: 'user.test@infosante.cm' },
    update: {},
    create: {
      email: 'user.test@infosante.cm',
      password: testUserPassword,
      firstName: 'Jean',
      lastName: 'Mbarga',
      city: 'Yaoundé',
      region: 'Centre',
      isEmailVerified: true,
      status: UserStatus.ACTIVE,
    },
  });
  console.log('✅ Comptes créés\n');

  // ============================================
  // 4. ORGANISATIONS RÉELLES (POUR LA CARTE)
  // ============================================
  console.log('🏥 Création des organisations réelles (Cameroon)...');

  const realOrgsData = [
    {
      name: 'Hôpital Central de Yaoundé',
      email: 'hcy@infosante.cm',
      password: testOrgPassword,
      type: OrganizationType.HOSPITAL_PUBLIC,
      phone: '+237 222 23 12 45',
      address: 'Boulevard du 20 Mai, Yaoundé',
      city: 'Yaoundé',
      region: 'Centre',
      registrationNumber: 'HCY-001',
      latitude: new Prisma.Decimal(3.8736),
      longitude: new Prisma.Decimal(11.5021),
      isVerified: true,
      verifiedBy: superAdmin.id,
      status: OrganizationStatus.ACTIVE,
    },
    {
      name: 'Hôpital Laquintinie (Douala)',
      email: 'laquintinie@infosante.cm',
      password: testOrgPassword,
      type: OrganizationType.HOSPITAL_PUBLIC,
      phone: '+237 233 42 22 11',
      address: 'Boulevard de la Liberté, Douala',
      city: 'Douala',
      region: 'Littoral',
      registrationNumber: 'LAQ-001',
      latitude: new Prisma.Decimal(4.0483),
      longitude: new Prisma.Decimal(9.7043),
      isVerified: true,
      verifiedBy: superAdmin.id,
      status: OrganizationStatus.ACTIVE,
    },
    {
      name: 'CHU Yaoundé',
      email: 'chu@infosante.cm',
      password: testOrgPassword,
      type: OrganizationType.HOSPITAL_PUBLIC,
      phone: '+237 222 21 55 66',
      address: 'Quartier Efoulan, Yaoundé',
      city: 'Yaoundé',
      region: 'Centre',
      registrationNumber: 'CHU-YDE',
      latitude: new Prisma.Decimal(3.84),
      longitude: new Prisma.Decimal(11.54),
      isVerified: true,
      verifiedBy: superAdmin.id,
      status: OrganizationStatus.ACTIVE,
    },
    {
      name: 'Clinique des Nations (Douala)',
      email: 'clinique.nations@infosante.cm',
      password: testOrgPassword,
      type: OrganizationType.CLINIC,
      phone: '+237 699 00 11 22',
      address: 'Akwa, Douala',
      city: 'Douala',
      region: 'Littoral',
      registrationNumber: 'CDN-002',
      latitude: new Prisma.Decimal(4.05),
      longitude: new Prisma.Decimal(9.7),
      isVerified: true,
      verifiedBy: superAdmin.id,
      status: OrganizationStatus.ACTIVE,
    },
    {
      name: 'Pharmacie du Centre (Yaoundé)',
      email: 'pharmacie.centre@infosante.cm',
      password: testOrgPassword,
      type: OrganizationType.DISPENSARY,
      phone: '+237 677 11 22 33',
      address: 'Centre Ville, Yaoundé',
      city: 'Yaoundé',
      region: 'Centre',
      registrationNumber: 'PH-005',
      latitude: new Prisma.Decimal(3.875),
      longitude: new Prisma.Decimal(11.505),
      isVerified: true,
      verifiedBy: superAdmin.id,
      status: OrganizationStatus.ACTIVE,
    },
  ];

  const createdOrgs: any[] = [];
  for (const org of realOrgsData) {
    const created = await prisma.organization.upsert({
      where: { email: org.email },
      update: {},
      create: org,
    });
    createdOrgs.push(created);
  }
  console.log(`✅ ${createdOrgs.length} organisations réelles créées\n`);
  // ============================================
  // 5. ANNONCES (ALERTES & ÉVÉNEMENTS)
  // ============================================
  console.log('📢 Création des alertes sanitaires et événements...');

  // Assurons-nous que les catégories existent
  let createdAnnouncements: any[] = []; // Pour stocker les annonces créées et y lier les localisations

  if (catUrgences && catVaccination && catHygiene) {
    const announcementsData = [
      {
        // 1. ALERTE (Information pure) -> Pas de localisation
        organizationId: createdOrgs[1].id, // Laquintinie
        categoryId: catUrgences.id,
        title: 'Alerte Épidémie de Choléra - Zone Littoral',
        slug: 'alerte-cholera-littoral',
        content:
          "Une augmentation des cas de choléra a été notifiée dans la région de Douala. Veuillez respecter strictement les mesures d'hygiène et consommer uniquement de l'eau traitée.",
        excerpt: "Augmentation des cas à Douala. Respectez l'hygiène.",
        featuredImage: 'covid-symptoms',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours
        isFree: true,
        cost: null,
        requiresRegistration: false,
        capacity: null,
        registeredCount: 0,
        priority: Priority.URGENT,
        targetAudience: [TargetAudience.ALL],
        status: AnnouncementStatus.PUBLISHED,
        publishedAt: new Date(),
      },
      {
        // 2. ÉVÉNEMENT GRATUIT (Avec inscription) -> AVEC LOCALISATION
        organizationId: createdOrgs[0].id, // HCY
        categoryId: catVaccination.id,
        title: 'Journée Spéciale : Vaccination Fièvre Jaune',
        slug: 'journee-vaccination-fievre-jaune',
        content: `
          Le Ministère de la Santé organise une journée spéciale de vaccination au sein de l'hôpital.
          
          📍 Lieu : Hall Principal Hôpital Central
          🕒 Horaires : 08h00 - 16h00
          
          Cible : 9 mois à 60 ans.
          Vaccination gratuite mais places limitées à 100 personnes.
        `,
        excerpt: 'Vaccination gratuite. Places limitées, inscrivez-vous !',
        featuredImage: 'child-vaccination',
        startDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // Dans 5 jours
        endDate: new Date(
          Date.now() + 5 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000,
        ),
        isFree: true,
        cost: null,
        requiresRegistration: true,
        capacity: 100,
        registeredCount: 12,
        priority: Priority.HIGH,
        targetAudience: [
          TargetAudience.ADULTS,
          TargetAudience.INFANTS,
          TargetAudience.ALL,
        ],
        status: AnnouncementStatus.PUBLISHED,
        publishedAt: new Date(),
      },
      {
        // 3. ÉVÉNEMENT PAYANT (Formation) -> AVEC LOCALISATION
        organizationId: createdOrgs[3].id, // Clinique des Nations
        categoryId: catHygiene.id,
        title: 'Formation : Gestes de Premiers Secours (PSC1)',
        slug: 'formation-premiers-secours-douala',
        content: `
          Apprenez à sauver des vies. Formation certifiante de 4 heures.
          Lieu : Salle de conférence de la Clinique des Nations, Akwa.
          Participation : 15 000 FCFA.
        `,
        excerpt: 'Formation aux gestes de premiers secours. 15 000 FCFA.',
        featuredImage: 'hiv-awareness',
        startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        endDate: new Date(
          Date.now() + 14 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000,
        ),
        isFree: false,
        cost: new Prisma.Decimal(15000),
        requiresRegistration: true,
        capacity: 20,
        registeredCount: 5,
        priority: Priority.HIGH,
        targetAudience: [TargetAudience.ADULTS, TargetAudience.ELDERLY],
        status: AnnouncementStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    ];

    for (const ann of announcementsData) {
      const created = await prisma.announcement.upsert({
        where: { slug: ann.slug },
        update: {},
        create: ann,
      });
      createdAnnouncements.push(created);
    }
    console.log(`✅ ${announcementsData.length} annonces/événements créées\n`);

    // ============================================
    // 5b. LOCALISATIONS (LINKED TO EVENTS)
    // ============================================
    console.log('📍 Ajout des localisations aux événements...');

    const locations = [
      {
        // Localisation pour la Vaccination (HCY)
        contentId: createdAnnouncements.find(
          (a) => a.slug === 'journee-vaccination-fievre-jaune',
        ).id,
        address: 'Hall Principal Hôpital Central, Boulevard du 20 Mai, Yaoundé',
        city: 'Yaoundé',
        region: 'Centre',
        latitude: new Prisma.Decimal(3.8736), // Coordonnées approximatives HCY
        longitude: new Prisma.Decimal(11.5021),
        formattedAddress:
          'Hall Principal Hôpital Central, Blvd du 20 Mai, Yaoundé, Cameroon',
        additionalInfo:
          'Accueil principal, au rez-de-chaussée. Vestiaire disponible.',
      },
      {
        // Localisation pour la Formation (Clinique des Nations)
        contentId: createdAnnouncements.find(
          (a) => a.slug === 'formation-premiers-secours-douala',
        ).id,
        address: 'Salle de conférence, Clinique des Nations, Akwa, Douala',
        city: 'Douala',
        region: 'Littoral',
        latitude: new Prisma.Decimal(4.05), // Coordonnées approximatives Akwa
        longitude: new Prisma.Decimal(9.704),
        formattedAddress: 'Akwa, Blvd de la Liberté, Douala, Cameroon',
        additionalInfo: "Prendre l'ascenseur côté gauche, 2ème étage.",
      },
    ];

    for (const loc of locations) {
      await prisma.location.create({
        data: {
          contentType: ContentType.ANNOUNCEMENT, // IMPORTANT: On le lie à une annonce
          ...loc,
        },
      });
    }
    console.log(`✅ ${locations.length} localisations créées\n`);
  }
  // ============================================
  // 6. ARTICLES (CONTENU LONG)
  // ============================================
  console.log('📰 Création des articles santé...');

  // On utilise les catégories définies plus haut (Nutrition, Maladies, Maternelle)
  if (catMaladies && catNutrition && catMaternelle) {
    const articles = [
      {
        organizationId: createdOrgs[0].id, // HCY (Yaoundé)
        categoryId: catNutrition.id,
        title: "L'alimentation équilibrée : Mythes et Réalités camerounaises",
        slug: 'alimentation-equilibree-mystes',
        content: `
          L'alimentation est la base de la santé. Au Cameroun, nous avons accès à une grande variété d'aliments, mais comment bien choisir ?
          
          1. Les féculents : Privilégiez le manioc, le macabo ou le plantain bouilli, plutôt que frits, pour réduire les graisses.
          2. Les protéines : Le poisson frais ou fumé est excellent pour la mémoire. Le poulet grillé est à privilégier au frit.
          3. Les légumes : Le gombo, les feuilles de manioc et de bitterleaf sont riches en fibres et vitamines.
          4. L'hydratation : Remplacez les sodas sucrés par de l'eau ou du jus de fruits naturel.
        `,
        excerpt:
          'Apprenez à composer vos repas avec les produits locaux pour une meilleure santé.',
        featuredImage: 'malaria-prevention',
        thumbnailImage: 'https://via.placeholder.com/200x200?text=Nutrition',
        author: 'Nutritionniste Sarah N.',
        readingTime: 4,
        tags: ['nutrition', 'sante', 'bien-manger'],
        viewsCount: 150,
        sharesCount: 12,
        commentsCount: 3,
        reactionsCount: 30,
        isFeatured: true, // Article mis en avant (Badge sur le frontend)
        status: ArticleStatus.PUBLISHED,
        publishedAt: new Date('2023-11-01'),
      },
      {
        organizationId: createdOrgs[1].id, // Laquintinie (Douala)
        categoryId: catMaladies.id,
        title: 'Hypertension Artérielle : Le tueur silencieux',
        slug: 'hypertension-tueur-silencieux',
        content: `
          L'hypertension ne fait pas mal, c'est pourquoi elle est dangereuse. Souvent découverte tardivement, elle peut entraîner des AVC ou des crises cardiaques.
          
          Signes d'alerte (quand ils existent) :
          - Maux de tête fréquents (surtout le matin).
          - Bourdonnements d'oreilles.
          - Vision trouble.
          
          Que faire ?
          1. Faites mesurer votre tension régulièrement (pharmacies, centres de santé).
          2. Réduisez votre consommation de sel.
          3. Bougez 30 minutes par jour.
        `,
        excerpt:
          "Comment se protéger de l'HTA ? Les conseils du service cardiologie.",
        featuredImage: 'medicinal-plants',
        thumbnailImage: 'https://via.placeholder.com/200x200?text=Coeur',
        author: 'Dr. Kouam Jean',
        readingTime: 6,
        tags: ['hypertension', 'coeur', 'prevention', 'cardiologie'],
        viewsCount: 320,
        sharesCount: 45,
        commentsCount: 10,
        reactionsCount: 85,
        isFeatured: true, // Mis en avant
        status: ArticleStatus.PUBLISHED,
        publishedAt: new Date('2023-11-05'),
      },
      {
        organizationId: createdOrgs[2].id, // CHU Yaoundé
        categoryId: catMaternelle.id,
        title: 'Allaitement maternel : Les 6 premiers mois',
        slug: 'allaitement-maternel-6-mois',
        content: `
          L'Organisation Mondiale de la Santé recommande un allaitement exclusif jusqu'à 6 mois.
          
          Pourquoi c'est important ?
          - Le colostrum (premier lait) est un vaccin naturel pour bébé.
          - Réduit les risques de diarrhée et pneumonie.
          - Crée un lien affectif fort mère-enfant.
          - Aide à la perte de poids pour la maman.
          
          Au travail : Maman doit bien s'alimenter et boire beaucoup d'eau.
        `,
        excerpt:
          "Tout savoir sur les bénéfices de l'allaitement pour la mère et l'enfant.",
        featuredImage: 'local-foods',
        thumbnailImage: 'https://via.placeholder.com/200x200?text=Bebe',
        author: 'Sage-femme Clarisse M.',
        readingTime: 5,
        tags: ['maternite', 'bebe', 'allaitement', 'nutrition'],
        viewsCount: 210,
        sharesCount: 20,
        commentsCount: 5,
        reactionsCount: 50,
        isFeatured: false,
        status: ArticleStatus.PUBLISHED,
        publishedAt: new Date('2023-11-10'),
      },
      {
        organizationId: createdOrgs[3].id, // Clinique des Nations
        categoryId: catNutrition.id,
        title: 'Le pouvoir du Sport sur le Moral',
        slug: 'sport-sur-le-moral',
        content: `
          Quand on se sent triste ou stressé, le sport est souvent la dernière chose à laquelle on pense, alors que c'est la meilleure solution.
          
          La libération d'endorphines pendant l'effort physique agit comme un antidépresseur naturel.
          
          Quelques idées pour commencer :
          - Une marche rapide de 20 minutes.
          - De la danse chez soi.
          - Le footing.
          - Le vélo.
          
          L'important est de bouger chaque jour, même un peu.
        `,
        excerpt:
          'Bouger pour se sentir mieux : une médecine douce et efficace.',
        featuredImage: 'prenatal-care',
        thumbnailImage: 'https://via.placeholder.com/200x200?text=Sport',
        author: 'Dr. Paul T.',
        readingTime: 3,
        tags: ['sport', 'sante-mentale', 'stress', 'bien-etre'],
        viewsCount: 95,
        sharesCount: 8,
        commentsCount: 0,
        reactionsCount: 15,
        isFeatured: false,
        status: ArticleStatus.PUBLISHED,
        publishedAt: new Date('2023-11-12'),
      },
    ];

    for (const article of articles) {
      await prisma.article.create({
        data: article,
      });
    }
    console.log(`✅ ${articles.length} articles créés\n`);
  }
  // ============================================
  // 7. 💡 CONSEILS (ADVICES) - CORRIGÉ
  // ============================================
  console.log('💡 Création des conseils santé réalistes...');

  if (catPaludisme && catHygiene && catNutrition && catMaternelle) {
    const advices = [
      {
        organizationId: createdOrgs[0].id, // HCY (Yaoundé)
        categoryId: catPaludisme.id,
        title: '5 Signes qui doivent vous alerter (Paludisme)',
        content: `
          Au Cameroun, le paludisme est endémique. Ne confondez pas une simple grippe avec un accès palustre.
          
          Consultez immédiatement si vous remarquez :
          1. Une fièvre élevée soudaine.
          2. Des frissons intenses suivis de sueurs.
          3. Des maux de tête violents.
          4. Des nausées et vomissements.
          5. Une fatigue extrême.
          
          Pour les enfants et les femmes enceintes, le risque est accru. N'attendez pas pour aller au centre de santé le plus proche.
        `,
        priority: Priority.HIGH,
        targetAudience: [TargetAudience.ALL],
        status: AdviceStatus.PUBLISHED,
        publishedAt: new Date(),
      },
      {
        organizationId: createdOrgs[1].id, // Laquintinie (Douala)
        categoryId: catHygiene.id,
        title: 'Comment se protéger du Choléra (Mesures simples)',
        content: `
          Avec les récentes pluies, le risque de choléra augmente. Protégez-vous et votre famille :
          
          - Eau : Buvez uniquement de l'eau traitée (bouillie, javel ou en bouteille scellée).
          - Lavage : Lavez-vous les mains au savon avant de manger et après les toilettes.
          - Alimentation : Mangez des aliments bien cuits et encore chauds. Évitez les légumes crus non lavés.
          - Latrines : Utilisez toujours des toilettes propres.
          
          En cas de diarrhée liquide aiguë, hydratez-vous immédiatement avec SRO (Sérum Oral) et consultez.
        `,
        priority: Priority.URGENT,
        targetAudience: [
          TargetAudience.ADULTS,
          TargetAudience.CHILDREN,
          TargetAudience.ELDERLY,
        ],
        status: AdviceStatus.PUBLISHED,
        publishedAt: new Date(),
      },
      {
        organizationId: createdOrgs[3].id, // Clinique des Nations
        categoryId: catNutrition.id,
        title: 'Manger sain au Cameroun : Alternatives locales',
        content: `
          Pour lutter contre l'hypertension et le diabète, privilégiez notre cuisine locale saine :
          
          🥬 Légumes : Mangez beaucoup de Gombo, de Morelle et d'Aubergine (riches en fibres).
          🍌 Féculents : Préférez le plantain (koklo) bouilli ou grillé au lieu du pain blanc.
          🐛 Protéines : Le poisson braisé ou fumé est excellent, mais attention à ne pas trop saler (limitez le sel dans le "Ndobé").
          🍹 Boissons : Remplacez les sodas par du jus de Bissap ou de Gingembre sans trop de sucre.
          
          La clé : la modération et la cuisson maison !
        `,
        priority: Priority.MEDIUM,
        targetAudience: [TargetAudience.ADULTS, TargetAudience.ELDERLY],
        status: AdviceStatus.PUBLISHED,
        publishedAt: new Date(),
      },
      {
        organizationId: createdOrgs[2].id, // CHU Yaoundé
        categoryId: catMaternelle.id,
        title: 'Suivi de Grossesse : Les 4 consultations indispensables',
        content: `
          Une grossesse suivie est une grossesse sécurisée. Le Programme National de Santé de la Reproduction recommande au moins 4 Consultations Prénatales (CPN) :
          
          - CPN 1 (Dès 12 SA) : Confirmation, vaccinations, supplémentation en fer/acide folique.
          - CPN 2 (20-24 SA) : Échographie morphologique, détection de risques.
          - CPN 3 (28-32 SA) : Préparation à l'accouchement, prévention du paludisme (SP).
          - CPN 4 (36-40 SA) : Position du bébé, préparation du matériel.
          
          N'attendez pas d'avoir mal pour aller voir votre sage-femme.
        `,
        priority: Priority.HIGH,
        targetAudience: [TargetAudience.PREGNANT_WOMEN, TargetAudience.ADULTS],
        status: AdviceStatus.PUBLISHED,
        publishedAt: new Date(),
      },
      {
        organizationId: createdOrgs[4].id, // Pharmacie du Centre
        categoryId: catMaladies!.id,
        title: 'Bien gérer son asthme en saison sèche (Harmattan)',
        content: `
          La saison sèche et l'Harmattan peuvent être difficiles pour les asthmatiques.
          
          ✅ Conservez votre inhaler (pompe) toujours sur vous.
          ✅ Portez un masque ou un foulard léger pour filtrer l'air poussiéreux.
          ✅ Hydratez-vous beaucoup pour fluidifier les sécrétions bronchiques.
          ✅ Évitez les activités sportives intenses dehors le matin très tôt.
          
          En cas de crise, prenez 2 bouffées de votre bronchodilatateur et consultez si pas d'amélioration après 10 min.
        `,
        priority: Priority.MEDIUM,
        targetAudience: [TargetAudience.ADULTS, TargetAudience.CHILDREN],
        status: AdviceStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    ];

    // ✅ CORRECTION ICI : Utilisation de create au lieu de upsert
    for (const advice of advices) {
      await prisma.advice.create({
        data: advice,
      });
    }
    console.log(`✅ ${advices.length} conseils santé créés\n`);
  }

  console.log('═══════════════════════════════════════════════');
  console.log('✅ SEEDING TERMINÉ AVEC SUCCÈS !');
  console.log('═══════════════════════════════════════════════\n');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
