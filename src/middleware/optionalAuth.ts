import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = (req.headers["authorization"] || req.headers["Authorization"]) as string | undefined;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      (req as any).user = null;
      return next();
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "");

    if (decoded && typeof decoded === "object") {
      const asAny: any = decoded as any;
      const user = {
        _id: asAny._id || asAny.userId || null,
        role: asAny.role || null,
      };
      (req as any).user = user;
    } else {
      (req as any).user = null;
    }

    return next();
  } catch (err) {
    (req as any).user = null;
    return next();
  }
};

export default optionalAuth;
