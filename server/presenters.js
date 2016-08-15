import Sequelize from 'sequelize';
import _orderBy from 'lodash.orderby';
import { Document, Atlas, User, Revision } from './models';

export function presentUser(ctx, user) {
  ctx.cache.set(user.id, user);

  return new Promise(async (resolve, _reject) => {
    const data = {
      id: user.id,
      name: user.name,
      username: user.username,
      avatarUrl: user.slackData.image_192,
    };
    resolve(data);
  });
}

export function presentTeam(ctx, team) {
  ctx.cache.set(team.id, team);

  return new Promise(async (resolve, _reject) => {
    resolve({
      id: team.id,
      name: team.name,
    });
  });
}

export async function presentDocument(ctx, document, options) {
  options = {
    includeCollection: false,
    includeCollaborators: true,
    ...options,
  };
  ctx.cache.set(document.id, document);

  const data = {
    id: document.id,
    url: document.buildUrl(),
    private: document.private,
    title: document.title,
    text: document.text,
    html: document.html,
    preview: document.preview,
    createdAt: document.createdAt,
    createdBy: undefined,
    updatedAt: document.updatedAt,
    updatedBy: undefined,
    team: document.teamId,
    collaborators: [],
  };

  if (options.includeCollection) {
    data.collection = await ctx.cache.get(
      document.atlasId,
      async () => {
        const collection = await Atlas.findOne({ where: {
          id: document.atlasId,
        } });
        return await presentCollection(ctx, collection);
      }
    );
  }

  if (options.includeCollaborators) {
    // This could be further optimized by using ctx.cache
    data.collaborators = await User.findAll({
      where: {
        id: {
          $in: document.collaboratorIds || [],
        },
      },
    })
    .map(user => presentUser(ctx, user));
  }

  const createdBy = await ctx.cache.get(
    document.createdById,
    async () => await User.findById(document.createdById)
  );
  data.createdBy = await presentUser(ctx, createdBy);

  const updatedBy = await ctx.cache.get(
    document.lastModifiedById,
    async () => await User.findById(document.lastModifiedById)
  );
  data.updatedBy = await presentUser(ctx, updatedBy);

  return data;
}

export function presentCollection(ctx, collection, includeRecentDocuments=false) {
  ctx.cache.set(collection.id, collection);

  return new Promise(async (resolve, _reject) => {
    const data = {
      id: collection.id,
      name: collection.name,
      description: collection.description,
      type: collection.type,
    };

    if (collection.type === 'atlas') data.navigationTree = collection.navigationTree;

    if (includeRecentDocuments) {
      const documents = await Document.findAll({
        where: {
          atlasId: collection.id,
        },
        limit: 10,
        order: [
          ['updatedAt', 'DESC'],
        ],
      });

      const recentDocuments = [];
      await Promise.all(documents.map(async (document) => {
        recentDocuments.push(await presentDocument(ctx, document, {
          includeCollaborators: true,
        }));
      }));
      data.recentDocuments = _orderBy(recentDocuments, ['updatedAt'], ['desc']);
    }

    resolve(data);
  });
}
