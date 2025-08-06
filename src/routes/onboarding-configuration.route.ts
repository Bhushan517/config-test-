import { FastifyInstance } from 'fastify';
import {
    createOnboardingConfiguration,
    getOnboardingConfiguration,
    getOnboardingConfigurationById,
    updateOnboardingConfiguration,
    deleteOnboardingConfiguration
} from '../controllers/onboarding-configuration.controller';
import { verifyToken } from '../middlewares/verifyToken';

async function OnboardingConfigurationRoutes(fastify: FastifyInstance) {
    fastify.addHook('preHandler', verifyToken);
    fastify.post('/program/:program_id/onboarding-configuration', createOnboardingConfiguration);
    fastify.get('/program/:program_id/onboarding-configuration', getOnboardingConfiguration);
    fastify.get('/program/:program_id/onboarding-configuration/:id', getOnboardingConfigurationById);
    fastify.put('/program/:program_id/onboarding-configuration/:id', updateOnboardingConfiguration);
    fastify.delete('/program/:program_id/onboarding-configuration/:id', deleteOnboardingConfiguration);
}
export default OnboardingConfigurationRoutes;
