import { FastifyInstance } from "fastify";
import * as PasswordPolicyController from "../controllers/password-policy.controller";
import { validatePermissions } from "../middlewares/vaildate-permissions";
import { Actions, Permissions } from "../constants/permissions";

export default async function (app: FastifyInstance) {
    app.get('/program/:program_id/password-policy', {
        // preHandler: validatePermissions(Actions.READ, [Permissions.SECURITY_SETTING])
    }, PasswordPolicyController.getPasswordPolicy);

    app.get('/program/:program_id/password-policy/:id', {
        // preHandler: validatePermissions(Actions.READ, [Permissions.SECURITY_SETTING])
    }, PasswordPolicyController.getPasswordPolicyById);

    app.post('/password-policy', {
        // preHandler: validatePermissions(Actions.CREATE, [Permissions.SECURITY_SETTING])
    }, PasswordPolicyController.createPasswordPolicy);

    app.put('/password-policy/:id', {
        // preHandler: validatePermissions(Actions.UPDATE, [Permissions.SECURITY_SETTING])
    }, PasswordPolicyController.updatePasswordPolicy);

    app.delete('/program/:program_id/password-policy/:id', PasswordPolicyController.deletePasswordPolicy);
}
