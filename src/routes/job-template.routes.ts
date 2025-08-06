import { FastifyInstance } from "fastify";
import * as JobTemplateController from "../controllers/job-template.controller";
import { validatePermissions } from "../middlewares/vaildate-permissions";
import { Permissions, Actions } from "../constants/permissions";
import { verifyToken } from "../middlewares/verifyToken";

async function jobTemplate(fastify: FastifyInstance) {
  fastify.addHook('preHandler', verifyToken);
  //fastify.register(fastifyMultipart);

  fastify.get("/program/:program_id/job-template", {
    // preHandler: validatePermissions(Actions.READ, [Permissions.JOB_TEMPLATE])
  }, JobTemplateController.getAllJobTemplates);

  fastify.get("/program/:program_id/job-template/:id", {
    // preHandler: validatePermissions(Actions.READ, [Permissions.JOB_TEMPLATE])
  }, JobTemplateController.getJobTemplateById);

  fastify.post("/program/:program_id/job-template", {
    // preHandler: validatePermissions(Actions.CREATE, [Permissions.JOB_TEMPLATE])
  }, JobTemplateController.createJobTemplate);

  fastify.put("/program/:program_id/job-template/:id", {
    // preHandler: validatePermissions(Actions.UPDATE, [Permissions.JOB_TEMPLATE])
  }, JobTemplateController.updateJobTemplate);

  fastify.delete("/program/:program_id/job-template/:id", JobTemplateController.deleteJobTemplate);

  fastify.post("/program/:program_id/get-job-templates", {
    // preHandler: validatePermissions(Actions.READ, [Permissions.JOB_TEMPLATE])
  }, JobTemplateController.getJobTemplatesByHierarchies);

  fastify.get("/program/:program_id/recent-job-templates", {
    // preHandler: validatePermissions(Actions.READ, [Permissions.JOB_TEMPLATE])
  }, JobTemplateController.getAllJobTemplateHierarchyById);

  fastify.get("/program/:program_id/popular-job-templates", {
    // preHandler: validatePermissions(Actions.READ, [Permissions.JOB_TEMPLATE])
  }, JobTemplateController.getMostUsedJobTemplates);

  fastify.get(
    "/program/:program_id/job-templates", {
    // preHandler: validatePermissions(Actions.READ, [Permissions.JOB_TEMPLATE])
  }, JobTemplateController.getAllJobTempletsByHierarchies);

  fastify.get("/program_id/:program_id/job-templates/labour-categories", JobTemplateController.findJobTemplatesByLabourCategories);

  fastify.post("/program/:program_id/job-templates-by-hierarchy", {
    // preHandler: validatePermissions(Actions.READ, [Permissions.JOB_TEMPLATE])
  }, JobTemplateController.findJobTemplatesByHierarchyIds);

  fastify.get("/program/:program_id/common-hierarchies", {
    // preHandler: validatePermissions(Actions.READ, [Permissions.JOB_TEMPLATE])
  }, JobTemplateController.getCommonHierarchies);

  fastify.post("/program/:program_id/job-template/advance-filter", {
    // preHandler: validatePermissions(Actions.READ, [Permissions.JOB_TEMPLATE])
  }, JobTemplateController.advanceFilterJobTemplates);

  fastify.post("/upload-file", JobTemplateController.uploadJobTemplateFile);

  fastify.post("/program/:program_id/job-template/bulk-upload", {
    // preHandler: validatePermissions(Actions.CREATE, [Permissions.JOB_TEMPLATE])
  }, JobTemplateController.bulkUploadJobTemplates);

  fastify.post("/program/:program_id/upload-description", JobTemplateController.uploadFile);

  fastify.get("/program/:program_id/list-hierarchies", {
    // preHandler: validatePermissions(Actions.READ, [Permissions.JOB_TEMPLATE])
  }, JobTemplateController.getListHierarchies);

  fastify.get("/program/:program_id/job-templates/list", JobTemplateController.getAllJobTemplate);

};

export default jobTemplate;