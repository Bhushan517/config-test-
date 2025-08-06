import { FastifyInstance } from 'fastify';
import {
    getCurrencies,
    getCurrenciesById,
    createCurrencies,
    updateCurrencies,
    deleteCurrencies,
    bulkUploadCurrencies
} from '../controllers/currencies.controller';
import { createCurrencySchema } from '../interfaces/currencies.interface';

async function currenciesRoutes(fastify: FastifyInstance) {
    fastify.post('/currencies', {
        schema: {
            body: createCurrencySchema
        }
    }, createCurrencies);
    // fastify.post('/currencies/bulk-upload', bulkUploadCurrencies);
    fastify.get('/currencies/search', getCurrencies);
    fastify.get('/currencies/:id', getCurrenciesById);
    // fastify.put('/currencies/:id', {
    //     schema: {
    //         body: createCurrencySchema
    //     }
    // }, updateCurrencies);
    fastify.delete('/currencies/:id', deleteCurrencies);
}
export default currenciesRoutes