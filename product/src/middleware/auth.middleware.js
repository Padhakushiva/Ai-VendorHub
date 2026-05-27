const jwt=require('jsonwebtoken');

function createAuthMiddleware(roles=["user"]){
    return function authMiddleware(req,res,next){
        const token=req.headers?.authorization?.split(" ")[1] || req.cookies?.accessToken || req.cookies?.token;
        if(!token){
            return res.status(401).json({
                message:"Authentication token missing"
            });
        }
        try{
            const decoded=jwt.verify(token,process.env.JWT_SECRET);
            if(!roles.includes(decoded.role)){
                return res.status(403).json({
                    message:"Forbidden: Insufficient permissions"
                });
            }
            req.user=decoded;
            next();
        }catch(err){
            return res.status(401).json({
                message:"Invalid or expired token"
            });
        }

    };

}


module.exports=createAuthMiddleware;
