const express=require('express');
const createAuthMiddleware=require('../middleware/auth.middleware');

const router=express.Router();
router.post('/create/:orderId', createAuthMiddleware(['user']));



module.exports=router;