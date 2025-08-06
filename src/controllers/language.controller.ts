import { FastifyRequest, FastifyReply } from 'fastify';
import Language from '../models/language.model';
import { LanguageData } from '../interfaces/language.interface';
import { Op } from 'sequelize';
import { baseSearch } from '../utility/baseService';
import generateCustomUUID from '../utility/genrateTraceId'
import { beforeSave } from '../hooks/timeFormatHook';

export async function getLanguages(request: FastifyRequest<{ Querystring: LanguageData }>, reply: FastifyReply) {
  const { name, created_on } = request.query as unknown as { name: string, created_on: number };
  const traceId = generateCustomUUID();
  try {
    const languages = await Language.findAll({
      where: {
        is_deleted: false,
        ...(name ? { name: { [Op.like]: `%${name}%` } } : {}), // Use Op.like for partial match
        ...(created_on ? { created_on: { [Op.gte]: new Date(created_on) } } : {}),
      },
    });
    if (languages.length === 0) {
      return reply.code(200).send({
        status_code: 200,
        message: 'Languages not found',
        languages: []
      });
    }
    reply.status(200).send({
      status_code: 200,
      message: "Languages gwt successfully",
      items_per_page: languages.length,
      total_records: languages.length, 
      trace_id: traceId,
      data: languages,
    });
  } catch (error:any) {
    console.error(error);
    reply.status(500).send({
      status_code: 500,
      message: 'Internal Server Error',
      error:error.message
    });
  }
}

export const bulkUploadLanguage = async (request: FastifyRequest, reply: FastifyReply) => {
  const traceId = generateCustomUUID();
  try {
    const Languages = request.body as any[];
    const languagesWithTimestamps = Languages.map(language => {
      const languageModel = Language.build(language);
      beforeSave(languageModel);
      return languageModel.toJSON();
    });
    const createdLanguage = await Language.bulkCreate(languagesWithTimestamps);
    reply.status(201).send({
      status_code: 201,
      data: createdLanguage,
      message: 'Languages Created successfully',
      trace_id: traceId,
    });
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: 'Failed to create Languages',
      trace_id: traceId,
      error: error,
    });
  }
};

export async function getLanguageById(request: FastifyRequest, reply: FastifyReply) {
  const traceId = generateCustomUUID();
  const { id } = request.params as { id: string };
  try {
    const language = await Language.findByPk(id);
    if (language) {
      reply.status(200).send({
        status_code: 200,
        message:"Language data get successfully",
        data: language,
        trace_id: traceId,
      });
    } else {
      reply.status(200).send({ status_code:200,message: 'Language not found', language: [] });
    }
  } catch (error) {
    console.error(error);
    reply.status(500).send({ status_code:500,message: 'Internal Server Error' });
  }
}

export async function createLanguage(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const traceId = generateCustomUUID();
  try {
    const language = request.body as LanguageData;

    const item: any = await Language.create({ ...language });
    reply.status(201).send({
      status_code: 201,
      message:"Language create successfully",
      data: item,
      trace_id: traceId,
    });
  } catch (error) {
    reply.status(500).send({
      status_code:500,
      message: 'An error occurred while creating', 
      trace_id: traceId,
      error
    });
  }
}


export async function updateLanguage(request: FastifyRequest, reply: FastifyReply) {
  const traceId = generateCustomUUID();
  const { id } = request.params as { id: string };
  const LanguageData = request.body as LanguageData;
  try {
    const language: Language | null = await Language.findByPk(id);
    if (language) {
      await language.update(LanguageData);
      reply.status(200).send({
        status_code: 200,
        message:"Languages update successfully",
        language_id: id,
        trace_id: traceId,
      });
    } else {
      reply.status(200).send({ status_code:200,message: 'Language not found' });
    }
  } catch (error) {
    console.error(error);
    reply.status(500).send({status_code:500, message: 'Internal Server Error' });
  }
}

export async function deleteLanguage(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const traceId = generateCustomUUID();
  try {
    const { id } = request.params;
    const [numRowsDeleted] = await Language.update({
      is_deleted: true,
      updated_on: Date.now(),
    },
      { where: { id } }
    );

    if (numRowsDeleted > 0) {
      reply.status(200).send({
        statusCode: 200,
        message:"Languages delete successfully",
        language_id: id,
        trace_id: traceId,
      });
    } else {
      reply.status(200).send({status_code:200, message: 'Language not found' });
    }
  } catch (error) {
    reply.status(500).send({status_code:500, message: 'An error occurred while deleting', error });
  }
}

export async function searchLanguage(request: FastifyRequest, reply: FastifyReply) {
  const searchFields = ['name'];
  const responseFields = ['id', 'name'];
  return baseSearch(request, reply, Language, searchFields, responseFields);
}

