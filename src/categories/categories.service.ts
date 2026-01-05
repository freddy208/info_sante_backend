/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// src/categories/categories.service.ts

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryEntity } from './entities/category.entity';
import { PrismaService } from 'prisma/prisma.service';

/**
 * 📂 CATEGORIES SERVICE
 *
 * Gère toute la logique métier des catégories de santé.
 *
 * FONCTIONNALITÉS :
 * - CRUD catégories
 * - Gestion hiérarchie parent/enfant
 * - Génération automatique de slug
 * - Activation/Désactivation (soft delete)
 * - Statistiques par catégorie
 */
@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(private prisma: PrismaService) {}

  // =====================================
  // 📝 CRÉER UNE CATÉGORIE
  // =====================================

  /**
   * Créer une nouvelle catégorie
   *
   * VÉRIFICATIONS :
   * 1. Nom unique
   * 2. Parent existe (si parentId fourni)
   * 3. Génération automatique du slug
   *
   * @param createCategoryDto - Données de la catégorie
   */
  async create(createCategoryDto: CreateCategoryDto): Promise<CategoryEntity> {
    const { name, description, icon, color, parentId, order } =
      createCategoryDto;

    // ✅ VÉRIFICATION : Nom unique
    const existingCategory = await this.prisma.category.findUnique({
      where: { name },
    });

    if (existingCategory) {
      throw new ConflictException('Une catégorie avec ce nom existe déjà');
    }

    // ✅ VÉRIFICATION : Parent existe (si fourni)
    if (parentId) {
      const parentCategory = await this.prisma.category.findUnique({
        where: { id: parentId },
      });

      if (!parentCategory) {
        throw new NotFoundException(
          `Catégorie parente avec l'ID ${parentId} non trouvée`,
        );
      }

      // Vérifier que le parent est actif
      if (!parentCategory.isActive) {
        throw new BadRequestException(
          'Impossible de créer une sous-catégorie pour une catégorie désactivée',
        );
      }

      // Vérifier que le parent n'est pas lui-même une sous-catégorie
      // (on limite à 2 niveaux : parent → enfant, pas de petit-enfant)
      if (parentCategory.parentId) {
        throw new BadRequestException(
          "Impossible de créer une sous-catégorie d'une sous-catégorie (maximum 2 niveaux)",
        );
      }
    }

    // 🔤 GÉNÉRATION AUTOMATIQUE DU SLUG
    const slug = await this.generateUniqueSlug(name);

    // 💾 CRÉER LA CATÉGORIE
    try {
      const category = await this.prisma.category.create({
        data: {
          name,
          slug,
          description,
          icon,
          color,
          parentId,
          order: order ?? 0,
          isActive: true,
        },
        include: {
          parent: true,
          children: true,
        },
      });

      this.logger.log(`✅ Catégorie créée : ${category.name} (${category.id})`);

      return new CategoryEntity(category as any);
    } catch (error) {
      this.logger.error(`❌ Erreur création catégorie : ${error.message}`);
      throw new BadRequestException(
        'Erreur lors de la création de la catégorie',
      );
    }
  }

  // =====================================
  // 📋 LISTE DES CATÉGORIES
  // =====================================

  /**
   * Récupérer la liste des catégories avec hiérarchie
   *
   * OPTIONS :
   * - Pagination
   * - Filtrage par statut (active/inactive)
   * - Inclure/Exclure les enfants
   * - Trier par ordre
   *
   * @param page - Numéro de la page
   * @param limit - Nombre de catégories par page
   * @param isActive - Filtrer par statut actif
   * @param includeChildren - Inclure les sous-catégories
   * @param parentOnly - Uniquement les catégories parentes
   */
  async findAll(
    page: number = 1,
    limit: number = 50,
    isActive?: boolean,
    includeChildren: boolean = true,
    parentOnly: boolean = false,
  ) {
    if (page < 1) page = 1;
    if (limit < 1 || limit > 100) limit = 50;

    const skip = (page - 1) * limit;

    // Construction du filtre WHERE
    const where: any = {};

    // ✅ Par défaut, montrer seulement les catégories actives
    if (isActive !== undefined) {
      where.isActive = isActive;
    } else {
      where.isActive = true; // ✅ DÉFAUT : Seulement les actives
    }

    if (parentOnly) {
      where.parentId = null; // Seulement les catégories de niveau 1
    }

    // Récupérer les catégories
    const [categories, total] = await Promise.all([
      this.prisma.category.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ order: 'asc' }, { name: 'asc' }],
        include: {
          parent: true,
          children: includeChildren
            ? {
                where: { isActive: true }, // ✅ Seulement les enfants actifs
                orderBy: [{ order: 'asc' }, { name: 'asc' }],
              }
            : false,
        },
      }),
      this.prisma.category.count({ where }),
    ]);

    const categoryEntities = categories.map(
      (cat) => new CategoryEntity(cat as any),
    );

    const totalPages = Math.ceil(total / limit);

    return {
      data: categoryEntities,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  // =====================================
  // 🔍 DÉTAILS D'UNE CATÉGORIE
  // =====================================

  /**
   * Récupérer les détails d'une catégorie par ID ou slug
   *
   * @param identifier - ID ou slug de la catégorie
   */
  async findOne(identifier: string): Promise<CategoryEntity> {
    // Déterminer si c'est un UUID ou un slug
    const isUUID =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        identifier,
      );

    const category = await this.prisma.category.findUnique({
      where: isUUID ? { id: identifier } : { slug: identifier },
      include: {
        parent: true,
        children: {
          where: { isActive: true }, // ✅ Seulement les enfants actifs
          orderBy: [{ order: 'asc' }, { name: 'asc' }],
        },
      },
    });

    if (!category) {
      throw new NotFoundException(
        `Catégorie avec l'${isUUID ? 'ID' : 'slug'} ${identifier} non trouvée`,
      );
    }

    return new CategoryEntity(category as any);
  }

  // =====================================
  // ✏️ MODIFIER UNE CATÉGORIE
  // =====================================

  /**
   * Modifier une catégorie
   *
   * VÉRIFICATIONS :
   * 1. Catégorie existe
   * 2. Nom unique (si changé)
   * 3. Parent existe (si changé)
   * 4. Pas de boucle parent/enfant
   *
   * @param id - ID de la catégorie
   * @param updateCategoryDto - Données à mettre à jour
   */
  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<CategoryEntity> {
    // ✅ Vérifier que la catégorie existe
    const existingCategory = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!existingCategory) {
      throw new NotFoundException(`Catégorie avec l'ID ${id} non trouvée`);
    }

    // ✅ VÉRIFICATION : Nom unique (si changé)
    if (
      updateCategoryDto.name &&
      updateCategoryDto.name !== existingCategory.name
    ) {
      const nameExists = await this.prisma.category.findUnique({
        where: { name: updateCategoryDto.name },
      });

      if (nameExists) {
        throw new ConflictException('Une catégorie avec ce nom existe déjà');
      }
    }

    // ✅ VÉRIFICATION : Parent existe et pas de boucle
    if (updateCategoryDto.parentId) {
      // Vérifier que le parent existe
      const parentCategory = await this.prisma.category.findUnique({
        where: { id: updateCategoryDto.parentId },
      });

      if (!parentCategory) {
        throw new NotFoundException(
          `Catégorie parente avec l'ID ${updateCategoryDto.parentId} non trouvée`,
        );
      }

      // Vérifier que le parent est actif
      if (!parentCategory.isActive) {
        throw new BadRequestException(
          "Impossible d'assigner une catégorie parente désactivée",
        );
      }

      // Empêcher une catégorie d'être son propre parent
      if (updateCategoryDto.parentId === id) {
        throw new BadRequestException(
          'Une catégorie ne peut pas être son propre parent',
        );
      }

      // Empêcher les boucles : si le parent est un enfant de cette catégorie
      if (parentCategory.parentId === id) {
        throw new BadRequestException(
          'Impossible de créer une boucle parent/enfant',
        );
      }

      // Vérifier que le parent n'est pas lui-même une sous-catégorie
      if (parentCategory.parentId) {
        throw new BadRequestException(
          "Impossible de créer une sous-catégorie d'une sous-catégorie",
        );
      }
    }

    // 📝 Préparer les données à mettre à jour
    const dataToUpdate: any = {};

    if (updateCategoryDto.name !== undefined) {
      dataToUpdate.name = updateCategoryDto.name;
      // Régénérer le slug si le nom change
      dataToUpdate.slug = await this.generateUniqueSlug(
        updateCategoryDto.name,
        existingCategory.id,
      );
    }
    if (updateCategoryDto.description !== undefined)
      dataToUpdate.description = updateCategoryDto.description;
    if (updateCategoryDto.icon !== undefined)
      dataToUpdate.icon = updateCategoryDto.icon;
    if (updateCategoryDto.color !== undefined)
      dataToUpdate.color = updateCategoryDto.color;
    if (updateCategoryDto.parentId !== undefined)
      dataToUpdate.parentId = updateCategoryDto.parentId;
    if (updateCategoryDto.order !== undefined)
      dataToUpdate.order = updateCategoryDto.order;
    if (updateCategoryDto.isActive !== undefined)
      dataToUpdate.isActive = updateCategoryDto.isActive;

    // 💾 Mettre à jour la catégorie
    try {
      const updatedCategory = await this.prisma.category.update({
        where: { id },
        data: dataToUpdate,
        include: {
          parent: true,
          children: {
            where: { isActive: true },
            orderBy: [{ order: 'asc' }, { name: 'asc' }],
          },
        },
      });

      this.logger.log(
        `✅ Catégorie mise à jour : ${updatedCategory.name} (${id})`,
      );

      return new CategoryEntity(updatedCategory as any);
    } catch (error) {
      this.logger.error(`❌ Erreur mise à jour catégorie : ${error.message}`);
      throw new BadRequestException(
        'Erreur lors de la mise à jour de la catégorie',
      );
    }
  }

  // =====================================
  // 🗑️ DÉSACTIVER UNE CATÉGORIE (SOFT DELETE)
  // =====================================

  /**
   * Désactiver une catégorie (soft delete via isActive = false)
   *
   * VÉRIFICATIONS :
   * 1. Catégorie existe
   * 2. Catégorie pas déjà désactivée
   * 3. Pas de sous-catégories actives
   *
   * @param id - ID de la catégorie
   */
  async remove(id: string): Promise<{ message: string }> {
    // ✅ Vérifier que la catégorie existe
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        children: {
          where: { isActive: true }, // ✅ Seulement les enfants actifs
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Catégorie avec l'ID ${id} non trouvée`);
    }

    // ✅ Vérifier qu'elle n'est pas déjà désactivée
    if (!category.isActive) {
      throw new BadRequestException('Cette catégorie est déjà désactivée');
    }

    // ⚠️ VÉRIFICATION : Pas de sous-catégories actives
    if (category.children.length > 0) {
      throw new BadRequestException(
        `Impossible de désactiver cette catégorie car elle contient ${category.children.length} sous-catégorie(s) active(s). Désactivez d'abord les sous-catégories.`,
      );
    }

    // 🗑️ SOFT DELETE : Désactiver la catégorie
    try {
      await this.prisma.category.update({
        where: { id },
        data: {
          isActive: false,
        },
      });

      this.logger.warn(
        `🗑️ Catégorie désactivée (soft delete) : ${category.name} (${id})`,
      );

      return {
        message: 'Catégorie désactivée avec succès',
      };
    } catch (error) {
      this.logger.error(`❌ Erreur désactivation catégorie : ${error.message}`);
      throw new BadRequestException(
        'Erreur lors de la désactivation de la catégorie',
      );
    }
  }

  // =====================================
  // ♻️ RÉACTIVER UNE CATÉGORIE
  // =====================================

  /**
   * Réactiver une catégorie désactivée
   *
   * @param id - ID de la catégorie
   */
  async activate(id: string): Promise<CategoryEntity> {
    // ✅ Vérifier que la catégorie existe
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Catégorie avec l'ID ${id} non trouvée`);
    }

    // ✅ Vérifier qu'elle est bien désactivée
    if (category.isActive) {
      throw new BadRequestException('Cette catégorie est déjà active');
    }

    // ♻️ RÉACTIVER
    try {
      const activatedCategory = await this.prisma.category.update({
        where: { id },
        data: {
          isActive: true,
        },
        include: {
          parent: true,
          children: {
            where: { isActive: true },
            orderBy: [{ order: 'asc' }, { name: 'asc' }],
          },
        },
      });

      this.logger.log(
        `♻️ Catégorie réactivée : ${activatedCategory.name} (${id})`,
      );

      return new CategoryEntity(activatedCategory as any);
    } catch (error) {
      this.logger.error(`❌ Erreur réactivation catégorie : ${error.message}`);
      throw new BadRequestException(
        'Erreur lors de la réactivation de la catégorie',
      );
    }
  }

  // =====================================
  // 🔧 MÉTHODES UTILITAIRES PRIVÉES
  // =====================================

  /**
   * Générer un slug unique à partir du nom
   *
   * @param name - Nom de la catégorie
   * @param excludeId - ID à exclure (pour les mises à jour)
   */
  private async generateUniqueSlug(
    name: string,
    excludeId?: string,
  ): Promise<string> {
    // Transformer le nom en slug
    const slug = name
      .toLowerCase()
      .normalize('NFD') // Normaliser les caractères accentués
      .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
      .replace(/[^a-z0-9]+/g, '-') // Remplacer les caractères spéciaux par des tirets
      .replace(/^-+|-+$/g, ''); // Supprimer les tirets au début/fin

    // Vérifier l'unicité
    let finalSlug = slug;
    let counter = 1;

    while (true) {
      const existing = await this.prisma.category.findUnique({
        where: { slug: finalSlug },
      });

      // Si le slug n'existe pas, ou si c'est la même catégorie (mise à jour)
      if (!existing || (excludeId && existing.id === excludeId)) {
        break;
      }

      // Sinon, ajouter un suffixe numérique
      finalSlug = `${slug}-${counter}`;
      counter++;
    }

    return finalSlug;
  }

  // =====================================
  // 🔧 DEV : RECALCULER LES COMPTEURS (OPTIMISÉ)
  // =====================================
  async recalculateAllCounts(): Promise<{
    message: string;
    updatedCategories: number;
  }> {
    this.logger.log('🔄 Début du recalcul des compteurs de catégories...');

    // 1. RÉCUPÉRATION (LECTURE) - EN DEHORS DE LA TRANSACTION
    const allCategories = await this.prisma.category.findMany();

    // On prépare un tableau de mises à jour
    // On fait TOUTES les lectures ici (beaucoup plus rapide)
    const updatesData = await Promise.all(
      allCategories.map(async (cat) => {
        // Compter les annonces
        const announcementsCount = await this.prisma.announcement.count({
          where: {
            categoryId: cat.id,
            status: 'PUBLISHED',
          },
        });

        // Compter les articles
        const articlesCount = await this.prisma.article.count({
          where: {
            categoryId: cat.id,
            status: 'PUBLISHED',
          },
        });

        // Compter les conseils
        const advicesCount = await this.prisma.advice.count({
          where: {
            categoryId: cat.id,
            status: 'PUBLISHED',
            isActive: true,
          },
        });

        // On retourne juste les données pour la future mise à jour
        return {
          id: cat.id,
          data: {
            announcementsCount,
            articlesCount,
            advicesCount,
          },
        };
      }),
    );

    // 2. ÉCRITURE - DANS UNE TRANSACTION LÉGÈRE
    // Ici on ne fait que des updates, c'est beaucoup plus propre pour Prisma
    await this.prisma.$transaction(async (tx) => {
      for (const update of updatesData) {
        await tx.category.update({
          where: { id: update.id },
          data: update.data,
        });
      }
    });

    this.logger.log(`✅ ${allCategories.length} catégories mises à jour.`);
    return {
      message: 'Recomptage terminé avec succès.',
      updatedCategories: allCategories.length,
    };
  }
}
