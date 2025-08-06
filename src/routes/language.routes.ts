import { FastifyInstance } from 'fastify';
import { searchLanguage, deleteLanguage, updateLanguage, createLanguage, getLanguageById, getLanguages, bulkUploadLanguage } from '../controllers/language.controller';

async function languageRoutes(fastify: FastifyInstance) {
    // fastify.post('/language', createLanguage);
    fastify.get('/language', getLanguages);
    fastify.get('/language/:id', getLanguageById);
    // fastify.put('/language/:id', updateLanguage);
    fastify.delete('/language/:id', deleteLanguage);
    fastify.get('/language/search-languages', searchLanguage);
    fastify.post('/language/bulk-upload', bulkUploadLanguage);
}
export default languageRoutes;
