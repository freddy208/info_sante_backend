/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { PrismaClient, AdminRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Début du seeding...\n');

  // ============================================
  // 1. CATÉGORIES
  // ============================================
  console.log('📂 Création des catégories...');
  const categories = [
    {
      name: 'Vaccination',
      slug: 'vaccination',
      description: 'Campagnes de vaccination et rappels',
      icon: '💉',
      color: '#7E57C2',
      order: 1,
    },
    {
      name: 'Dépistage',
      slug: 'depistage',
      description: 'Dépistages gratuits et campagnes de détection précoce',
      icon: '🔬',
      color: '#EC407A',
      order: 2,
    },
    {
      name: 'Sensibilisation',
      slug: 'sensibilisation',
      description: 'Campagnes de sensibilisation et prévention',
      icon: '📢',
      color: '#26A69A',
      order: 3,
    },
    {
      name: 'Consultation gratuite',
      slug: 'consultation-gratuite',
      description: 'Consultations médicales gratuites',
      icon: '🩺',
      color: '#5C6BC0',
      order: 4,
    },
    {
      name: 'Don de sang',
      slug: 'don-de-sang',
      description: 'Campagnes de collecte de sang',
      icon: '🩸',
      color: '#EF5350',
      order: 5,
    },
    {
      name: 'Santé maternelle',
      slug: 'sante-maternelle',
      description: 'Suivi de grossesse et santé des mères',
      icon: '🤰',
      color: '#FFA726',
      order: 6,
    },
    {
      name: 'Santé infantile',
      slug: 'sante-infantile',
      description: 'Soins et suivi des enfants',
      icon: '👶',
      color: '#66BB6A',
      order: 7,
    },
    {
      name: 'Maladies chroniques',
      slug: 'maladies-chroniques',
      description: 'Diabète, hypertension, asthme...',
      icon: '💊',
      color: '#42A5F5',
      order: 8,
    },
    {
      name: 'Urgences',
      slug: 'urgences',
      description: 'Informations urgentes et alertes sanitaires',
      icon: '🚨',
      color: '#FF5252',
      order: 9,
    },
    {
      name: 'Formation',
      slug: 'formation',
      description: 'Formations et ateliers santé',
      icon: '📚',
      color: '#8D6E63',
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
      name: 'Gynécologie',
      slug: 'gynecologie',
      description: 'Santé de la femme',
      icon: '🤰',
    },
    {
      name: 'Médecine générale',
      slug: 'medecine-generale',
      description: 'Soins de santé généraux',
      icon: '🩺',
    },
    {
      name: 'Dentisterie',
      slug: 'dentisterie',
      description: 'Soins dentaires',
      icon: '🦷',
    },
    {
      name: 'Ophtalmologie',
      slug: 'ophtalmologie',
      description: 'Santé des yeux',
      icon: '👁️',
    },
    {
      name: 'Dermatologie',
      slug: 'dermatologie',
      description: 'Maladies de la peau',
      icon: '🧴',
    },
    {
      name: 'Orthopédie',
      slug: 'orthopedie',
      description: 'Os, articulations et muscles',
      icon: '🦴',
    },
    {
      name: 'Radiologie',
      slug: 'radiologie',
      description: 'Imagerie médicale',
      icon: '📷',
    },
    {
      name: 'Laboratoire',
      slug: 'laboratoire',
      description: 'Analyses médicales',
      icon: '🔬',
    },
    {
      name: 'Pharmacie',
      slug: 'pharmacie',
      description: 'Médicaments et conseil pharmaceutique',
      icon: '💊',
    },
    {
      name: 'Urgences',
      slug: 'urgences',
      description: 'Soins urgents 24/7',
      icon: '🚑',
    },
    {
      name: 'Maternité',
      slug: 'maternite',
      description: 'Accouchement et soins périnataux',
      icon: '🤱',
    },
    {
      name: 'Psychiatrie',
      slug: 'psychiatrie',
      description: 'Santé mentale',
      icon: '🧠',
    },
    {
      name: 'Nutrition',
      slug: 'nutrition',
      description: 'Conseils nutritionnels',
      icon: '🥗',
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
  // 3. TEMPLATES DE PERMISSIONS ADMIN
  // ============================================
  console.log('🔐 Création des templates de permissions admin...');

  const adminRoleTemplates: Array<{
    role: AdminRole;
    name: string;
    description: string;
    permissions: Record<string, string[]>;
  }> = [
    {
      role: 'SUPER_ADMIN',
      name: 'Super Administrateur',
      description: 'Accès complet à toutes les fonctionnalités du système',
      permissions: {
        ORGANIZATION: [
          'VALIDATE_ORGANIZATION',
          'SUSPEND_ORGANIZATION',
          'DELETE_ORGANIZATION',
          'VIEW_ORGANIZATIONS',
          'EXPORT_ORGANIZATIONS',
        ],
        USER: ['VIEW_USERS', 'SUSPEND_USER', 'DELETE_USER', 'EXPORT_USERS'],
        ANNOUNCEMENT: ['MODERATE_ANNOUNCEMENT', 'DELETE_CONTENT'],
        ARTICLE: ['MODERATE_ARTICLE', 'DELETE_CONTENT'],
        COMMENT: ['MODERATE_COMMENT', 'DELETE_CONTENT'],
        REPORT: ['VIEW_REPORTS', 'RESOLVE_REPORTS'],
        CATEGORY: ['MANAGE_CATEGORIES'],
        SPECIALTY: ['MANAGE_SPECIALTIES'],
        AUDIT_LOG: ['VIEW_AUDIT_LOGS', 'EXPORT_AUDIT_LOGS'],
        STATISTICS: ['VIEW_STATISTICS', 'EXPORT_DATA'],
        ADMIN: ['MANAGE_ADMINS', 'MANAGE_PERMISSIONS'],
        SYSTEM: ['SYSTEM_SETTINGS'],
      },
    },
    {
      role: 'MODERATOR',
      name: 'Modérateur',
      description: 'Modération des contenus et gestion des signalements',
      permissions: {
        ANNOUNCEMENT: ['MODERATE_ANNOUNCEMENT', 'DELETE_CONTENT'],
        ARTICLE: ['MODERATE_ARTICLE', 'DELETE_CONTENT'],
        COMMENT: ['MODERATE_COMMENT', 'DELETE_CONTENT'],
        REPORT: ['VIEW_REPORTS', 'RESOLVE_REPORTS'],
        ORGANIZATION: ['VIEW_ORGANIZATIONS'],
        USER: ['VIEW_USERS'],
      },
    },
    {
      role: 'SUPPORT',
      name: 'Support',
      description: 'Support utilisateurs et organisations',
      permissions: {
        USER: ['VIEW_USERS'],
        ORGANIZATION: ['VIEW_ORGANIZATIONS'],
        REPORT: ['VIEW_REPORTS', 'RESOLVE_REPORTS'],
        STATISTICS: ['VIEW_STATISTICS'],
      },
    },
    {
      role: 'ANALYST',
      name: 'Analyste',
      description: 'Consultation des statistiques et export de données',
      permissions: {
        STATISTICS: ['VIEW_STATISTICS', 'EXPORT_DATA'],
        AUDIT_LOG: ['VIEW_AUDIT_LOGS'],
        ORGANIZATION: ['VIEW_ORGANIZATIONS'],
        USER: ['VIEW_USERS'],
      },
    },
    {
      role: 'VALIDATOR',
      name: 'Validateur',
      description: 'Validation des nouvelles organisations',
      permissions: {
        ORGANIZATION: ['VIEW_ORGANIZATIONS', 'VALIDATE_ORGANIZATION'],
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

  console.log(
    `✅ ${adminRoleTemplates.length} templates de permissions créés\n`,
  );

  // ============================================
  // 4. PREMIER SUPER ADMIN
  // ============================================
  console.log('👨‍💼 Création du Super Admin...');

  const hashedPassword = await bcrypt.hash('SuperAdmin@2025!', 10);

  const superAdmin = await prisma.administrator.upsert({
    where: { email: 'admin@infosante.cm' },
    update: {},
    create: {
      email: 'admin@infosante.cm',
      password: hashedPassword,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
      isActive: true,
      status: 'ACTIVE',
    },
  });

  console.log('✅ Super Admin créé:');
  console.log('   📧 Email: admin@infosante.cm');
  console.log('   🔑 Mot de passe: SuperAdmin@2025!\n');

  // Créer les permissions pour le super admin
  const superAdminTemplate = adminRoleTemplates.find(
    (t) => t.role === 'SUPER_ADMIN',
  );

  if (superAdminTemplate) {
    for (const [resource, actions] of Object.entries(
      superAdminTemplate.permissions,
    )) {
      await prisma.administratorPermission.upsert({
        where: {
          administratorId_resource: {
            administratorId: superAdmin.id,
            resource: resource as any,
          },
        },
        update: {},
        create: {
          administratorId: superAdmin.id,
          resource: resource as any,
          actions: actions as any,
        },
      });
    }
  }

  console.log('✅ Permissions Super Admin créées\n');

  // ============================================
  // 5. ORGANISATION DE TEST (Optionnel)
  // ============================================
  console.log("🏥 Création d'une organisation de test...");

  const testOrgPassword = await bcrypt.hash('Hospital@2025!', 10);

  const testOrganization = await prisma.organization.upsert({
    where: { email: 'hopital.test@infosante.cm' },
    update: {},
    create: {
      name: 'Hôpital Général de Test',
      email: 'hopital.test@infosante.cm',
      password: testOrgPassword,
      type: 'HOSPITAL_PUBLIC',
      phone: '+237670000000',
      address: 'Rue de la Santé, Douala',
      city: 'Douala',
      region: 'Littoral',
      registrationNumber: 'TEST-001',
      isVerified: true,
      verifiedAt: new Date(),
      verifiedBy: superAdmin.id,
      status: 'ACTIVE',
    },
  });

  console.log('✅ Organisation de test créée:');
  console.log('   📧 Email: hopital.test@infosante.cm');
  console.log('   🔑 Mot de passe: Hospital@2025!\n');

  // Créer les permissions pour l'organisation de test
  const orgPermissions = [
    {
      resource: 'ANNOUNCEMENT',
      actions: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'PUBLISH', 'UNPUBLISH'],
    },
    {
      resource: 'ARTICLE',
      actions: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'PUBLISH', 'UNPUBLISH'],
    },
    {
      resource: 'ADVICE',
      actions: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'PUBLISH'],
    },
    { resource: 'MEDIA', actions: ['CREATE', 'READ', 'DELETE'] },
  ];

  for (const perm of orgPermissions) {
    await prisma.organizationPermission.upsert({
      where: {
        organizationId_resource: {
          organizationId: testOrganization.id,
          resource: perm.resource as any,
        },
      },
      update: {},
      create: {
        organizationId: testOrganization.id,
        resource: perm.resource as any,
        actions: perm.actions as any,
      },
    });
  }

  console.log('✅ Permissions Organisation de test créées\n');

  // ============================================
  // 6. UTILISATEUR DE TEST (Optionnel)
  // ============================================
  console.log("👤 Création d'un utilisateur de test...");

  const testUserPassword = await bcrypt.hash('User@2025!', 10);

  await prisma.user.upsert({
    where: { email: 'user.test@infosante.cm' },
    update: {},
    create: {
      email: 'user.test@infosante.cm',
      password: testUserPassword,
      firstName: 'Jean',
      lastName: 'Mbarga',
      phone: '+237670111111',
      city: 'Douala',
      region: 'Littoral',
      isEmailVerified: true,
      status: 'ACTIVE',
    },
  });

  console.log('✅ Utilisateur de test créé:');
  console.log('   📧 Email: user.test@infosante.cm');
  console.log('   🔑 Mot de passe: User@2025!\n');

  // ============================================
  // RÉSUMÉ
  // ============================================
  console.log('═══════════════════════════════════════════════');
  console.log('✅ SEEDING TERMINÉ AVEC SUCCÈS !');
  console.log('═══════════════════════════════════════════════\n');

  console.log('📊 RÉSUMÉ:');
  console.log(`   • ${categories.length} catégories`);
  console.log(`   • ${specialties.length} spécialités`);
  console.log(`   • ${adminRoleTemplates.length} templates de permissions`);
  console.log('   • 1 super admin');
  console.log('   • 1 organisation de test');
  console.log('   • 1 utilisateur de test\n');

  console.log('🔑 COMPTES DE TEST:');
  console.log('   Super Admin:');
  console.log('     Email: admin@infosante.cm');
  console.log('     Pass:  SuperAdmin@2025!');
  console.log('   ');
  console.log('   Hôpital Test:');
  console.log('     Email: hopital.test@infosante.cm');
  console.log('     Pass:  Hospital@2025!');
  console.log('   ');
  console.log('   Utilisateur Test:');
  console.log('     Email: user.test@infosante.cm');
  console.log('     Pass:  User@2025!\n');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
