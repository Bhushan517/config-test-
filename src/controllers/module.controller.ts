import { FastifyRequest, FastifyReply } from 'fastify';
import ModuleData from '../interfaces/module.interface';
import { Module } from '../models/module.model';
import ProgramsConfig from '../models/programs-config.model';


export async function getModule(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { is_enabled , is_custom_field , is_reason_code,program_id} = request.query as { is_enabled?: boolean | string, is_custom_field?:boolean | string, is_reason_code?:boolean|string, program_id?: string };

  try {

    const searchFilters: any = { is_deleted: false };


    if (is_enabled !== undefined) {
      searchFilters.is_enabled = is_enabled === "true" || is_enabled === true ? 1 : 0;
    }

    if (is_custom_field !== undefined) {
      searchFilters.is_custom_field = is_custom_field === "true" || is_custom_field === true ? 1 : 0;
    }
     if(is_reason_code !== undefined){
      searchFilters.is_reason_code =is_reason_code =="true"||is_reason_code === true?1:0;
     }

     let shiftRateEnabled = true;
     if (program_id) {
       const config = await ProgramsConfig.findOne({
         where: {
           program_id,
           key: 'shift_rate',
         },
       });
       shiftRateEnabled = config?.value === true || config?.value === 'true';
     }
    const allModules = await Module.findAll({
      where: searchFilters,
      attributes: ["id", "name", "is_enabled", "module_linking", "is_custom_field", "is_reason_code"],
      order: [["name", "ASC"]],
    });

    const modules = allModules.filter((mod: any) => {
      if (mod.name === 'Shift Scheduler' && !shiftRateEnabled) {
        return false;
      }
      return true;
    })as any;


    if (modules.length === 0) {
      return reply.status(200).send({
        status_code: 200,
        message: "Modules not found",
        modules: [],
       total_count: 0
      });
    }


    return reply.status(200).send({
      status_code: 200,
      message: "Modules fetched successfully",
      modules: modules,
      total_count: modules.length, 
    });
  } catch (error: any) {

    console.error("Error fetching modules:", error);
    return reply.status(500).send({
      status_code: 500,
      error: "Internal Server Error",
      message: error.message,
    });
  }
}


export async function getModuleById(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { id } = request.params as { id: string };

  try {
    const result = await Module.findOne({
      where: { id, is_deleted: false },
      attributes: ["id", "name", "is_enabled", "module_linking", "is_custom_field","is_reason_code"],
    });

    if (!result) {
      return reply.status(200).send({
        status_code: 200,
        message: "Module not found",
        module: null,
      });
    }

    return reply.status(200).send({
      status_code: 200,
      message: "Module fetched successfully",
      module: result,
    });
  } catch (error: any) {
    console.error("Error fetching module by ID:", error);
    return reply.status(500).send({
      status_code: 500,
      error: "Internal Server Error",
      message: error.message,
    });
  }
}

export async function createModule(request: FastifyRequest, reply: FastifyReply) {
  const { ...moduleData } = request.body as ModuleData;

  try {
    const item: any = await Module.create({ ...moduleData });
    reply.status(201).send({
      status_code: 201,
      id: item.id,
      message: 'Program Created Successfully',
    });
  } catch (error: any) {
    reply.status(500).send({
      status_code: 500,
      message: 'Internal Server Error',
      error: error?.parent?.sqlMessage
    });
  }
}

export async function updateModule(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { id } = request.params as { id: string };
  const updates = request.body as Partial<ModuleData>;

  try {
    const program = await Module.findOne({
      where: {
        id: id,
        is_deleted: false
      }
    });
    if (!program) {
      return reply.status(200).send({ status_code: 200, message: 'Program not found' });
    }
    const updatedCount: any = await Module.update(updates, {
      where: { id: id }
    });
    reply.status(200).send({
      status_code: 200,
      id: updatedCount.id,
      message: 'Module updated successfully',
    });
  } catch (error) {
    console.error(error);
    reply.status(500).send({ status_code: 500, message: 'Internal Server Error', error: error });
  }
}

export async function updateModuleFlags(
  request: FastifyRequest<{ Body: { golbal_launches: { id: string; is_enabled: boolean }[] } }>,
  reply: FastifyReply
) {
  const { golbal_launches } = request.body;
  try {
    await Module.sequelize?.transaction(async (t) => {
      const updatePromises = golbal_launches.map(async (launch) => {
        return Module.update(
          { is_enabled: launch.is_enabled },
          { where: { id: launch.id }, transaction: t }
        );
      });
      await Promise.all(updatePromises);
    });
    reply.status(201).send({
      status_code: 201,
      message: 'Module data updated successfully.',
    });
  } catch (error) {
    reply.status(500).send({
      status_code: 500,
      message: 'An error occurred while updating data.',
      error: error as Error,
    });
  }
}

export async function deleteModule(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    const globalConfig = await Module.findByPk(id);
    if (globalConfig) {
      await globalConfig.update({
        is_enabled: false,
        is_deleted: true,
      })
      reply.status(204).send({ status_code: 204, message: 'Module Deleted Successfully' });
    } else {
      reply.status(200).send({ status_code: 200, message: 'Module Not Found' });
    }
  } catch (error) {
    reply.status(500).send({ status_code: 500, message: 'An error occurred while deleting Module', error: error });
  }
}
