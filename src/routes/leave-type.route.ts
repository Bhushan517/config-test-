import { FastifyInstance } from "fastify"; 
import{createLeaveType, getLeaveTypes} from "../controllers/leave-type.controller" ; 
import { verifyToken } from "../middlewares/verifyToken";


async function leaveTypeRoutes(fastify: FastifyInstance) {
fastify.addHook('preHandler', verifyToken);
fastify.post('/leave-type',createLeaveType) ;
fastify.get('/leave-types', getLeaveTypes);

}

export default leaveTypeRoutes;